import Settings from '../models/Settings.js';

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

const endOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const addDaysEndOfDay = (date, days) =>
  endOfDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));

export const resolveBatchFilterContext = async () => {
  let settings = await Settings.findOne({}, { expiryAlertDays: 1, lowStockLimitBoxes: 1 }).lean();

  if (!settings) {
    const created = await Settings.create({});
    settings = {
      expiryAlertDays: created.expiryAlertDays,
      lowStockLimitBoxes: created.lowStockLimitBoxes,
    };
  }

  const todayStart = startOfToday();
  const todayEnd = endOfDay(todayStart);
  const expiryAlertEnd = addDaysEndOfDay(todayStart, settings.expiryAlertDays);

  return {
    expiryAlertDays: settings.expiryAlertDays,
    lowStockLimitBoxes: settings.lowStockLimitBoxes,
    todayStart,
    todayEnd,
    expiryAlertEnd,
  };
};

export const buildAlertMatchFilter = (alertType, context) => {
  if (alertType === 'EXPIRED') {
    return { expiryDate: { $lte: context.todayEnd } };
  }

  if (alertType === 'EXPIRING_SOON') {
    return { expiryDate: { $gt: context.todayEnd, $lte: context.expiryAlertEnd } };
  }

  if (alertType === 'LOW_STOCK') {
    return {
      availableBoxes: {
        $gt: 0,
        $lte: context.lowStockLimitBoxes,
      },
    };
  }

  if (alertType === 'OUT_OF_STOCK') {
    return { availableBoxes: 0 };
  }

  return {};
};

export const buildBatchFlags = (batch, context) => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((batch.expiryDate.getTime() - context.todayStart.getTime()) / msPerDay);

  return {
    expired: daysLeft <= 0,
    expiring_soon: daysLeft > 0 && daysLeft <= context.expiryAlertDays,
    low_stock: batch.availableBoxes > 0 && batch.availableBoxes <= context.lowStockLimitBoxes,
    out_of_stock: batch.availableBoxes === 0,
  };
};
