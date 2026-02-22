import * as BatchService from '../services/batch.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const lookupBatch = asyncHandler(async (req, res) => {
  const result = await BatchService.lookupBatchIdentity({
    medicineId: req.query.medicine_id,
    pack: req.query.pack,
    batchNo: req.query.batch_no,
    expiryDate: req.query.expiry_date,
  });

  return ApiResponse.ok(res, result);
});

export const listBatches = asyncHandler(async (req, res) => {
  const result = await BatchService.listBatches({
    q: req.query.q,
    medicineId: req.query.medicine_id,
    pack: req.query.pack,
    batchNo: req.query.batch_no,
    expiryStatus: req.query.expiry_status,
    stockStatus: req.query.stock_status,
    includeOutOfStock: req.query.include_out_of_stock,
    sort: req.query.sort,
    page: req.query.page,
    limit: req.query.limit,
  });

  return ApiResponse.ok(res, result);
});
