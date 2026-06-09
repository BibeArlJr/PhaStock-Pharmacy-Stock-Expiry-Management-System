const mongoose = require('mongoose');const AuditLog = require('../models/AuditLog.js');
const BatchStock = require('../models/BatchStock.js');
const Medicine = require('../models/Medicine.js');
const StockIssue = require('../models/StockIssue.js');
const ApiError = require('../utils/ApiError.js');
const pad = (value, length) => value.toString().padStart(length, '0');

const generateIssueNo = async () => {
  const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const random = Math.floor(1000 + Math.random() * 9000);
    const candidate = `ISS-${dateCode}-${random}`;
    const exists = await StockIssue.exists({ issueNo: candidate });
    if (!exists) return candidate;
  }
  throw new ApiError(500, 'ISSUE_NO_COLLISION', 'Unable to generate stock issue number');
};

const logAudit = async ({ action, entity, entityId, metadata, userId, session }) => {
  await AuditLog.create(
    [
      {
        action,
        entity,
        entityId,
        metadata,
        createdBy: userId,
      },
    ],
    { session }
  );
};

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

const ensurePharmacyId = (pharmacyId) => {
  if (!pharmacyId) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Pharmacy identity is missing.');
  }
  if (!mongoose.Types.ObjectId.isValid(pharmacyId)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid pharmacy id');
  }
  return toObjectId(pharmacyId);
};

const ensureIssueBelongsToPharmacy = async ({ issueId, pharmacyId, session }) => {
  const pharmacyObjectId = ensurePharmacyId(pharmacyId);
  const issue = await StockIssue.findOne({ _id: issueId, pharmacyId: pharmacyObjectId }).session(session);
  if (!issue) {
    throw new ApiError(404, 'NOT_FOUND', 'Stock issue not found');
  }
  return issue;
};

const ensureBatchBelongsToPharmacy = async ({ batchStockId, pharmacyId, session }) => {
  const pharmacyObjectId = ensurePharmacyId(pharmacyId);
  const batch = await BatchStock.findOne({ _id: batchStockId, pharmacyId: pharmacyObjectId })
    .session(session)
    .select('_id medicineId pack batchNo expiryDate availableBoxes');
  if (!batch) {
    throw new ApiError(404, 'BATCH_NOT_FOUND', 'Batch not found or unauthorized');
  }
  return batch;
};

const adjustBatchStock = async ({ batchId, qty, session }) => {
  const updated = await BatchStock.findOneAndUpdate(
    {
      _id: batchId,
      availableBoxes: { $gte: qty },
    },
    {
      $inc: { availableBoxes: -qty },
    },
    {
      new: true,
      session,
      select: '_id availableBoxes',
    }
  );
  if (!updated) {
    throw new ApiError(400, 'INSUFFICIENT_STOCK', 'Insufficient stock for batch');
  }
  return updated;
};

