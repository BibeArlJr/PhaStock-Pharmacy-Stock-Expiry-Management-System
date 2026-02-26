import mongoose from 'mongoose';

import BatchStock from '../models/BatchStock.js';
import PurchaseReceipt from '../models/PurchaseReceipt.js';
import PurchaseReceiptItem from '../models/PurchaseReceiptItem.js';
import StockIssue from '../models/StockIssue.js';
import ApiError from '../utils/ApiError.js';
import { rebuildBatchStockForPharmacy } from './batchRebuild.service.js';
import { getSettings } from './settings.service.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

const endOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const addDaysEndOfDay = (date, days) =>
  endOfDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));

const buildFlags = (batch, { expiryAlertDays, lowStockLimit }, todayStart) => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((batch.expiryDate.getTime() - todayStart.getTime()) / msPerDay);

  return {
    expired: daysLeft <= 0,
    expiring_soon: daysLeft > 0 && daysLeft <= expiryAlertDays,
    low_stock: batch.availableBoxes > 0 && batch.availableBoxes <= lowStockLimit,
    out_of_stock: batch.availableBoxes <= 0,
  };
};

const resolveSettings = async (pharmacyId) => {
  try {
    if (pharmacyId) {
      const settings = await getSettings(pharmacyId);
      return {
        lowStockLimit: settings?.lowStockLimitBoxes ?? 2,
        expiryAlertDays: settings?.expiryAlertDays ?? 30,
      };
    }
  } catch {
    return {
      lowStockLimit: 2,
      expiryAlertDays: 30,
    };
  }

  return {
    lowStockLimit: 2,
    expiryAlertDays: 30,
  };
};

const buildScopeFilter = (pharmacyId) => {
  const hasPharmacyField = Boolean(BatchStock.schema.path('pharmacyId'));

  if (hasPharmacyField && pharmacyId) {
    return { pharmacyId: new mongoose.Types.ObjectId(pharmacyId) };
  }

  return {};
};

const normalizeSourceType = (row) => {
  if (row.sourceType) {
    return String(row.sourceType).toLowerCase();
  }

  if (row.source === 'manual') {
    return 'manual';
  }

  return 'receipt';
};

const mapCreatedBy = (createdBy) => {
  if (!createdBy) {
    return null;
  }

  if (typeof createdBy === 'object' && createdBy._id) {
    return {
      id: createdBy._id.toString(),
      full_name: createdBy.fullName || createdBy.username || '',
      username: createdBy.username || '',
    };
  }

  if (mongoose.Types.ObjectId.isValid(createdBy)) {
    return {
      id: createdBy.toString(),
      full_name: '',
      username: '',
    };
  }

  return null;
};

const toBatchResponse = (row, settings, todayStart) => ({
  id: row._id.toString(),
  medicine: row.medicine
    ? {
        id: row.medicine._id.toString(),
        name: row.medicine.name,
        strength: row.medicine.strength || '',
      }
    : {
        id: '',
        name: '',
        strength: '',
      },
  pack: row.pack,
  batch_no: row.batchNo,
  expiry_date: row.expiryDate.toISOString(),
  available_boxes: row.availableBoxes,
  latest_purchase_price: row.purchasePrice,
  latest_mrp: row.mrp,
  source_type: normalizeSourceType(row),
  source: row.source || normalizeSourceType(row),
  source_receipt_id: row.sourceReceiptId ? row.sourceReceiptId.toString() : null,
  source_receipt_item_id: row.sourceReceiptItemId ? row.sourceReceiptItemId.toString() : null,
  source_manual_entry_id: row.sourceManualEntryId ? row.sourceManualEntryId.toString() : null,
  last_receipt_id:
    (row.lastReceiptId ? row.lastReceiptId.toString() : null) ||
    (row.sourceReceiptId ? row.sourceReceiptId.toString() : null),
  created_at: row.createdAt?.toISOString?.() || null,
  created_by: mapCreatedBy(row.createdBy),
  updated_at: row.updatedAt?.toISOString?.() || new Date().toISOString(),
  flags: buildFlags(row, settings, todayStart),
});

