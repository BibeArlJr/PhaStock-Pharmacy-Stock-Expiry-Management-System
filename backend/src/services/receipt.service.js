const mongoose = require('mongoose');const BatchStock = require('../models/BatchStock.js');
const PurchaseReceipt = require('../models/PurchaseReceipt.js');
const PurchaseReceiptItem = require('../models/PurchaseReceiptItem.js');
const StockIssue = require('../models/StockIssue.js');
const User = require('../models/User.js');
const ApiError = require('../utils/ApiError.js');
const { rebuildBatchStockForPharmacy } = require('./batchRebuild.service.js');
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildBatchKey = (item) =>
  [
    item.medicineId.toString(),
    item.pack,
    item.batchNo,
    new Date(item.expiryDate).toISOString(),
  ].join('|');

const aggregateBatchOps = (items) => {
  const grouped = new Map();

  for (const item of items) {
    const key = buildBatchKey(item);
    const existing = grouped.get(key);

    if (existing) {
      existing.quantityBoxes += item.quantityBoxes;
      existing.purchasePrice = item.purchasePrice;
      existing.mrp = item.mrp;
      existing.sourceReceiptItemId = item._id;
      continue;
    }

    grouped.set(key, {
      medicineId: item.medicineId,
      pack: item.pack,
      batchNo: item.batchNo,
      expiryDate: new Date(item.expiryDate),
      quantityBoxes: item.quantityBoxes,
      purchasePrice: item.purchasePrice,
      mrp: item.mrp,
      sourceReceiptItemId: item._id,
    });
  }

  return Array.from(grouped.values());
};

const computeTotals = ({ items, discountAmount = 0 }) => {
  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item.quantityBoxes) * Number(item.purchasePrice),
    0
  );

  const safeDiscountAmount = Number(discountAmount ?? 0);

  if (safeDiscountAmount < 0) {
    throw new ApiError(400, 'INVALID_DISCOUNT', 'Discount amount must be 0 or more');
  }

  if (safeDiscountAmount > totalAmount) {
    throw new ApiError(400, 'INVALID_DISCOUNT', 'Discount amount cannot exceed total amount');
  }

  return {
    totalAmount,
    discountAmount: safeDiscountAmount,
    netAmount: totalAmount - safeDiscountAmount,
  };
};

const assertReceiptBelongsToPharmacy = async ({ receiptId, pharmacyId, session }) => {
  const receipt = await PurchaseReceipt.findById(receiptId)
    .session(session)
    .select('_id createdBy supplierId invoiceNumber invoiceDate paymentMode receiptType totalAmount discountAmount netAmount createdAt');

  if (!receipt) {
    throw new ApiError(404, 'NOT_FOUND', 'Purchase receipt not found');
  }

  const creator = await User.findById(receipt.createdBy)
    .session(session)
    .select('_id pharmacyId')
    .lean();

  if (!creator || creator.pharmacyId?.toString?.() !== pharmacyId) {
    throw new ApiError(404, 'NOT_FOUND', 'Purchase receipt not found');
  }

  return receipt;
};