const normalizeIssueStatusForClient = (status) => {
  const raw = String(status ?? 'ACTIVE').toUpperCase();
  if (raw === 'VOID') return 'voided';
  return raw.toLowerCase();
};
const createStockIssue = async (
  { issueDate, reference, notes, items, fromStoreId, toStoreId },
  pharmacyId,
  user
) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'At least one item is required');
  }

  const pharmacyObjectId = ensurePharmacyId(pharmacyId);

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Preflight: ensure every referenced BatchStock belongs to this pharmacy.
    const batchStockIds = [...new Set((items || []).map((item) => item?.batch_stock_id).filter(Boolean))];
    for (const batchStockId of batchStockIds) {
      const batch = await BatchStock.findOne({ _id: batchStockId, pharmacyId: pharmacyObjectId })
        .session(session)
        .select('_id')
        .lean();
      if (!batch) {
        throw new Error(`BatchStock ${batchStockId} not found or does not belong to this pharmacy`);
      }
    }

    const sanitizedItems = [];
    let totalQty = 0;
    let totalAmount = 0;

    for (const item of items) {
      if (!item.batch_stock_id) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Batch stock id is required');
      }
      const qty = Number(item.qty_boxes);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Quantity must be greater than zero');
      }

      const batch = await ensureBatchBelongsToPharmacy({ batchStockId: item.batch_stock_id, pharmacyId, session });
      if (batch.expiryDate < new Date()) {
        throw new ApiError(400, 'BATCH_EXPIRED', 'Cannot issue from an expired batch');
      }

      const beforeQty = batch.availableBoxes;
      const updatedBatch = await adjustBatchStock({ batchId: batch._id, qty, session });

      totalQty += qty;
      totalAmount += Number(item.amount || qty * (item.rate || 0));

      const medicineInfo = await Medicine.findById(batch.medicineId)
        .select('name strength')
        .lean();

      sanitizedItems.push({
        medicineId: batch.medicineId,
        medicineNameSnapshot:
          (item.medicine_name_snapshot || '').trim() || medicineInfo?.name || '',
        strengthSnapshot:
          (item.strength_snapshot || '').trim() || medicineInfo?.strength || '',
        batchStockId: batch._id,
        batchNoSnapshot: batch.batchNo,
        expiryDateSnapshot: batch.expiryDate,
        qtyBoxes: qty,
        availableBefore: beforeQty,
        availableAfter: updatedBatch.availableBoxes,
        rate: Number(item.rate || 0),
        amount: Number(item.amount || qty * (item.rate || 0)),
      });
    }

    const issueNo = await generateIssueNo();

    const [createdDoc] = await StockIssue.create(
      [
        {
          pharmacyId: pharmacyObjectId,
          issueNo,
          issueDate: issueDate ? new Date(issueDate) : new Date(),
          reference,
          notes,
          fromStoreId,
          toStoreId,
          status: 'ACTIVE',
          totalQty,
          totalAmount,
          createdBy: user?.id || user?._id,
          items: sanitizedItems,
        },
      ],
      { session }
    );

    const created = createdDoc.toObject();

    await logAudit({
      action: 'STOCK_ISSUE_CREATED',
      entity: 'StockIssue',
      entityId: created._id,
      metadata: {
        issueNo: created.issueNo,
        itemCount: sanitizedItems.length,
        totalQty,
      },
      userId: user?.id || user?._id,
      session,
    });

    await session.commitTransaction();

    return created;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
