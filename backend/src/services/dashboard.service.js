import BatchStock from '../models/BatchStock.js';
import Medicine from '../models/Medicine.js';
import { buildAlertMatchFilter, resolveBatchFilterContext } from '../utils/batchFilters.js';

export const getDashboardSummary = async () => {
  const context = await resolveBatchFilterContext();

  const [
    totalMedicines,
    expiringSoonBatches,
    expiredBatches,
    lowStockBatches,
    outOfStockBatches,
  ] = await Promise.all([
    Medicine.countDocuments({}),
    BatchStock.countDocuments(buildAlertMatchFilter('EXPIRING_SOON', context)),
    BatchStock.countDocuments(buildAlertMatchFilter('EXPIRED', context)),
    BatchStock.countDocuments(buildAlertMatchFilter('LOW_STOCK', context)),
    BatchStock.countDocuments(buildAlertMatchFilter('OUT_OF_STOCK', context)),
  ]);

  return {
    total_medicines: totalMedicines,
    expiring_soon_batches: expiringSoonBatches,
    expired_batches: expiredBatches,
    low_stock_batches: lowStockBatches,
    out_of_stock_batches: outOfStockBatches,
  };
};
