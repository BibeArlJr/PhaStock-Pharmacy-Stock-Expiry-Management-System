const AuditLog = require('../models/AuditLog.js');
const PurchaseReceipt = require('../models/PurchaseReceipt.js');
const Supplier = require('../models/Supplier.js');
const ApiError = require('../utils/ApiError.js');
const SUPPLIER_PROJECTION = {
  _id: 1,
  name: 1,
  phone: 1,
  email: 1,
  address: 1,
  panVat: 1,
  notes: 1,
  status: 1,
  createdAt: 1,
  updatedAt: 1,
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORT_MAP = {
  name_asc: { name: 1, _id: 1 },
  name_desc: { name: -1, _id: -1 },
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
};

const logAudit = async ({ action, entityId, metadata = {}, userId }) => {
  await AuditLog.create({
    action,
    entity: 'supplier',
    entityId,
    metadata,
    createdBy: userId,
  });
};
const createSupplier = async (payload, userId, pharmacyId) => {
  if (!pharmacyId) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Pharmacy identity is missing.');
  }

  const supplier = await Supplier.create({
    ...payload,
    pharmacyId,
    createdBy: userId,
  });

  await logAudit({
    action: 'SUPPLIER_CREATED',
    entityId: supplier._id,
    metadata: {
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      status: supplier.status,
    },
    userId,
  });

  return supplier;
};
const listSuppliers = async ({ q, sort = 'name_asc', page = 1, limit = 20 } = {}, pharmacyId) => {
  if (!pharmacyId) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Pharmacy identity is missing.');
  }

  const filter = { pharmacyId };

  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: regex }, { phone: regex }, { email: regex }];
  }

  const skip = (page - 1) * limit;
  const sortOption = SORT_MAP[sort] || SORT_MAP.name_asc;

  const [items, total] = await Promise.all([
    Supplier.find(filter, SUPPLIER_PROJECTION)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
    Supplier.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    limit,
    total_pages: Math.max(1, Math.ceil(total / limit)),
  };
};
const getSupplierById = async (id, pharmacyId) => {
  if (!pharmacyId) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Pharmacy identity is missing.');
  }

  const supplier = await Supplier.findOne({ _id: id, pharmacyId }, SUPPLIER_PROJECTION).lean();
  if (!supplier) {
    throw new ApiError(404, 'NOT_FOUND', 'Supplier not found');
  }
  return supplier;
};
const updateSupplier = async (id, payload, userId, pharmacyId) => {
  if (!pharmacyId) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Pharmacy identity is missing.');
  }

  const existing = await Supplier.findOne({ _id: id, pharmacyId }, { _id: 1 }).lean();
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Supplier not found');
  }

  const supplier = await Supplier.findOneAndUpdate({ _id: id, pharmacyId }, payload, {
    new: true,
    runValidators: true,
    projection: SUPPLIER_PROJECTION,
  }).lean();

  const metadata = {};
  Object.keys(payload || {}).forEach((key) => {
    if (payload[key] !== undefined) {
      metadata[key] = payload[key];
    }
  });

  await logAudit({
    action: 'SUPPLIER_UPDATED',
    entityId: supplier._id,
    metadata,
    userId,
  });

  return supplier;
};
const deleteSupplier = async (id, userId, pharmacyId) => {
  if (!pharmacyId) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Pharmacy identity is missing.');
  }

  const existing = await Supplier.findOne({ _id: id, pharmacyId }, SUPPLIER_PROJECTION).lean();
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Supplier not found');
  }

  const isUsed = await PurchaseReceipt.exists({ supplierId: id });
  if (isUsed) {
    throw new ApiError(400, 'SUPPLIER_IN_USE', 'Supplier is referenced by purchase receipts');
  }

  const supplier = await Supplier.findOneAndDelete({ _id: id, pharmacyId }).lean();

  await logAudit({
    action: 'SUPPLIER_DELETED',
    entityId: supplier._id,
    metadata: {
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
    },
    userId,
  });

  return supplier;
};

module.exports = { createSupplier, listSuppliers, getSupplierById, updateSupplier, deleteSupplier };
