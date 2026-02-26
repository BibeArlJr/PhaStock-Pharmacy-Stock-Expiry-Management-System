import * as BatchStockService from '../services/batchStock.service.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const listBatchStocks = asyncHandler(async (req, res) => {
  const result = await BatchStockService.listBatchStocks({
    pharmacyId: req.user?.pharmacy?.id,
    q: req.query.q,
    expiryStatus: req.query.expiry_status,
    stockStatus: req.query.stock_status,
    sort: req.query.sort,
    page: req.query.page,
    limit: req.query.limit,
  });

  return ApiResponse.ok(res, result);
});

export const getBatchStockDetail = asyncHandler(async (req, res) => {
  const result = await BatchStockService.getBatchStockDetail({
    id: req.params.id,
    pharmacyId: req.user?.pharmacy?.id,
  });

  if (!result) {
    throw new ApiError(404, 'NOT_FOUND', 'Batch stock not found');
  }

  return ApiResponse.ok(res, result);
});

export const manualAddBatchStock = asyncHandler(async (req, res) => {
  const result = await BatchStockService.manualAddBatchStock({
    pharmacyId: req.user?.pharmacy?.id,
    userId: req.user?.id || req.user?._id,
    medicineId: req.body.medicine_id,
    pack: req.body.pack,
    batchNo: req.body.batch_no,
    expiryDate: req.body.expiry_date,
    availableBoxes: req.body.available_boxes,
    purchasePrice: req.body.purchase_price,
    mrp: req.body.mrp,
  });

  return ApiResponse.created(res, result);
});

export const updateManualBatchStock = asyncHandler(async (req, res) => {
  const result = await BatchStockService.updateManualBatchStock({
    id: req.params.id,
    pharmacyId: req.user?.pharmacy?.id,
    medicineId: req.body.medicine_id,
    pack: req.body.pack,
    batchNo: req.body.batch_no,
    expiryDate: req.body.expiry_date,
    availableBoxes: req.body.available_boxes,
    purchasePrice: req.body.purchase_price,
    mrp: req.body.mrp,
  });

  if (!result) {
    throw new ApiError(404, 'NOT_FOUND', 'Batch stock not found');
  }

  return ApiResponse.ok(res, result);
});

export const deleteBatchStock = asyncHandler(async (req, res) => {
  const result = await BatchStockService.deleteBatchStockById({
    id: req.params.id,
    pharmacyId: req.user?.pharmacy?.id,
  });

  if (!result) {
    throw new ApiError(404, 'NOT_FOUND', 'Batch stock not found');
  }

  return ApiResponse.ok(res, {
    deleted: result.deleted === true,
    message: 'Batch stock deleted',
  });
});

export const getBatchStockSource = asyncHandler(async (req, res) => {
  const result = await BatchStockService.getBatchStockSource({
    id: req.params.id,
    pharmacyId: req.user?.pharmacy?.id,
  });

  if (!result) {
    throw new ApiError(404, 'NOT_FOUND', 'Batch stock not found');
  }

  return ApiResponse.ok(res, result);
});