const hasIssueForReceipt = async ({ receiptId, pharmacyId, session }) => {
  const receiptItems = await PurchaseReceiptItem.find(
    { receiptId },
    { medicineId: 1, pack: 1, batchNo: 1, expiryDate: 1 }
  )
    .session(session)
    .lean();

  if (receiptItems.length === 0) {
    return false;
  }

  const relatedBatches = await BatchStock.find(
    {
      pharmacyId: new mongoose.Types.ObjectId(pharmacyId),
      $or: receiptItems.map((item) => ({
        medicineId: item.medicineId,
        pack: item.pack,
        batchNo: item.batchNo,
        expiryDate: item.expiryDate,
      })),
    },
    { _id: 1 }
  )
    .session(session)
    .lean();

  if (relatedBatches.length === 0) {
    return false;
  }

  const hasIssue = await StockIssue.exists({
    batchStockId: { $in: relatedBatches.map((row) => row._id) },
  }).session(session);

  return Boolean(hasIssue);
};
const createReceipt = async ({ header, items, userId, pharmacyId }) => {
  const session = await mongoose.startSession();
  const pharmacyObjectId = pharmacyId ? new mongoose.Types.ObjectId(pharmacyId) : undefined;

  try {
    session.startTransaction();

    const totals = computeTotals({
      items,
      discountAmount: header.discountAmount,
    });

    const [receipt] = await PurchaseReceipt.create(
      [
        {
          supplierId: header.supplierId,
          invoiceNumber: header.invoiceNumber,
          invoiceDate: header.invoiceDate,
          paymentMode: header.paymentMode,
          receiptType: header.receiptType,
          totalAmount: totals.totalAmount,
          discountAmount: totals.discountAmount,
          netAmount: totals.netAmount,
          createdBy: userId,
        },
      ],
      { session }
    );

    const receiptItems = items.map((item) => ({
      receiptId: receipt._id,
      medicineId: item.medicineId,
      pack: item.pack,
      batchNo: item.batchNo,
      expiryDate: item.expiryDate,
      quantityBoxes: item.quantityBoxes,
      purchasePrice: item.purchasePrice,
      mrp: item.mrp,
    }));

    const insertedReceiptItems = await PurchaseReceiptItem.insertMany(receiptItems, {
      session,
      ordered: true,
    });

    const groupedItems = aggregateBatchOps(insertedReceiptItems);

    const batchBulkOps = groupedItems.map((item) => ({
      updateOne: {
        filter: {
          ...(pharmacyObjectId ? { pharmacyId: pharmacyObjectId } : {}),
          medicineId: item.medicineId,
          pack: item.pack,
          batchNo: item.batchNo,
          expiryDate: item.expiryDate,
        },
        update: {
          $setOnInsert: {
            ...(pharmacyObjectId ? { pharmacyId: pharmacyObjectId } : {}),
            medicineId: item.medicineId,
            pack: item.pack,
            batchNo: item.batchNo,
            expiryDate: item.expiryDate,
            createdBy: userId,
          },
          $inc: {
            availableBoxes: item.quantityBoxes,
          },
          $set: {
            purchasePrice: item.purchasePrice,
            mrp: item.mrp,
            source: 'receipt',
            sourceType: 'receipt',
            sourceReceiptId: receipt._id,
            sourceReceiptItemId: item.sourceReceiptItemId || null,
            lastReceiptId: receipt._id,
          },
        },
        upsert: true,
      },
    }));

    if (process.env.DEBUG_BATCH_BULK_OPS === '1' && batchBulkOps[0]) {
      console.log('[receipt.createReceipt] sample BatchStock bulk op:', JSON.stringify(batchBulkOps[0]));
    }

    await BatchStock.bulkWrite(
      batchBulkOps,
      { session }
    );

    const batchDocs = await BatchStock.find(
      {
        $or: groupedItems.map((item) => ({
          ...(pharmacyObjectId ? { pharmacyId: pharmacyObjectId } : {}),
          medicineId: item.medicineId,
          pack: item.pack,
          batchNo: item.batchNo,
          expiryDate: item.expiryDate,
        })),
      },
      {
        _id: 1,
        availableBoxes: 1,
      }
    )
      .session(session)
      .lean();

    await session.commitTransaction();

    return {
      receiptId: receipt._id.toString(),
      batchUpdates: batchDocs.map((doc) => ({
        batch_stock_id: doc._id.toString(),
        available_boxes: doc.availableBoxes,
      })),
    };
  } catch (error) {
    await session.abortTransaction();

    if (error?.code === 11000) {
      throw new ApiError(
        409,
        'DUPLICATE_INVOICE',
        'Invoice number already exists for this supplier'
      );
    }

    throw error;
  } finally {
    session.endSession();
  }
};
const updateReceipt = async ({ id, header, items, pharmacyId }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const receipt = await assertReceiptBelongsToPharmacy({
      receiptId: id,
      pharmacyId,
      session,
    });

    const duplicate = await PurchaseReceipt.findOne({
      _id: { $ne: receipt._id },
      supplierId: header.supplierId,
      invoiceNumber: header.invoiceNumber,
    })
      .session(session)
      .select('_id')
      .lean();

    if (duplicate) {
      throw new ApiError(409, 'DUPLICATE_INVOICE', 'Invoice number already exists for this supplier');
    }

    const totals = computeTotals({ items, discountAmount: header.discountAmount });

    await PurchaseReceipt.updateOne(
      { _id: receipt._id },
      {
        $set: {
          supplierId: header.supplierId,
          invoiceNumber: header.invoiceNumber,
          invoiceDate: header.invoiceDate,
          paymentMode: header.paymentMode,
          receiptType: header.receiptType,
          totalAmount: totals.totalAmount,
          discountAmount: totals.discountAmount,
          netAmount: totals.netAmount,
        },
      },
      { session }
    );

    await PurchaseReceiptItem.deleteMany({ receiptId: receipt._id }).session(session);

    const receiptItems = items.map((item) => ({
      receiptId: receipt._id,
      medicineId: item.medicineId,
      pack: item.pack,
      batchNo: item.batchNo,
      expiryDate: item.expiryDate,
      quantityBoxes: item.quantityBoxes,
      purchasePrice: item.purchasePrice,
      mrp: item.mrp,
    }));

    await PurchaseReceiptItem.insertMany(receiptItems, { session, ordered: true });

    await rebuildBatchStockForPharmacy({ pharmacyId, session });

    await session.commitTransaction();

    return {
      receiptId: receipt._id.toString(),
    };
  } catch (error) {
    await session.abortTransaction();

    if (error?.code === 11000) {
      throw new ApiError(409, 'DUPLICATE_INVOICE', 'Invoice number already exists for this supplier');
    }

    throw error;
  } finally {
    session.endSession();
  }
};
const deleteReceipt = async ({ id, pharmacyId }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const receipt = await assertReceiptBelongsToPharmacy({
      receiptId: id,
      pharmacyId,
      session,
    });

    const hasIssue = await hasIssueForReceipt({
      receiptId: receipt._id,
      pharmacyId,
      session,
    });

    if (hasIssue) {
      throw new ApiError(
        409,
        'BATCH_HAS_STOCK_ISSUES',
        'Cannot delete this batch because stock has already been issued from it.'
      );
    }

    await PurchaseReceiptItem.deleteMany({ receiptId: receipt._id }).session(session);
    await PurchaseReceipt.deleteOne({ _id: receipt._id }).session(session);

    await rebuildBatchStockForPharmacy({ pharmacyId, session });

    await session.commitTransaction();

    return {
      receiptId: receipt._id.toString(),
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
const deleteReceiptsBulk = async ({ ids, pharmacyId }) => {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];

  if (uniqueIds.length === 0) {
    return {
      deletedCount: 0,
      deletedIds: [],
    };
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const requestedIds = uniqueIds.map((id) => new mongoose.Types.ObjectId(id));
    const receipts = await PurchaseReceipt.find(
      { _id: { $in: requestedIds } },
      { _id: 1, createdBy: 1 }
    )
      .session(session)
      .lean();

    if (receipts.length === 0) {
      throw new ApiError(404, 'NOT_FOUND', 'No receipts found for deletion');
    }

    const creators = await User.find(
      { _id: { $in: [...new Set(receipts.map((row) => row.createdBy.toString()))] } },
      { _id: 1, pharmacyId: 1 }
    )
      .session(session)
      .lean();

    const creatorMap = new Map(
      creators.map((creator) => [creator._id.toString(), creator.pharmacyId?.toString?.() || ''])
    );

    const scopedReceipts = receipts.filter(
      (receipt) => creatorMap.get(receipt.createdBy.toString()) === pharmacyId
    );

    if (scopedReceipts.length === 0) {
      throw new ApiError(404, 'NOT_FOUND', 'No receipts found for deletion');
    }

    for (const receipt of scopedReceipts) {
      const hasIssue = await hasIssueForReceipt({
        receiptId: receipt._id,
        pharmacyId,
        session,
      });

      if (hasIssue) {
        throw new ApiError(
          409,
          'BATCH_HAS_STOCK_ISSUES',
          'Cannot delete this batch because stock has already been issued from it.'
        );
      }
    }

    const scopedIds = scopedReceipts.map((row) => row._id);

    await PurchaseReceiptItem.deleteMany({ receiptId: { $in: scopedIds } }).session(session);
    await PurchaseReceipt.deleteMany({ _id: { $in: scopedIds } }).session(session);

    await rebuildBatchStockForPharmacy({ pharmacyId, session });

    await session.commitTransaction();

    return {
      deletedCount: scopedIds.length,
      deletedIds: scopedIds.map((id) => id.toString()),
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
const listReceipts = async ({
  pharmacyId,
  supplierId,
  invoiceNumber,
  q,
  batchNo,
  dateFrom,
  dateTo,
  page = 1,
  limit = 20,
}) => {
  const match = {};

  if (supplierId) {
    match.supplierId = new mongoose.Types.ObjectId(supplierId);
  }

  if (invoiceNumber) {
    match.invoiceNumber = {
      $regex: escapeRegex(invoiceNumber),
      $options: 'i',
    };
  }

  if (batchNo) {
    const matchingReceiptIds = await PurchaseReceiptItem.find({
      batchNo: { $regex: escapeRegex(batchNo), $options: 'i' },
    }).distinct('receiptId');

    match._id = {
      $in: (matchingReceiptIds || []).map((id) => new mongoose.Types.ObjectId(id)),
    };
  }

  if (dateFrom || dateTo) {
    match.invoiceDate = {};

    if (dateFrom) {
      match.invoiceDate.$gte = new Date(dateFrom);
    }

    if (dateTo) {
      match.invoiceDate.$lte = new Date(dateTo);
    }
  }

  const skip = (page - 1) * limit;

  const qRegex = q ? new RegExp(escapeRegex(q), 'i') : null;

  const [result] = await PurchaseReceipt.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'createdByUser',
        pipeline: [{ $project: { _id: 1, fullName: 1, pharmacyId: 1 } }],
      },
    },
    {
      $addFields: {
        createdByUser: { $arrayElemAt: ['$createdByUser', 0] },
      },
    },
    {
      $match: {
        ...(pharmacyId
          ? { 'createdByUser.pharmacyId': new mongoose.Types.ObjectId(pharmacyId) }
          : {}),
      },
    },
    ...(qRegex
      ? [
          {
            $lookup: {
              from: 'suppliers',
              localField: 'supplierId',
              foreignField: '_id',
              as: 'supplierForSearch',
              pipeline: [{ $project: { _id: 1, name: 1 } }],
            },
          },
          {
            $addFields: {
              supplierForSearch: { $arrayElemAt: ['$supplierForSearch', 0] },
            },
          },
          {
            $match: {
              $or: [
                { invoiceNumber: { $regex: qRegex } },
                { 'supplierForSearch.name': { $regex: qRegex } },
              ],
            },
          },
        ]
      : []),
    { $sort: { invoiceDate: -1, _id: -1 } },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'suppliers',
              localField: 'supplierId',
              foreignField: '_id',
              as: 'supplier',
              pipeline: [{ $project: { _id: 1, name: 1 } }],
            },
          },
          {
            $lookup: {
              from: 'purchasereceiptitems',
              let: { rid: '$_id' },
              pipeline: [
                { $match: { $expr: { $eq: ['$receiptId', '$$rid'] } } },
                { $count: 'count' },
              ],
              as: 'itemStats',
            },
          },
          {
            $project: {
              _id: 1,
              invoiceNumber: 1,
              invoiceDate: 1,
              paymentMode: 1,
              receiptType: 1,
              createdAt: 1,
              supplier: { $arrayElemAt: ['$supplier', 0] },
              createdByUser: {
                _id: '$createdByUser._id',
                fullName: '$createdByUser.fullName',
              },
              itemCount: {
                $ifNull: [{ $arrayElemAt: ['$itemStats.count', 0] }, 0],
              },
            },
          },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  return {
    items: result?.items || [],
    total: result?.total?.[0]?.count || 0,
    page,
    limit,
  };
};
const getReceiptDetail = async (id, pharmacyId) => {
  const receiptObjectId = new mongoose.Types.ObjectId(id);

  const [header] = await PurchaseReceipt.aggregate([
    { $match: { _id: receiptObjectId } },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'createdByUser',
        pipeline: [{ $project: { _id: 1, fullName: 1, pharmacyId: 1 } }],
      },
    },
    {
      $addFields: {
        createdByUser: { $arrayElemAt: ['$createdByUser', 0] },
      },
    },
    {
      $match: {
        ...(pharmacyId
          ? { 'createdByUser.pharmacyId': new mongoose.Types.ObjectId(pharmacyId) }
          : {}),
      },
    },
    {
      $lookup: {
        from: 'suppliers',
        localField: 'supplierId',
        foreignField: '_id',
        as: 'supplier',
        pipeline: [{ $project: { _id: 1, name: 1, phone: 1, address: 1 } }],
      },
    },
    {
      $project: {
        _id: 1,
        invoiceNumber: 1,
        invoiceDate: 1,
        paymentMode: 1,
        receiptType: 1,
        totalAmount: 1,
        discountAmount: 1,
        netAmount: 1,
        createdAt: 1,
        supplier: { $arrayElemAt: ['$supplier', 0] },
        createdByUser: {
          _id: '$createdByUser._id',
          fullName: '$createdByUser.fullName',
        },
      },
    },
  ]);

  if (!header) {
    return null;
  }

  const items = await PurchaseReceiptItem.aggregate([
    { $match: { receiptId: receiptObjectId } },
    { $sort: { createdAt: 1, _id: 1 } },
    {
      $lookup: {
        from: 'medicines',
        localField: 'medicineId',
        foreignField: '_id',
        as: 'medicine',
        pipeline: [{ $project: { _id: 1, name: 1, strength: 1 } }],
      },
    },
    {
      $project: {
        _id: 1,
        medicineId: 1,
        pack: 1,
        batchNo: 1,
        expiryDate: 1,
        quantityBoxes: 1,
        purchasePrice: 1,
        mrp: 1,
        medicine: { $arrayElemAt: ['$medicine', 0] },
      },
    },
  ]);

  return {
    header,
    items,
  };
};

module.exports = { createReceipt, updateReceipt, deleteReceipt, deleteReceiptsBulk, listReceipts, getReceiptDetail };
