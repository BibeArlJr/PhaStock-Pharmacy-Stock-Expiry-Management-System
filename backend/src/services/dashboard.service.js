const BatchStock = require('../models/BatchStock.js');
const Medicine = require('../models/Medicine.js');
const { getSettings } = require('./settings.service.js');
const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

const endOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const addDaysEndOfDay = (date, days) =>
  endOfDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));

const buildScopedFilter = (Model, pharmacyId) => {
  if (!pharmacyId) {
    return {};
  }

  return Model.schema.path('pharmacyId') ? { pharmacyId } : {};
};
const getDashboardSummary = async (pharmacyId) => {
  const settings = pharmacyId ? await getSettings(pharmacyId) : null;
  const lowStockLimit = settings?.lowStockLimitBoxes ?? 2;
  const expiryAlertDays = settings?.expiryAlertDays ?? 30;

  const todayStart = startOfToday();
  const todayEnd = endOfDay(todayStart);
  const expiryAlertEnd = addDaysEndOfDay(todayStart, expiryAlertDays);

  const medicineScope = buildScopedFilter(Medicine, pharmacyId);
  const batchScope = buildScopedFilter(BatchStock, pharmacyId);

  const [
    totalMedicines,
    expiringSoonBatches,
    expiredBatches,
    lowStockBatches,
    outOfStockBatches,
  ] = await Promise.all([
    Medicine.countDocuments(medicineScope),
    BatchStock.countDocuments({
      ...batchScope,
      expiryDate: { $gt: todayEnd, $lte: expiryAlertEnd },
      availableBoxes: { $gt: 0 },
    }),
    BatchStock.countDocuments({
      ...batchScope,
      expiryDate: { $lte: todayEnd },
    }),
    BatchStock.countDocuments({
      ...batchScope,
      availableBoxes: { $gt: 0, $lte: lowStockLimit },
      expiryDate: { $gt: todayEnd },
    }),
    BatchStock.countDocuments({
      ...batchScope,
      availableBoxes: { $lte: 0 },
    }),
  ]);

  return {
    total_medicines: totalMedicines,
    expiring_soon_batches: expiringSoonBatches,
    expired_batches: expiredBatches,
    low_stock_batches: lowStockBatches,
    out_of_stock_batches: outOfStockBatches,
  };
};

module.exports = { getDashboardSummary };
