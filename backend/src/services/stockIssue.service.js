import mongoose from 'mongoose';

import BatchStock from '../models/BatchStock.js';
import PurchaseReceiptItem from '../models/PurchaseReceiptItem.js';
import StockIssue from '../models/StockIssue.js';
import ApiError from '../utils/ApiError.js';

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

const endOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
};

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const FEFO_PROJECTION = {
  _id: 1,
  batchNo: 1,
  pack: 1,
  expiryDate: 1,
  availableBoxes: 1,
};

export const fefoSuggest = async ({ medicineId }) => {
  const todayEnd = endOfToday();

  const rows = await BatchStock.find(
    {
      medicineId,
      expiryDate: { $gt: todayEnd },
      availableBoxes: { $gt: 0 },
    },
    FEFO_PROJECTION
  )
    .sort({ expiryDate: 1, batchNo: 1, _id: 1 })
    .limit(20)
    .lean();

  const alternatives = rows.map((row) => ({
    batch_stock_id: row._id.toString(),
    batch_no: row.batchNo,
    pack: row.pack,
    expiry_date: row.expiryDate.toISOString(),
    available_boxes: row.availableBoxes,
  }));

  return {
    suggested: alternatives[0] || null,
    alternatives,
  };
};

const findFirstReceiptDateForBatchIdentity = async ({
  medicineId,
  pack,
  batchNo,
  expiryDate,
  session,
}) => {
  const [result] = await PurchaseReceiptItem.aggregate([
    {
      $match: {
        medicineId: new mongoose.Types.ObjectId(medicineId),
        pack,
        batchNo,
        expiryDate,
      },
    },
    {
      $lookup: {
        from: 'purchasereceipts',
        localField: 'receiptId',
        foreignField: '_id',
        as: 'receipt',
        pipeline: [{ $project: { _id: 1, invoiceDate: 1 } }],
      },
    },
    {
      $project: {
        invoiceDate: { $arrayElemAt: ['$receipt.invoiceDate', 0] },
      },
    },
    { $match: { invoiceDate: { $ne: null } } },
    { $sort: { invoiceDate: 1 } },
    { $limit: 1 },
  ]).session(session);

  return result?.invoiceDate || null;
};

export const createStockIssue = async ({ batchStockId, issuedBoxes, issuedDate, remark, userId }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const batch = await BatchStock.findById(batchStockId)
      .session(session)
      .select('_id medicineId pack batchNo expiryDate availableBoxes');

    if (!batch) {
      throw new ApiError(404, 'NOT_FOUND', 'Batch stock not found');
    }

    const todayEnd = endOfToday();

    if (batch.expiryDate <= todayEnd) {
      throw new ApiError(400, 'BATCH_EXPIRED', 'Cannot issue from an expired batch');
    }

    if (issuedBoxes > batch.availableBoxes) {
      throw new ApiError(400, 'INSUFFICIENT_STOCK', 'Issued boxes exceed available stock');
    }

    const firstReceiptDate = await findFirstReceiptDateForBatchIdentity({
      medicineId: batch.medicineId,
      pack: batch.pack,
      batchNo: batch.batchNo,
      expiryDate: batch.expiryDate,
      session,
    });

    if (firstReceiptDate && startOfDay(issuedDate) < startOfDay(firstReceiptDate)) {
      throw new ApiError(
        400,
        'INVALID_ISSUE_DATE',
        'Issued date cannot be before the first receipt date for this batch'
      );
    }

    const updatedBatch = await BatchStock.findOneAndUpdate(
      {
        _id: batch._id,
        availableBoxes: { $gte: issuedBoxes },
      },
      {
        $inc: { availableBoxes: -issuedBoxes },
      },
      {
        new: true,
        session,
      }
    ).select('_id availableBoxes');

    if (!updatedBatch) {
      throw new ApiError(400, 'INSUFFICIENT_STOCK', 'Issued boxes exceed available stock');
    }

    const [stockIssue] = await StockIssue.create(
      [
        {
          batchStockId: batch._id,
          issuedBoxes,
          issuedDate,
          remark: remark || '',
          createdBy: userId,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return {
      stock_issue_id: stockIssue._id.toString(),
      batch_stock_id: updatedBatch._id.toString(),
      remaining_boxes: updatedBatch.availableBoxes,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const listStockIssues = async ({
  medicineId,
  batchStockId,
  dateFrom,
  dateTo,
  page = 1,
  limit = 20,
}) => {
  const match = {};

  if (batchStockId) {
    match.batchStockId = new mongoose.Types.ObjectId(batchStockId);
  }

  if (dateFrom || dateTo) {
    match.issuedDate = {};

    if (dateFrom) {
      match.issuedDate.$gte = new Date(dateFrom);
    }

    if (dateTo) {
      match.issuedDate.$lte = new Date(dateTo);
    }
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'batchstocks',
        localField: 'batchStockId',
        foreignField: '_id',
        as: 'batch',
        pipeline: [
          {
            $project: {
              _id: 1,
              medicineId: 1,
              batchNo: 1,
              pack: 1,
              expiryDate: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        batch: { $arrayElemAt: ['$batch', 0] },
      },
    },
    {
      $match: {
        batch: { $ne: null },
      },
    },
  ];

  if (medicineId) {
    pipeline.push({
      $match: {
        'batch.medicineId': new mongoose.Types.ObjectId(medicineId),
      },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: 'medicines',
        localField: 'batch.medicineId',
        foreignField: '_id',
        as: 'medicine',
        pipeline: [{ $project: { _id: 1, name: 1, strength: 1 } }],
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'createdByUser',
        pipeline: [{ $project: { _id: 1, fullName: 1 } }],
      },
    },
    {
      $addFields: {
        medicine: { $arrayElemAt: ['$medicine', 0] },
        createdByUser: { $arrayElemAt: ['$createdByUser', 0] },
      },
    },
    { $sort: { issuedDate: -1, _id: -1 } },
    {
      $facet: {
        items: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              issuedDate: 1,
              issuedBoxes: 1,
              remark: 1,
              createdAt: 1,
              createdByUser: 1,
              batch: 1,
              medicine: 1,
            },
          },
        ],
        total: [{ $count: 'count' }],
      },
    }
  );

  const [result] = await StockIssue.aggregate(pipeline);

  return {
    page,
    limit,
    total: result?.total?.[0]?.count || 0,
    items: result?.items || [],
  };
};
