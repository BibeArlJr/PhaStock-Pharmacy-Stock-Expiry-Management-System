import BatchStock from '../models/BatchStock.js';
import { buildAlertMatchFilter, buildBatchFlags, resolveBatchFilterContext } from '../utils/batchFilters.js';

const ALERT_PROJECTION = {
  _id: 1,
  medicineId: 1,
  pack: 1,
  batchNo: 1,
  expiryDate: 1,
  availableBoxes: 1,
  purchasePrice: 1,
  mrp: 1,
};

const sortOptions = {
  expiry_asc: { expiryDate: 1, _id: 1 },
  expiry_desc: { expiryDate: -1, _id: -1 },
  stock_asc: { availableBoxes: 1, _id: 1 },
  stock_desc: { availableBoxes: -1, _id: -1 },
};

const defaultSortByType = {
  EXPIRED: 'expiry_asc',
  EXPIRING_SOON: 'expiry_asc',
  LOW_STOCK: 'stock_asc',
  OUT_OF_STOCK: 'stock_asc',
};

export const listAlertBatches = async ({ type, page = 1, limit = 20, sort }) => {
  const context = await resolveBatchFilterContext();
  const filter = buildAlertMatchFilter(type, context);

  const sortKey = sort || defaultSortByType[type] || 'expiry_asc';
  const sortBy = sortOptions[sortKey] || sortOptions.expiry_asc;
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    BatchStock.find(filter, ALERT_PROJECTION)
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
    flags: buildBatchFlags(row, context),
  }));

  return {
    page,
    limit,
    total,
    items,
  };
};
