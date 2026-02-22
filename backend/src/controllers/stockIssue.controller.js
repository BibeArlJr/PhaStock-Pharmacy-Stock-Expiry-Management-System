import * as StockIssueService from '../services/stockIssue.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const mapHistoryItem = (item) => ({
  id: item._id.toString(),
  issued_date: item.issuedDate.toISOString(),
  issued_boxes: item.issuedBoxes,
  remark: item.remark || '',
  created_at: item.createdAt.toISOString(),
  created_by: item.createdByUser
    ? {
        id: item.createdByUser._id.toString(),
        full_name: item.createdByUser.fullName,
      }
    : null,
  batch: item.batch
    ? {
        id: item.batch._id.toString(),
        batch_no: item.batch.batchNo,
        pack: item.batch.pack,
        expiry_date: item.batch.expiryDate.toISOString(),
        medicine: item.medicine
          ? {
              id: item.medicine._id.toString(),
              name: item.medicine.name,
              strength: item.medicine.strength || '',
            }
          : {
              id: item.batch.medicineId.toString(),
              name: '',
              strength: '',
            },
      }
    : null,
});

export const fefoSuggest = asyncHandler(async (req, res) => {
  const data = await StockIssueService.fefoSuggest({
    medicineId: req.query.medicine_id,
  });

  return ApiResponse.ok(res, data);
});

export const createStockIssue = asyncHandler(async (req, res) => {
  const data = await StockIssueService.createStockIssue({
    batchStockId: req.body.batch_stock_id,
    issuedBoxes: req.body.issued_boxes,
    issuedDate: req.body.issued_date,
    remark: req.body.remark,
    userId: req.user.id,
  });

  return ApiResponse.created(res, data);
});

export const listStockIssues = asyncHandler(async (req, res) => {
  const result = await StockIssueService.listStockIssues({
    medicineId: req.query.medicine_id,
    batchStockId: req.query.batch_stock_id,
    dateFrom: req.query.date_from,
    dateTo: req.query.date_to,
    page: req.query.page,
    limit: req.query.limit,
  });

  return ApiResponse.ok(res, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    items: result.items.map(mapHistoryItem),
  });
});
