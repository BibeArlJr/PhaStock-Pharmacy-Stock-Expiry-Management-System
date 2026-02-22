import Medicine from '../models/Medicine.js';

const MEDICINE_PROJECTION = {
  _id: 1,
  name: 1,
  strength: 1,
  category: 1,
  createdAt: 1,
  updatedAt: 1,
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const createMedicine = async (payload) => Medicine.create(payload);

export const listMedicines = async ({ q, page = 1, limit = 20 }) => {
  const filter = {};

  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: regex }, { strength: regex }];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Medicine.find(filter, MEDICINE_PROJECTION)
      .sort({ updatedAt: -1, _id: -1 })
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
  };
};

export const getMedicineById = async (id) => Medicine.findById(id, MEDICINE_PROJECTION).lean();

export const updateMedicine = async (id, payload) =>
  Medicine.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
    projection: MEDICINE_PROJECTION,
  }).lean();