const hasPharmacyAccessByIdentity = async (batch, pharmacyId) => {
  if (!pharmacyId) {
    return true;
  }

  const pharmacyObjectId = new mongoose.Types.ObjectId(pharmacyId);

  const [hit] = await PurchaseReceiptItem.aggregate([
    {
      $match: {
        medicineId: batch.medicineId,
        pack: batch.pack,
        batchNo: batch.batchNo,
        expiryDate: batch.expiryDate,
      },
    },
    {
      $lookup: {
        from: 'purchasereceipts',
        localField: 'receiptId',
        foreignField: '_id',
        as: 'receipt',
        pipeline: [{ $project: { _id: 1, createdBy: 1 } }],
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
    { $limit: 1 },
    { $project: { _id: 1 } },
  ]);

  return Boolean(hit);
};

const ensureManualBatch = (row) => {
  const sourceType = normalizeSourceType(row);

  if (sourceType !== 'manual') {
    throw new ApiError(
      400,
      'BATCH_EDIT_BLOCKED',
      'Receipt-derived batches cannot be edited/deleted here. Edit the source receipt instead.'
    );
  }
};

export const listBatchStocks = async ({
  pharmacyId,
  q,
  expiryStatus = 'all',
  stockStatus = 'all',
  sort = 'expiry_stock',
  page = 1,
  limit = 20,
}) => {
  const settings = await resolveSettings(pharmacyId);
  const todayStart = startOfToday();
  const todayEnd = endOfDay(todayStart);
  const alertEnd = addDaysEndOfDay(todayStart, settings.expiryAlertDays);

  const match = {
    ...buildScopeFilter(pharmacyId),
  };

  if (expiryStatus === 'valid') {
    match.expiryDate = { $gt: todayEnd };
  } else if (expiryStatus === 'expired') {
    match.expiryDate = { $lte: todayEnd };
  } else if (expiryStatus === 'expiring') {
    match.expiryDate = { $gt: todayEnd, $lte: alertEnd };
  }

  if (stockStatus === 'in') {
    match.availableBoxes = { $gt: settings.lowStockLimit };
  } else if (stockStatus === 'low') {
    match.availableBoxes = { $gt: 0, $lte: settings.lowStockLimit };
  } else if (stockStatus === 'out') {
    match.availableBoxes = { $lte: 0 };
  }

  const pipeline = [
    { $match: match },
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
      $unwind: {
        path: '$medicine',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        daysLeft: {
          $floor: {
            $divide: [{ $subtract: ['$expiryDate', '$$NOW'] }, 86400000],
          },
        },
        expiredFlag: {
          $cond: [{ $lte: ['$expiryDate', '$$NOW'] }, 1, 0],
        },
        outFlag: {
          $cond: [{ $lte: ['$availableBoxes', 0] }, 0, 1],
        },
        medicineSortName: { $ifNull: ['$medicine.name', ''] },
      },
    },
  ];

  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');

    pipeline.push({
      $match: {
        $or: [
          { pack: regex },
          { batchNo: regex },
          { 'medicine.name': regex },
          { 'medicine.strength': regex },
        ],
      },
    });
  }

  const sortMap = {
    expiry_stock: { expiredFlag: 1, daysLeft: 1, availableBoxes: 1, medicineSortName: 1, _id: 1 },
    stock_expiry: { outFlag: 1, availableBoxes: 1, daysLeft: 1, medicineSortName: 1, _id: 1 },
    expiry: { expiredFlag: 1, daysLeft: 1, medicineSortName: 1, _id: 1 },
    stock: { outFlag: 1, availableBoxes: 1, medicineSortName: 1, _id: 1 },
    medicine: { medicineSortName: 1, _id: 1 },
    updated: { updatedAt: -1, _id: -1 },
  };

  const skip = (page - 1) * limit;

  pipeline.push(
    { $sort: sortMap[sort] || sortMap.expiry_stock },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              medicineId: 1,
              pack: 1,
              batchNo: 1,
              expiryDate: 1,
              availableBoxes: 1,
              purchasePrice: 1,
              mrp: 1,
              source: 1,
              sourceType: 1,
              sourceReceiptId: 1,
              sourceReceiptItemId: 1,
              sourceManualEntryId: 1,
              lastReceiptId: 1,
              updatedAt: 1,
              medicine: 1,
            },
          },
        ],
        total: [{ $count: 'count' }],
      },
    }
  );

  const [result] = await BatchStock.aggregate(pipeline);

  const rows = result?.items || [];
  const total = result?.total?.[0]?.count || 0;

  const items = rows.map((row) => toBatchResponse(row, settings, todayStart));

  return {
    items,
    page,
    limit,
    total,
    total_pages: Math.max(1, Math.ceil(total / limit)),
    settings: {
      expiry_alert_days: settings.expiryAlertDays,
      low_stock_limit: settings.lowStockLimit,
    },
  };
};

