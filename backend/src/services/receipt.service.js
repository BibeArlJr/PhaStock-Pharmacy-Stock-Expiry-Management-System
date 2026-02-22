import mongoose from 'mongoose';

import BatchStock from '../models/BatchStock.js';
import PurchaseReceipt from '../models/PurchaseReceipt.js';
import PurchaseReceiptItem from '../models/PurchaseReceiptItem.js';
import ApiError from '../utils/ApiError.js';

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
    });
  }

  return Array.from(grouped.values());
};

export const createReceipt = async ({ header, items, userId }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const [receipt] = await PurchaseReceipt.create(
      [
        {
          supplierId: header.supplierId,
          invoiceNumber: header.invoiceNumber,
          invoiceDate: header.invoiceDate,
          paymentMode: header.paymentMode,
          receiptType: header.receiptType,
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

    await PurchaseReceiptItem.insertMany(receiptItems, {
      session,
      ordered: true,
    });

    const groupedItems = aggregateBatchOps(receiptItems);

    await BatchStock.bulkWrite(
      groupedItems.map((item) => ({
        updateOne: {
          filter: {
            medicineId: item.medicineId,
            pack: item.pack,
            batchNo: item.batchNo,
            expiryDate: item.expiryDate,
          },
          update: {
            $setOnInsert: {
              medicineId: item.medicineId,
              pack: item.pack,
              batchNo: item.batchNo,
              expiryDate: item.expiryDate,
            },
            $inc: {
              availableBoxes: item.quantityBoxes,
            },
            $set: {
              purchasePrice: item.purchasePrice,
              mrp: item.mrp,
            },
          },
          upsert: true,
        },
      })),
      { session }
    );

    const batchDocs = await BatchStock.find(
      {
        $or: groupedItems.map((item) => ({
          medicineId: item.medicineId,
          pack: item.pack,
          batchNo: item.batchNo,
          expiryDate: item.expiryDate,
        })),
      },
      {
        _id: 1,
        medicineId: 1,
        pack: 1,
        batchNo: 1,
        expiryDate: 1,
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

export const listReceipts = async ({
  supplierId,
  invoiceNumber,
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

  const [result] = await PurchaseReceipt.aggregate([
    { $match: match },
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
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              as: 'createdByUser',
              pipeline: [{ $project: { _id: 1, fullName: 1 } }],
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
              createdByUser: { $arrayElemAt: ['$createdByUser', 0] },
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

export const getReceiptDetail = async (id) => {
  const receiptObjectId = new mongoose.Types.ObjectId(id);

  const [header] = await PurchaseReceipt.aggregate([
    { $match: { _id: receiptObjectId } },
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
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'createdByUser',
        pipeline: [{ $project: { _id: 1, fullName: 1 } }],
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
        createdByUser: { $arrayElemAt: ['$createdByUser', 0] },
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
