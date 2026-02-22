import Supplier from '../models/Supplier.js';

const SUPPLIER_PROJECTION = {
  _id: 1,
  name: 1,
  phone: 1,
  address: 1,
  createdAt: 1,
  updatedAt: 1,
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const createSupplier = async (payload) => Supplier.create(payload);

export const listSuppliers = async ({ q, page = 1, limit = 20 }) => {
  const filter = {};

  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: regex }, { phone: regex }];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Supplier.find(filter, SUPPLIER_PROJECTION)
      .sort({ updatedAt: -1, _id: -1 })
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
  };
};

export const getSupplierById = async (id) => Supplier.findById(id, SUPPLIER_PROJECTION).lean();

export const updateSupplier = async (id, payload) =>
  Supplier.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
    projection: SUPPLIER_PROJECTION,
  }).lean();
