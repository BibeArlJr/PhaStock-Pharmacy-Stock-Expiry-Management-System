const AuditLog = require('../models/AuditLog.js');
const BatchStock = require('../models/BatchStock.js');
const Medicine = require('../models/Medicine.js');
const PurchaseReceiptItem = require('../models/PurchaseReceiptItem.js');
const StockIssue = require('../models/StockIssue.js');
const ApiError = require('../utils/ApiError.js');
const MEDICINE_PROJECTION = {
  _id: 1,
  name: 1,
  strength: 1,
  category: 1,
  notes: 1,
  createdAt: 1,
  updatedAt: 1,
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sortMap = {
  name_asc: { name: 1, _id: 1 },
  name_desc: { name: -1, _id: -1 },
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
};

const logAudit = async ({ action, entityId, metadata = {}, userId }) => {
  await AuditLog.create({
    action,
    entity: 'medicine',
    entityId,
    metadata,
    createdBy: userId,
  });
};
const createMedicine = async (payload, userId, pharmacyId) => {
  if (!pharmacyId) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Pharmacy identity is missing.');
  }

  const medicine = await Medicine.create({ ...payload, pharmacyId });
  await logAudit({
    action: 'MEDICINE_CREATED',
    entityId: medicine._id,
    metadata: {
      name: medicine.name,
      strength: medicine.strength,
      category: medicine.category,
      notes: medicine.notes,
    },
    userId,
  });
  return medicine;
};
const listMedicines = async ({ q, page = 1, limit = 20, sort = 'name_asc' } = {}, pharmacyId) => {
  if (!pharmacyId) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Pharmacy identity is missing.');
  }

  const filter = { pharmacyId };

  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: regex }, { strength: regex }, { category: regex }];
  }

  const skip = (page - 1) * limit;
  const sortOption = sortMap[sort] || sortMap.name_asc;

  const [items, total] = await Promise.all([
    Medicine.find(filter, MEDICINE_PROJECTION)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
    Medicine.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    limit,
    total_pages: Math.max(1, Math.ceil(total / limit)),
  };
};
const getMedicineById = async (id, pharmacyId) => {
  if (!pharmacyId) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Pharmacy identity is missing.');
  }

  const medicine = await Medicine.findOne({ _id: id, pharmacyId }, MEDICINE_PROJECTION).lean();
  if (!medicine) {
    throw new ApiError(404, 'NOT_FOUND', 'Medicine not found');
  }
  return medicine;
};
const updateMedicine = async (id, payload, userId, pharmacyId) => {
  if (!pharmacyId) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Pharmacy identity is missing.');
  }

  const existing = await Medicine.findOne({ _id: id, pharmacyId }, { _id: 1 }).lean();
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Medicine not found');
  }

  const medicine = await Medicine.findOneAndUpdate({ _id: id, pharmacyId }, payload, {
    new: true,
    runValidators: true,
    projection: MEDICINE_PROJECTION,
  }).lean();

  const metadata = {};
  Object.keys(payload || {}).forEach((key) => {
    if (payload[key] !== undefined) {
      metadata[key] = payload[key];
    }
  });

  await logAudit({
    action: 'MEDICINE_UPDATED',
    entityId: medicine._id,
    metadata,
    userId,
  });

  return medicine;
};
const deleteMedicine = async (id, userId, pharmacyId) => {
  if (!pharmacyId) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Pharmacy identity is missing.');
  }

  const existing = await Medicine.findOne({ _id: id, pharmacyId }, MEDICINE_PROJECTION).lean();
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Medicine not found');
  }

  const [batchCount, receiptCount, issueCount] = await Promise.all([
    BatchStock.countDocuments({ pharmacyId, medicineId: id }),
    PurchaseReceiptItem.countDocuments({ medicineId: id }),
    StockIssue.countDocuments({ pharmacyId, 'items.medicineId': id }),
  ]);

  if (batchCount > 0 || receiptCount > 0 || issueCount > 0) {
    throw new ApiError(
      400,
      'MEDICINE_IN_USE',
      'Cannot delete medicine because it is referenced by other records'
    );
  }

  const medicine = await Medicine.findOneAndDelete({ _id: id, pharmacyId }).lean();

  await logAudit({
    action: 'MEDICINE_DELETED',
    entityId: medicine._id,
    metadata: {
      name: medicine.name,
      strength: medicine.strength,
      category: medicine.category,
      notes: medicine.notes,
    },
    userId,
  });

  return medicine;
};

module.exports = { createMedicine, listMedicines, getMedicineById, updateMedicine, deleteMedicine };