export const getBatchStockDetail = async ({ id, pharmacyId }) => {
  const batchObjectId = new mongoose.Types.ObjectId(id);
  const todayStart = startOfToday();
  const settings = await resolveSettings(pharmacyId);

  const [row] = await BatchStock.aggregate([
    {
      $match: {
        _id: batchObjectId,
        ...buildScopeFilter(pharmacyId),
      },
    },
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
      $unwind: {
        path: '$medicine',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'creator',
        pipeline: [{ $project: { _id: 1, fullName: 1, username: 1 } }],
      },
    },
    {
      $unwind: {
        path: '$creator',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        medicineId: 1,
        pack: 1,
        batchNo: 1,
        expiryDate: 1,
        availableBoxes: 1,
        purchasePrice: 1,
        mrp: 1,
        source: 1,
        sourceType: 1,
        sourceReceiptId: 1,
        sourceReceiptItemId: 1,
        sourceManualEntryId: 1,
        lastReceiptId: 1,
        createdBy: '$creator',
        createdAt: 1,
        updatedAt: 1,
        medicine: 1,
      },
    },
  ]);

  if (!row) {
    return null;
  }

  const hasPharmacyField = Boolean(BatchStock.schema.path('pharmacyId'));
  if (!hasPharmacyField) {
    const allowed = await hasPharmacyAccessByIdentity(row, pharmacyId);
    if (!allowed) {
      return null;
    }
  }

  const batch = toBatchResponse(row, settings, todayStart);
  const sourceReceiptId =
    batch.source_receipt_id ||
    batch.last_receipt_id ||
    null;

  let receipt = null;
  if ((batch.source_type || '').toLowerCase() === 'receipt' && sourceReceiptId) {
    const receiptDoc = await PurchaseReceipt.findById(
      new mongoose.Types.ObjectId(sourceReceiptId),
      {
        _id: 1,
        invoiceNumber: 1,
        invoiceDate: 1,
        supplierId: 1,
      }
    )
      .populate({
        path: 'supplierId',
        select: 'name',
      })
      .lean();

    if (receiptDoc) {
      receipt = {
        id: receiptDoc._id.toString(),
        invoice_number: receiptDoc.invoiceNumber || '',
        invoice_date: receiptDoc.invoiceDate?.toISOString?.() || null,
        supplier: {
          name: receiptDoc.supplierId?.name || '',
        },
      };
    }
  }

  return { batch, receipt };
};

export const getBatchStockSource = async ({ id, pharmacyId }) => {
  const row = await BatchStock.findOne(
    {
      _id: new mongoose.Types.ObjectId(id),
      ...buildScopeFilter(pharmacyId),
    },
    { _id: 1, source: 1, sourceType: 1, sourceReceiptId: 1, lastReceiptId: 1 }
  ).lean();

  if (!row) {
    return null;
  }

  const sourceType = normalizeSourceType(row);

  if (sourceType === 'manual') {
    return {
      sourceType: 'manual',
      receiptId: null,
    };
  }

  return {
    sourceType: 'receipt',
    receiptId:
      row.sourceReceiptId?.toString?.() ||
      row.lastReceiptId?.toString?.() ||
      null,
  };
};