const voidStockIssue = async ({ id, reason }, pharmacyId, user, sessionOverride) => {
  const session = sessionOverride || (await mongoose.startSession());
  let localSession = Boolean(sessionOverride);

  try {
    if (!localSession) {
      session.startTransaction();
    }

    const issue = await ensureIssueBelongsToPharmacy({ issueId: id, pharmacyId, session });
    if (issue.status === 'VOID') {
      throw new ApiError(400, 'ALREADY_VOIDED', 'Stock issue already voided');
    }

    for (const item of issue.items) {
      await ensureBatchBelongsToPharmacy({ batchStockId: item.batchStockId, pharmacyId, session });
      await BatchStock.findByIdAndUpdate(
        item.batchStockId,
        { $inc: { availableBoxes: item.qtyBoxes } },
        { session }
      );
    }

    issue.status = 'VOID';
    issue.voidReason = reason || '';
    issue.voidedAt = new Date();
    issue.voidedBy = user?.id || user?._id;
    await issue.save({ session });

    await logAudit({
      action: 'STOCK_ISSUE_VOIDED',
      entity: 'StockIssue',
      entityId: issue._id,
      metadata: {
        issueNo: issue.issueNo,
        reason: issue.voidReason,
      },
      userId: user?.id || user?._id,
      session,
    });

    if (!localSession) {
      await session.commitTransaction();
    }

    return issue.toObject();
  } catch (error) {
    if (!localSession) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (!localSession) {
      session.endSession();
    }
  }
};
const fefoSuggest = async ({ medicineId, pharmacyId }) => {
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const pharmacyObjectId = pharmacyId ? ensurePharmacyId(pharmacyId) : null;

  const batchMatch = {
    medicineId,
    expiryDate: { $gt: todayEnd },
    availableBoxes: { $gt: 0 },
    ...(pharmacyObjectId ? { pharmacyId: pharmacyObjectId } : {}),
  };

  const rows = await BatchStock.find(
    batchMatch,
    {
      _id: 1,
      batchNo: 1,
      pack: 1,
      expiryDate: 1,
      availableBoxes: 1,
    }
  )
    .sort({ expiryDate: 1, batchNo: 1 })
    .limit(20)
    .lean();

  const alternatives = rows.map((row) => ({
    batch_stock_id: row._id.toString(),
    batch_no: row.batchNo,
    pack: row.pack,
    expiry_date: row.expiryDate?.toISOString?.() || null,
    available_boxes: row.availableBoxes,
  }));

  return {
    suggested: alternatives[0] || null,
    alternatives,
  };
};
const voidStockIssuesBulk = async ({ ids, reason }, user) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'At least one id is required');
  }

  const session = await mongoose.startSession();
  const results = { voided: 0, skipped: 0, errors: [] };

  try {
    session.startTransaction();

    for (const id of ids) {
      try {
        await voidStockIssue({ id, reason }, user?.pharmacy?.id || null, user, session);
        results.voided += 1;
      } catch (error) {
        results.errors.push({ id, message: error.message });
        if (error.code === 'ALREADY_VOIDED') {
          results.skipped += 1;
          continue;
        }
        throw error;
      }
    }
    await session.commitTransaction();
    return results;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
const listStockIssues = async ({ pharmacyId, page = 1, limit = 20, status, q, dateFrom, dateTo }) => {
  // pharmacyId is required for tenant isolation; support legacy records via creator pharmacy inference.
  const pharmacyObjectId = ensurePharmacyId(pharmacyId);

  if (status) {
    // Normalize incoming filter (frontend uses "voided")
    status = String(status).toUpperCase();
    // Map 'VOIDED' to 'VOID' to match schema enum
    if (status === 'VOIDED') status = 'VOID';
  }

  const match = {};
  match.pharmacyId = pharmacyObjectId;
  if (status && status !== 'all') {
    const normalized = String(status).toLowerCase();
    match.status = normalized === 'voided' ? 'VOID' : normalized.toUpperCase();
  }

  if (q) {
    match.$or = [
      { issueNo: new RegExp(q, 'i') },
      { reference: new RegExp(q, 'i') },
    ];
  }

  if (dateFrom || dateTo) {
    match.issueDate = {};
    if (dateFrom) {
      match.issueDate.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      match.issueDate.$lte = new Date(dateTo);
    }
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'creator',
        pipeline: [{ $project: { fullName: 1, username: 1 } }],
      },
    },
    {
      $addFields: {
        createdByUser: { $arrayElemAt: ['$creator', 0] },
        itemsCount: { $size: { $ifNull: ['$items', []] } },
      },
    },
    { $sort: { issueDate: -1, _id: -1 } },
    {
      $facet: {
        items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const [result] = await StockIssue.aggregate(pipeline);
  const total = result?.total?.[0]?.count || 0;
  return {
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit),
    items: (result?.items || []).map((item) => {
      return {
        id: item._id.toString(),
        issue_no: item.issueNo ?? '',
        issue_date: item.issueDate?.toISOString?.() || null,
        status: normalizeIssueStatusForClient(item.status),
        total_qty: item.totalQty ?? 0,
        items_count: item.itemsCount ?? 0,
        reference: item.reference ?? '',
        created_by: item.createdByUser
          ? {
              full_name: item.createdByUser.fullName || '',
              username: item.createdByUser.username || '',
            }
          : null,
      };
    }),
  };
};
const getStockIssueById = async (id, pharmacyId) => {
  const issue = await StockIssue.findOne({ _id: id, pharmacyId: ensurePharmacyId(pharmacyId) })
    .populate({ path: 'createdBy', select: 'fullName username' })
    .populate({ path: 'voidedBy', select: 'fullName username' })
    .lean();

  if (!issue) {
    throw new ApiError(404, 'NOT_FOUND', 'Stock issue not found');
  }

  return {
    id: issue._id.toString(),
    issue_no: issue.issueNo,
    issue_date: issue.issueDate?.toISOString?.() || null,
    status: normalizeIssueStatusForClient(issue.status),
    reference: issue.reference || '',
    notes: issue.notes || '',
    total_qty: issue.totalQty,
    total_amount: issue.totalAmount,
    created_at: issue.createdAt?.toISOString?.() || null,
    created_by: issue.createdBy
      ? {
          id: issue.createdBy._id.toString(),
          full_name: issue.createdBy.fullName,
          username: issue.createdBy.username,
        }
      : null,
    void_reason: issue.voidReason || null,
    voided_at: issue.voidedAt?.toISOString?.() || null,
    voided_by: issue.voidedBy
      ? {
          id: issue.voidedBy._id.toString(),
          full_name: issue.voidedBy.fullName,
          username: issue.voidedBy.username,
        }
      : null,
    items: (issue.items || []).map((item) => ({
      batch_stock_id: item.batchStockId.toString(),
      medicine_id: item.medicineId.toString(),
      medicine_name_snapshot: item.medicineNameSnapshot,
      strength_snapshot: item.strengthSnapshot,
      batch_no_snapshot: item.batchNoSnapshot,
      expiry_date_snapshot: item.expiryDateSnapshot?.toISOString?.() || null,
      qty_boxes: item.qtyBoxes,
      available_before: item.availableBefore,
      available_after: item.availableAfter,
      rate: item.rate,
      amount: item.amount,
    })),
  };
};
const updateStockIssue = async ({ id, issueDate, reference, notes, items }, user) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'At least one item is required');
  }

  const pharmacyId = user?.pharmacy?.id || null;

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const issue = await ensureIssueBelongsToPharmacy({ issueId: id, pharmacyId, session });
    if (issue.status === 'VOID') {
      throw new ApiError(400, 'ALREADY_VOIDED', 'Cannot edit a voided stock issue');
    }

    const oldItems = issue.items || [];
    for (const existing of oldItems) {
      await BatchStock.findByIdAndUpdate(
        existing.batchStockId,
        { $inc: { availableBoxes: existing.qtyBoxes } },
        { session }
      );
    }

    const newItems = [];
    let totalQty = 0;
    let totalAmount = 0;

    for (const item of items) {
      if (!item.batch_stock_id) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Batch stock id is required');
      }
      const qty = Number(item.qty_boxes);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Quantity must be greater than zero');
      }

      const batch = await ensureBatchBelongsToPharmacy({
        batchStockId: item.batch_stock_id,
        pharmacyId,
        session,
      });
      if (batch.expiryDate < new Date()) {
        throw new ApiError(400, 'BATCH_EXPIRED', 'Cannot issue from an expired batch');
      }

      const beforeQty = batch.availableBoxes;
      const updatedBatch = await adjustBatchStock({ batchId: batch._id, qty, session });

      totalQty += qty;
      totalAmount += Number(item.amount || qty * (item.rate || 0));

      const medicineInfo = await Medicine.findById(batch.medicineId)
        .select('name strength')
        .lean();

      newItems.push({
        medicineId: batch.medicineId,
        medicineNameSnapshot:
          (item.medicine_name_snapshot || '').trim() || medicineInfo?.name || '',
        strengthSnapshot:
          (item.strength_snapshot || '').trim() || medicineInfo?.strength || '',
        batchStockId: batch._id,
        batchNoSnapshot: batch.batchNo,
        expiryDateSnapshot: batch.expiryDate,
        qtyBoxes: qty,
        availableBefore: beforeQty,
        availableAfter: updatedBatch.availableBoxes,
        rate: Number(item.rate || 0),
        amount: Number(item.amount || qty * (item.rate || 0)),
      });
    }

    if (issueDate) {
      issue.issueDate = new Date(issueDate);
    }
    issue.reference = reference ?? issue.reference;
    issue.notes = notes ?? issue.notes;
    issue.items = newItems;
    issue.totalQty = totalQty;
    issue.totalAmount = totalAmount;

    await issue.save({ session });

    await logAudit({
      action: 'STOCK_ISSUE_UPDATED',
      entity: 'StockIssue',
      entityId: issue._id,
      metadata: { issueNo: issue.issueNo, itemCount: newItems.length },
      userId: user?.id || user?._id,
      session,
    });

    await session.commitTransaction();
    return issue.toObject();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = { createStockIssue, voidStockIssue, fefoSuggest, voidStockIssuesBulk, listStockIssues, getStockIssueById, updateStockIssue };
