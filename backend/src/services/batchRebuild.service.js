const mongoose = require('mongoose');const BatchStock = require('../models/BatchStock.js');
const PurchaseReceiptItem = require('../models/PurchaseReceiptItem.js');
const StockIssue = require('../models/StockIssue.js');
const ApiError = require('../utils/ApiError.js');
const buildBatchKey = ({ medicineId, pack, batchNo, expiryDate }) =>
  [
    medicineId.toString(),
    pack,
    batchNo,
    new Date(expiryDate).toISOString(),
  ].join('|');

const aggregateReceiptBatches = async ({ pharmacyObjectId, session }) =>
  PurchaseReceiptItem.aggregate([
    {
      $lookup: {
        from: 'purchasereceipts',
        localField: 'receiptId',
        foreignField: '_id',
        as: 'receipt',
        pipeline: [{ $project: { _id: 1, createdBy: 1, invoiceDate: 1 } }],
      },
    },
    {
      $unwind: {
        path: '$receipt',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'receipt.createdBy',
        foreignField: '_id',
        as: 'creator',
        pipeline: [{ $project: { _id: 1, pharmacyId: 1 } }],
      },
    },
    {
      $unwind: {
        path: '$creator',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $match: {
        'creator.pharmacyId': pharmacyObjectId,
      },
    },
    {
      $sort: {
        'receipt.invoiceDate': -1,
        createdAt: -1,
        _id: -1,
      },
    },
    {
      $group: {
        _id: {
          medicineId: '$medicineId',
          pack: '$pack',
          batchNo: '$batchNo',
          expiryDate: '$expiryDate',
        },
        availableBoxes: { $sum: '$quantityBoxes' },
        purchasePrice: { $first: '$purchasePrice' },
        mrp: { $first: '$mrp' },
        sourceReceiptItemId: { $first: '$_id' },
        lastReceiptId: { $first: '$receipt._id' },
      },
    },
  ]).session(session);

const getIssueDeductionsByBatchKey = async ({ oldBatches, pharmacyObjectId, session }) => {
  const oldBatchById = new Map(
    oldBatches.map((row) => [row._id.toString(), row])
  );

  const issues = await StockIssue.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'creator',
        pipeline: [{ $project: { _id: 1, pharmacyId: 1 } }],
      },
    },
    {
      $unwind: {
        path: '$creator',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $match: {
        'creator.pharmacyId': pharmacyObjectId,
      },
    },
    {
      $project: {
        _id: 1,
        batchStockId: 1,
        issuedBoxes: 1,
      },
    },
  ]).session(session);

  const deductionsByKey = new Map();
  const skippedIssues = [];

  for (const issue of issues) {
    const oldBatch = oldBatchById.get(issue.batchStockId?.toString?.());

    if (!oldBatch) {
      skippedIssues.push(issue._id.toString());
      continue;
    }

    const sourceType = oldBatch.sourceType || (oldBatch.source === 'manual' ? 'manual' : 'receipt');
    if (sourceType === 'manual') {
      continue;
    }

    const key = buildBatchKey(oldBatch);
    const current = deductionsByKey.get(key) || 0;
    deductionsByKey.set(key, current + Number(issue.issuedBoxes || 0));
  }

  return { deductionsByKey, skippedIssues };
};

const buildNextBatchDocs = ({ groupedRows, pharmacyObjectId, deductionsByKey }) => {
  const nextDocs = [];
  const negativeKeys = [];

  for (const row of groupedRows) {
    const identity = {
      medicineId: row._id.medicineId,
      pack: row._id.pack,
      batchNo: row._id.batchNo,
      expiryDate: row._id.expiryDate,
    };

    const key = buildBatchKey(identity);
    const issued = deductionsByKey.get(key) || 0;
    const nextAvailable = Number(row.availableBoxes || 0) - issued;

    if (nextAvailable < 0) {
      negativeKeys.push({
        medicineId: identity.medicineId.toString(),
        pack: identity.pack,
        batchNo: identity.batchNo,
        expiryDate: new Date(identity.expiryDate).toISOString(),
        availableAfterRebuild: nextAvailable,
      });
      continue;
    }

    nextDocs.push({
      pharmacyId: pharmacyObjectId,
      medicineId: identity.medicineId,
      pack: identity.pack,
      batchNo: identity.batchNo,
      expiryDate: identity.expiryDate,
      availableBoxes: nextAvailable,
      purchasePrice: Number(row.purchasePrice || 0),
      mrp: Number(row.mrp || 0),
      source: 'receipt',
      sourceType: 'receipt',
      sourceReceiptId: row.lastReceiptId || null,
      sourceReceiptItemId: row.sourceReceiptItemId || null,
      lastReceiptId: row.lastReceiptId || null,
    });
  }

  return { nextDocs, negativeKeys };
};
const rebuildBatchStockForPharmacy = async ({ pharmacyId, session: externalSession } = {}) => {
  if (!pharmacyId) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'pharmacyId is required for rebuild');
  }

  const ownsSession = !externalSession;
  const session = externalSession || (await mongoose.startSession());

  if (ownsSession) {
    session.startTransaction();
  }

  try {
    const pharmacyObjectId = new mongoose.Types.ObjectId(pharmacyId);

    const oldBatches = await BatchStock.find(
      { pharmacyId: pharmacyObjectId },
      {
        _id: 1,
        pharmacyId: 1,
        medicineId: 1,
        pack: 1,
        batchNo: 1,
        expiryDate: 1,
        availableBoxes: 1,
        purchasePrice: 1,
        mrp: 1,
        createdBy: 1,
        source: 1,
        sourceType: 1,
      }
    )
      .session(session)
      .lean();

    const manualDocs = oldBatches
      .filter((row) => (row.sourceType || (row.source === 'manual' ? 'manual' : 'receipt')) === 'manual')
      .map((row) => ({
        pharmacyId: row.pharmacyId,
        medicineId: row.medicineId,
        pack: row.pack,
        batchNo: row.batchNo,
        expiryDate: row.expiryDate,
        availableBoxes: row.availableBoxes,
        purchasePrice: row.purchasePrice,
        mrp: row.mrp,
        source: 'manual',
        sourceType: 'manual',
        createdBy: row.createdBy || undefined,
      }));

    const groupedRows = await aggregateReceiptBatches({
      pharmacyObjectId,
      session,
    });

    const { deductionsByKey, skippedIssues } = await getIssueDeductionsByBatchKey({
      oldBatches,
      pharmacyObjectId,
      session,
    });

    const { nextDocs, negativeKeys } = buildNextBatchDocs({
      groupedRows,
      pharmacyObjectId,
      deductionsByKey,
    });

    if (negativeKeys.length > 0) {
      throw new ApiError(
        400,
        'NEGATIVE_STOCK_AFTER_REBUILD',
        'Operation would result in negative batch stock',
        { batches: negativeKeys }
      );
    }

    await BatchStock.deleteMany({ pharmacyId: pharmacyObjectId }).session(session);

    const docsToInsert = [...manualDocs, ...nextDocs];

    if (docsToInsert.length > 0) {
      await BatchStock.insertMany(docsToInsert, { session, ordered: true });
    }

    if (ownsSession) {
      await session.commitTransaction();
    }

    return {
      rebuilt_count: nextDocs.length,
      preserved_manual_count: manualDocs.length,
      skipped_issue_count: skippedIssues.length,
      skipped_issue_ids: skippedIssues,
    };
  } catch (error) {
    if (ownsSession) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (ownsSession) {
      session.endSession();
    }
  }
};

module.exports = { rebuildBatchStockForPharmacy };
