const mongoose = require('mongoose');const BatchStock = require('../models/BatchStock.js');
const Medicine = require('../models/Medicine.js');
const ApiError = require('../utils/ApiError.js');
const { getSettings } = require('./settings.service.js');
const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 0, 0, 0, 0);

const buildScopeFilter = (pharmacyId) => {
  if (!pharmacyId) return {};
  if (!mongoose.Types.ObjectId.isValid(pharmacyId)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid pharmacy id');
  }
  return { pharmacyId: new mongoose.Types.ObjectId(pharmacyId) };
};

const mapMedicineLookup = async (rows) => {
  const medicineIds = [...new Set(rows.map((r) => r.medicineId?.toString()).filter(Boolean))];
  if (!medicineIds.length) return new Map();
  const docs = await Medicine.find({ _id: { $in: medicineIds } }).select('name strength').lean();
  return new Map(docs.map((doc) => [doc._id.toString(), doc]));
};

const buildAlertItem = (row, medicineMap) => {
  const medicine = medicineMap.get(row.medicineId?.toString()) || {};
  return {
    batchStockId: row._id?.toString(),
    medicineId: row.medicineId?.toString() || '',
    medicineName: medicine.name || '',
    strength: medicine.strength || '',
    displayName: `${medicine.name || ''}${medicine.strength ? ` ${medicine.strength}` : ''}`.trim(),
    batchNo: row.batchNo,
    expiryDate: row.expiryDate?.toISOString?.() || null,
    availableBoxes: row.availableBoxes,
    sourceType: row.sourceType || 'unknown',
  };
};
const getAlerts = async ({ pharmacyId }) => {
  const settings = await getSettings(pharmacyId);
  const lowStockLimit = settings?.lowStockLimitBoxes ?? 2;
  const expiryAlertDays = settings?.expiryAlertDays ?? 30;

  const todayStart = startOfToday();
  const todayEnd = endOfDay(todayStart);
  const expiringThreshold = endOfDay(addDays(todayStart, expiryAlertDays));

  const filter = {
    ...buildScopeFilter(pharmacyId),
    availableBoxes: { $gt: 0 },
  };

  const rows = await BatchStock.find(filter)
    .select('medicineId batchNo expiryDate availableBoxes sourceType')
    .lean();

  const medicineMap = await mapMedicineLookup(rows);

  const expired = [];
  const expiringSoon = [];
  const lowStock = [];

  rows.forEach((row) => {
    const expiryDate = row.expiryDate ? new Date(row.expiryDate) : null;
    if (!expiryDate) return;

    if (expiryDate <= todayEnd) {
      expired.push(buildAlertItem(row, medicineMap));
      return;
    }

    if (expiryDate <= expiringThreshold) {
      expiringSoon.push(buildAlertItem(row, medicineMap));
      return;
    }

    if ((row.availableBoxes ?? 0) <= lowStockLimit) {
      lowStock.push(buildAlertItem(row, medicineMap));
    }
  });

  return {
    expired,
    expiringSoon,
    lowStock,
    meta: {
      expiry_alert_days: expiryAlertDays,
      low_stock_limit: lowStockLimit,
      generated_at: new Date().toISOString(),
    },
  };
};

module.exports = { getAlerts };
