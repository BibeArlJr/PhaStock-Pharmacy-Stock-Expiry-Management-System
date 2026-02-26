import mongoose from 'mongoose';

import AuditLog from '../models/AuditLog.js';
import BatchStock from '../models/BatchStock.js';
import Medicine from '../models/Medicine.js';
import StockIssue from '../models/StockIssue.js';
import ApiError from '../utils/ApiError.js';

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

const ensureBatch = async ({ batchStockId, session }) => {
  const batch = await BatchStock.findById(batchStockId)
    .session(session)
    .select('_id medicineId pack batchNo expiryDate availableBoxes');
  if (!batch) {
    throw new ApiError(404, 'BATCH_NOT_FOUND', 'Batch stock not found');
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

export const createStockIssue = async ({ issueDate, reference, notes, items, fromStoreId, toStoreId }, user) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'At least one item is required');
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

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

      const batch = await ensureBatch({ batchStockId: item.batch_stock_id, session });
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

export const voidStockIssue = async ({ id, reason }, user, sessionOverride) => {
  const session = sessionOverride || (await mongoose.startSession());
  let localSession = Boolean(sessionOverride);

  try {
    if (!localSession) {
      session.startTransaction();
    }

    const issue = await StockIssue.findById(id).session(session);
    if (!issue) {
      throw new ApiError(404, 'NOT_FOUND', 'Stock issue not found');
    }
    if (issue.status === 'VOID') {
      throw new ApiError(400, 'ALREADY_VOIDED', 'Stock issue already voided');
    }

    for (const item of issue.items) {
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

export const fefoSuggest = async ({ medicineId }) => {
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const rows = await BatchStock.find(
    {
      medicineId,
      expiryDate: { $gt: todayEnd },
      availableBoxes: { $gt: 0 },
    },
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

export const voidStockIssuesBulk = async ({ ids, reason }, user) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'At least one id is required');
  }

  const session = await mongoose.startSession();
  const results = { voided: 0, skipped: 0, errors: [] };

  try {
    session.startTransaction();

    for (const id of ids) {
      try {
        await voidStockIssue({ id, reason }, user, session);
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

export const listStockIssues = async ({ page = 1, limit = 20, status, q, dateFrom, dateTo }) => {
  const match = {};
  if (status && status !== 'all') {
    match.status = status.toUpperCase();
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
        items: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
        {
          $project: {
            _id: 1,
            issueNo: 1,
            issueDate: 1,
            status: 1,
            totalQty: 1,
            reference: 1,
            itemsCount: 1,
            createdByUser: 1,
            items: { $slice: ['$items', 4] },
          },
        },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const [result] = await StockIssue.aggregate(pipeline);
  return {
    page,
    limit,
    total: result?.total?.[0]?.count || 0,
    items: (result?.items || []).map((item) => {
      const status = String(item.status ?? 'ACTIVE').toLowerCase();
      return {
        id: item._id.toString(),
        issue_no: item.issueNo ?? '',
        issue_date: item.issueDate?.toISOString?.() || null,
        status,
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

export const getStockIssueById = async (id) => {
  const issue = await StockIssue.findById(id)
    .populate({ path: 'createdBy', select: 'fullName username' })
    .populate({ path: 'voidedBy', select: 'fullName username' })
    .lean();

  if (!issue) {
    return null;
  }

  return {
    id: issue._id.toString(),
    issue_no: issue.issueNo,
    issue_date: issue.issueDate?.toISOString?.() || null,
    status: String(issue.status ?? 'ACTIVE').toLowerCase(),
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

export const updateStockIssue = async ({ id, issueDate, reference, notes, items }, user) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'At least one item is required');
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const issue = await StockIssue.findById(id).session(session);
    if (!issue) {
      throw new ApiError(404, 'NOT_FOUND', 'Stock issue not found');
    }
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

      const batch = await ensureBatch({ batchStockId: item.batch_stock_id, session });
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
