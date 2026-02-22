import BatchStock from '../models/BatchStock.js';
import Medicine from '../models/Medicine.js';
import Settings from '../models/Settings.js';

const BATCH_LOOKUP_PROJECTION = {
  _id: 1,
  availableBoxes: 1,
  purchasePrice: 1,
  mrp: 1,
};

const BATCH_LIST_PROJECTION = {
  _id: 1,
  medicineId: 1,
  pack: 1,
  batchNo: 1,
  expiryDate: 1,
  availableBoxes: 1,
  purchasePrice: 1,
  mrp: 1,
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

const endOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const addDaysEndOfDay = (date, days) =>
  endOfDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));

const buildFlags = (batch, { expiryAlertDays, lowStockLimitBoxes }, todayStart) => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((batch.expiryDate.getTime() - todayStart.getTime()) / msPerDay);

  const expired = daysLeft <= 0;
  const expiringSoon = daysLeft > 0 && daysLeft <= expiryAlertDays;
  const outOfStock = batch.availableBoxes === 0;
  const lowStock = batch.availableBoxes > 0 && batch.availableBoxes <= lowStockLimitBoxes;

  return {
    expired,
    expiring_soon: expiringSoon,
    low_stock: lowStock,
    out_of_stock: outOfStock,
  };
};

const resolveSettings = async () => {
  let settings = await Settings.findOne({}, { lowStockLimitBoxes: 1, expiryAlertDays: 1 }).lean();

  if (!settings) {
    const created = await Settings.create({});
    settings = {
      lowStockLimitBoxes: created.lowStockLimitBoxes,
      expiryAlertDays: created.expiryAlertDays,
    };
  }

  return {
    lowStockLimitBoxes: settings.lowStockLimitBoxes,
    expiryAlertDays: settings.expiryAlertDays,
  };
};

export const lookupBatchIdentity = async ({ medicineId, pack, batchNo, expiryDate }) => {
  const batch = await BatchStock.findOne(
    {
      medicineId,
      pack,
      batchNo,
      expiryDate,
    },
    BATCH_LOOKUP_PROJECTION
  ).lean();

  if (!batch) {
    return { exists: false };
  }

  return {
    exists: true,
    batch_stock_id: batch._id.toString(),
    available_boxes: batch.availableBoxes,
    latest_purchase_price: batch.purchasePrice,
    latest_mrp: batch.mrp,
  };
};

export const listBatches = async ({
  q,
  medicineId,
  pack,
  batchNo,
  expiryStatus,
  stockStatus,
  includeOutOfStock = true,
  sort = 'expiry_asc',
  page = 1,
  limit = 20,
}) => {
  const settings = await resolveSettings();
  const todayStart = startOfToday();
  const todayEnd = endOfDay(todayStart);
  const alertEnd = addDaysEndOfDay(todayStart, settings.expiryAlertDays);

  const andFilters = [];

  if (medicineId) {
    andFilters.push({ medicineId });
  }

  if (pack) {
    andFilters.push({ pack: { $regex: escapeRegex(pack), $options: 'i' } });
  }

  if (batchNo) {
    andFilters.push({ batchNo: { $regex: escapeRegex(batchNo), $options: 'i' } });
  }

  if (expiryStatus === 'expired') {
    andFilters.push({ expiryDate: { $lte: todayEnd } });
  } else if (expiryStatus === 'expiring_soon') {
    andFilters.push({ expiryDate: { $gt: todayEnd, $lte: alertEnd } });
  } else if (expiryStatus === 'valid') {
    andFilters.push({ expiryDate: { $gt: alertEnd } });
  }

  if (stockStatus === 'out_of_stock') {
    andFilters.push({ availableBoxes: 0 });
  } else if (stockStatus === 'low_stock') {
    andFilters.push({ availableBoxes: { $gt: 0, $lte: settings.lowStockLimitBoxes } });
  } else if (stockStatus === 'in_stock') {
    andFilters.push({ availableBoxes: { $gt: settings.lowStockLimitBoxes } });
  }

  if (!includeOutOfStock && stockStatus !== 'out_of_stock') {
    andFilters.push({ availableBoxes: { $gt: 0 } });
  }

  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');

    const medicines = await Medicine.find(
      {
        $or: [{ name: regex }, { strength: regex }],
      },
      { _id: 1 }
    ).lean();

    const medicineIds = medicines.map((medicine) => medicine._id);

    const qOrFilters = [{ batchNo: regex }, { pack: regex }];

    if (medicineIds.length > 0) {
      qOrFilters.push({ medicineId: { $in: medicineIds } });
    }

    andFilters.push({ $or: qOrFilters });
  }

  const filter = andFilters.length > 0 ? { $and: andFilters } : {};

  const sortMap = {
    expiry_asc: { expiryDate: 1, _id: 1 },
    expiry_desc: { expiryDate: -1, _id: -1 },
    stock_asc: { availableBoxes: 1, _id: 1 },
    stock_desc: { availableBoxes: -1, _id: -1 },
  };

  const sortBy = sortMap[sort] || sortMap.expiry_asc;
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    BatchStock.find(filter, BATCH_LIST_PROJECTION)
      .sort(sortBy)
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'medicineId',
        select: 'name strength',
      })
      .lean(),
    BatchStock.countDocuments(filter),
  ]);

  const items = rows.map((row) => ({
    id: row._id.toString(),
    medicine: row.medicineId
      ? {
          id: row.medicineId._id.toString(),
          name: row.medicineId.name,
          strength: row.medicineId.strength || '',
        }
      : {
          id: row.medicineId.toString(),
          name: '',
          strength: '',
        },
    pack: row.pack,
    batch_no: row.batchNo,
    expiry_date: row.expiryDate.toISOString(),
    available_boxes: row.availableBoxes,
    latest_purchase_price: row.purchasePrice,
    latest_mrp: row.mrp,
    flags: buildFlags(row, settings, todayStart),
  }));

  return {
    page,
    limit,
    total,
    items,
  };
};