export const manualAddBatchStock = async ({
  pharmacyId,
  userId,
  medicineId,
  pack,
  batchNo,
  expiryDate,
  availableBoxes,
  purchasePrice,
  mrp,
}) => {
  const settings = await resolveSettings(pharmacyId);
  const todayStart = startOfToday();

  const filter = {
    ...buildScopeFilter(pharmacyId),
    medicineId: new mongoose.Types.ObjectId(medicineId),
    pack,
    batchNo,
    expiryDate: new Date(expiryDate),
  };

  const createdByObjectId = userId ? new mongoose.Types.ObjectId(userId) : undefined;

  const update = {
    $inc: {
      availableBoxes: Number(availableBoxes),
    },
    $setOnInsert: {
      ...filter,
      source: 'manual',
      sourceType: 'manual',
      ...(createdByObjectId ? { createdBy: createdByObjectId } : {}),
      ...(typeof purchasePrice === 'number' ? {} : { purchasePrice: 0 }),
      ...(typeof mrp === 'number' ? {} : { mrp: 0 }),
    },
  };

  if (typeof purchasePrice === 'number') {
    update.$set = {
      ...(update.$set || {}),
      purchasePrice,
    };
  }

  if (typeof mrp === 'number') {
    update.$set = {
      ...(update.$set || {}),
      mrp,
    };
  }

  const row = await BatchStock.findOneAndUpdate(filter, update, {
    new: true,
    upsert: true,
  })
    .populate({
      path: 'medicineId',
      select: 'name strength',
    })
    .lean();

  const mapped = {
    _id: row._id,
    medicine: row.medicineId
      ? {
          _id: row.medicineId._id,
          name: row.medicineId.name,
          strength: row.medicineId.strength || '',
        }
      : null,
    pack: row.pack,
    batchNo: row.batchNo,
    expiryDate: row.expiryDate,
    availableBoxes: row.availableBoxes,
    purchasePrice: row.purchasePrice,
    mrp: row.mrp,
    source: row.source,
    sourceType: row.sourceType,
    sourceReceiptId: row.sourceReceiptId,
    sourceReceiptItemId: row.sourceReceiptItemId,
    sourceManualEntryId: row.sourceManualEntryId,
    lastReceiptId: row.lastReceiptId,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return toBatchResponse(mapped, settings, todayStart);
};

export const updateManualBatchStock = async ({
  id,
  pharmacyId,
  medicineId,
  pack,
  batchNo,
  expiryDate,
  availableBoxes,
  purchasePrice,
  mrp,
}) => {
  const settings = await resolveSettings(pharmacyId);
  const todayStart = startOfToday();

  const existing = await BatchStock.findOne(
    {
      _id: new mongoose.Types.ObjectId(id),
      ...buildScopeFilter(pharmacyId),
    },
    {
      _id: 1,
      source: 1,
      sourceType: 1,
    }
  ).lean();

  if (!existing) {
    return null;
  }

  ensureManualBatch(existing);

  const next = await BatchStock.findOneAndUpdate(
    {
      _id: existing._id,
      ...buildScopeFilter(pharmacyId),
    },
    {
      $set: {
        medicineId: new mongoose.Types.ObjectId(medicineId),
        pack,
        batchNo,
        expiryDate: new Date(expiryDate),
        availableBoxes: Number(availableBoxes),
        purchasePrice: Number(purchasePrice),
        mrp: Number(mrp),
        source: 'manual',
        sourceType: 'manual',
      },
    },
    {
      new: true,
      runValidators: true,
    }
  )
    .populate({ path: 'medicineId', select: 'name strength' })
    .lean();

  if (!next) {
    return null;
  }

  const mapped = {
    _id: next._id,
    medicine: next.medicineId
      ? {
          _id: next.medicineId._id,
          name: next.medicineId.name,
          strength: next.medicineId.strength || '',
        }
      : null,
    pack: next.pack,
    batchNo: next.batchNo,
    expiryDate: next.expiryDate,
    availableBoxes: next.availableBoxes,
    purchasePrice: next.purchasePrice,
    mrp: next.mrp,
    source: next.source,
    sourceType: next.sourceType,
    sourceReceiptId: next.sourceReceiptId,
    sourceReceiptItemId: next.sourceReceiptItemId,
    sourceManualEntryId: next.sourceManualEntryId,
    lastReceiptId: next.lastReceiptId,
    createdBy: next.createdBy,
    createdAt: next.createdAt,
    updatedAt: next.updatedAt,
  };

  return toBatchResponse(mapped, settings, todayStart);
};

export const deleteManualBatchStock = async ({ id, pharmacyId }) => {
  const existing = await BatchStock.findOne(
    {
      _id: new mongoose.Types.ObjectId(id),
      ...buildScopeFilter(pharmacyId),
    },
    { _id: 1, source: 1, sourceType: 1 }
  ).lean();

  if (!existing) {
    return null;
  }

  ensureManualBatch(existing);

  const inUse = await StockIssue.exists({ batchStockId: existing._id });
  if (inUse) {
    throw new ApiError(400, 'BATCH_IN_USE', 'Cannot delete manual batch because stock issues exist');
  }

  await BatchStock.deleteOne({ _id: existing._id, ...buildScopeFilter(pharmacyId) });

  return {
    id: existing._id.toString(),
  };
};

const hasIssueForBatchIdentity = async ({ batch, pharmacyId, session }) => {
  const identityBatchIds = await BatchStock.find(
    {
      ...buildScopeFilter(pharmacyId),
      medicineId: batch.medicineId,
      pack: batch.pack,
      batchNo: batch.batchNo,
      expiryDate: batch.expiryDate,
    },
    { _id: 1 }
  )
    .session(session)
    .lean();

  if (identityBatchIds.length === 0) {
    return false;
  }

  const hasIssue = await StockIssue.exists({
    batchStockId: {
      $in: identityBatchIds.map((row) => row._id),
    },
  }).session(session);

  return Boolean(hasIssue);
};

const recalculateReceiptTotals = async ({ receiptId, session }) => {
  const items = await PurchaseReceiptItem.find(
    { receiptId },
    { quantityBoxes: 1, purchasePrice: 1 }
  )
    .session(session)
    .lean();

  if (items.length === 0) {
    await PurchaseReceipt.deleteOne({ _id: receiptId }).session(session);
    return;
  }

  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item.quantityBoxes || 0) * Number(item.purchasePrice || 0),
    0
  );

  const receipt = await PurchaseReceipt.findById(receiptId, { discountAmount: 1 })
    .session(session)
    .lean();
  const discountAmount = Math.min(Number(receipt?.discountAmount || 0), totalAmount);
  const netAmount = totalAmount - discountAmount;

  await PurchaseReceipt.updateOne(
    { _id: receiptId },
    {
      $set: {
        totalAmount,
        discountAmount,
        netAmount,
      },
    },
    { session }
  );
};

