import mongoose from 'mongoose';

import Medicine from '../models/Medicine.js';
import PurchaseReceiptItem from '../models/PurchaseReceiptItem.js';

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

export const receiptSearch = async ({
  supplierId,
  invoiceNumber,
  medicineId,
  pack,
  batchNo,
  dateFrom,
  dateTo,
  page = 1,
  limit = 20,
}) => {
  const itemMatch = {};

  if (medicineId) {
    itemMatch.medicineId = toObjectId(medicineId);
  }

  if (pack) {
    itemMatch.pack = pack;
  }

  if (batchNo) {
    itemMatch.batchNo = batchNo;
  }

  const receiptExpr = [];

  if (supplierId) {
    receiptExpr.push({ $eq: ['$$receipt.supplierId', toObjectId(supplierId)] });
  }

  if (invoiceNumber) {
    receiptExpr.push({ $eq: ['$$receipt.invoiceNumber', invoiceNumber] });
  }

  if (dateFrom) {
    receiptExpr.push({ $gte: ['$$receipt.invoiceDate', new Date(dateFrom)] });
  }

  if (dateTo) {
    receiptExpr.push({ $lte: ['$$receipt.invoiceDate', new Date(dateTo)] });
  }

  const receiptLookupMatch =
    receiptExpr.length > 0
      ? {
          $expr: {
            $and: [{ $eq: ['$_id', '$$receiptId'] }, ...receiptExpr],
          },
        }
      : {
          $expr: { $eq: ['$_id', '$$receiptId'] },
        };

  const pipeline = [
    { $match: itemMatch },
    {
      $lookup: {
        from: 'purchasereceipts',
        let: { receiptId: '$receiptId' },
        pipeline: [{ $match: receiptLookupMatch }],
        as: 'receipt',
      },
    },
    { $unwind: '$receipt' },
    {
      $lookup: {
        from: 'suppliers',
        localField: 'receipt.supplierId',
        foreignField: '_id',
        pipeline: [{ $project: { _id: 1, name: 1 } }],
        as: 'supplier',
      },
    },
    {
      $lookup: {
        from: 'medicines',
        localField: 'medicineId',
        foreignField: '_id',
        pipeline: [{ $project: { _id: 1, name: 1, strength: 1 } }],
        as: 'medicine',
      },
    },
    {
      $addFields: {
        supplier: { $arrayElemAt: ['$supplier', 0] },
        medicine: { $arrayElemAt: ['$medicine', 0] },
      },
    },
    { $sort: { 'receipt.invoiceDate': -1, _id: -1 } },
    {
      $facet: {
        items: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              supplier: {
                id: { $toString: '$supplier._id' },
                name: '$supplier.name',
              },
              invoice_number: '$receipt.invoiceNumber',
              invoice_date: '$receipt.invoiceDate',
              medicine: {
                id: { $toString: '$medicine._id' },
                name: '$medicine.name',
                strength: { $ifNull: ['$medicine.strength', ''] },
              },
              pack: '$pack',
              batch_no: '$batchNo',
              expiry_date: '$expiryDate',
              purchase_price: '$purchasePrice',
              mrp: '$mrp',
              receipt_id: { $toString: '$receipt._id' },
            },
          },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const [result] = await PurchaseReceiptItem.aggregate(pipeline);

  return {
    page,
    limit,
    total: result?.total?.[0]?.count || 0,
    items:
      (result?.items || []).map((item) => ({
        ...item,
        invoice_date: new Date(item.invoice_date).toISOString(),
        expiry_date: new Date(item.expiry_date).toISOString(),
      })) || [],
  };
};

export const priceHistory = async ({ medicineId, limit = 20 }) => {
  const [medicine, historyRows] = await Promise.all([
    Medicine.findById(medicineId, { _id: 1, name: 1, strength: 1 }).lean(),
    PurchaseReceiptItem.aggregate([
      {
        $match: {
          medicineId: toObjectId(medicineId),
        },
      },
      {
        $lookup: {
          from: 'purchasereceipts',
          localField: 'receiptId',
          foreignField: '_id',
          as: 'receipt',
          pipeline: [{ $project: { _id: 1, invoiceDate: 1, supplierId: 1, invoiceNumber: 1 } }],
        },
      },
      { $unwind: '$receipt' },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'receipt.supplierId',
          foreignField: '_id',
          as: 'supplier',
          pipeline: [{ $project: { _id: 1, name: 1 } }],
        },
      },
      {
        $addFields: {
          supplier: { $arrayElemAt: ['$supplier', 0] },
        },
      },
      { $sort: { 'receipt.invoiceDate': -1, _id: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          invoice_date: '$receipt.invoiceDate',
          purchase_price: '$purchasePrice',
          mrp: '$mrp',
          supplier: '$supplier.name',
          invoice_number: '$receipt.invoiceNumber',
        },
      },
    ]),
  ]);

  const history = historyRows.map((row) => ({
    ...row,
    invoice_date: new Date(row.invoice_date).toISOString(),
  }));

  const latest = history[0] || null;

  return {
    medicine: medicine
      ? {
          id: medicine._id.toString(),
          name: medicine.name,
          strength: medicine.strength || '',
        }
      : {
          id: medicineId,
          name: '',
          strength: '',
        },
    latest,
    history,
  };
};
