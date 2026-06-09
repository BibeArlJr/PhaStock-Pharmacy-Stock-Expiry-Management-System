const BatchStockService = require('../services/batchStock.service.js');
const ApiError = require('../utils/ApiError.js');
const ApiResponse = require('../utils/ApiResponse.js');
const asyncHandler = require('../utils/asyncHandler.js');
const listBatchStocks = asyncHandler(async (req, res) => {
  const result = await BatchStockService.listBatchStocks({
    pharmacyId: req.user?.pharmacy?.id,
    q: req.query.q,
    expiryStatus: req.query.expiry_status,
    stockStatus: req.query.stock_status,
    sort: req.query.sort,
    medicineId: req.query.medicine_id,
    page: req.query.page,
    limit: req.query.limit,
  });

  return ApiResponse.ok(res, result);
});
const getBatchStockDetail = asyncHandler(async (req, res) => {
  const result = await BatchStockService.getBatchStockDetail({
    id: req.params.id,
    pharmacyId: req.user?.pharmacy?.id,
  });

  if (!result) {
    throw new ApiError(404, 'NOT_FOUND', 'Batch stock not found');
  }

  return ApiResponse.ok(res, result);
});
const manualAddBatchStock = asyncHandler(async (req, res) => {
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
const updateManualBatchStock = asyncHandler(async (req, res) => {
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
const deleteBatchStock = asyncHandler(async (req, res) => {
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
const getBatchStockSource = asyncHandler(async (req, res) => {
  const result = await BatchStockService.getBatchStockSource({
    id: req.params.id,
    pharmacyId: req.user?.pharmacy?.id,
  });

  if (!result) {
    throw new ApiError(404, 'NOT_FOUND', 'Batch stock not found');
  }

  return ApiResponse.ok(res, result);
});

module.exports = { listBatchStocks, getBatchStockDetail, manualAddBatchStock, updateManualBatchStock, deleteBatchStock, getBatchStockSource };