export const deleteBatchStockById = async ({ id, pharmacyId }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const batch = await BatchStock.findOne(
      { _id: new mongoose.Types.ObjectId(id), ...buildScopeFilter(pharmacyId) },
      {
        _id: 1,
        pharmacyId: 1,
        medicineId: 1,
        pack: 1,
        batchNo: 1,
        expiryDate: 1,
        source: 1,
        sourceType: 1,
        sourceReceiptId: 1,
        sourceReceiptItemId: 1,
        lastReceiptId: 1,
      }
    ).session(session);

    if (!batch) {
      await session.abortTransaction();
      return null;
    }

    const hasIssue = await hasIssueForBatchIdentity({ batch, pharmacyId, session });
    if (hasIssue) {
      throw new ApiError(
        409,
        'BATCH_HAS_STOCK_ISSUES',
        'Cannot delete this batch because stock has already been issued from it.'
      );
    }

    const sourceType = normalizeSourceType(batch);

    if (sourceType === 'manual') {
      await BatchStock.deleteOne({ _id: batch._id }).session(session);
      await session.commitTransaction();
      return { deleted: true };
    }

    const sourceReceiptId = batch.sourceReceiptId || batch.lastReceiptId || null;
    const sourceReceiptItemId = batch.sourceReceiptItemId || null;

    let affectedReceiptId = sourceReceiptId;

    if (sourceReceiptItemId) {
      const receiptItem = await PurchaseReceiptItem.findOne(
        { _id: sourceReceiptItemId },
        { _id: 1, receiptId: 1 }
      ).session(session);
      if (receiptItem) {
        affectedReceiptId = receiptItem.receiptId;
        await PurchaseReceiptItem.deleteOne({ _id: sourceReceiptItemId }).session(session);
      }
    } else if (sourceReceiptId) {
      await PurchaseReceiptItem.deleteOne({
        receiptId: sourceReceiptId,
        medicineId: batch.medicineId,
        pack: batch.pack,
        batchNo: batch.batchNo,
        expiryDate: batch.expiryDate,
      }).session(session);
    }

    if (affectedReceiptId) {
      await recalculateReceiptTotals({ receiptId: affectedReceiptId, session });
    }

    await rebuildBatchStockForPharmacy({ pharmacyId, session });

    await session.commitTransaction();
    return { deleted: true };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
