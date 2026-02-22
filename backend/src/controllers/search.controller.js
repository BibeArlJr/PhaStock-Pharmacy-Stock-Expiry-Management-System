import * as SearchService from '../services/search.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const receiptSearch = asyncHandler(async (req, res) => {
  const data = await SearchService.receiptSearch({
    supplierId: req.query.supplier_id,
    invoiceNumber: req.query.invoice_number,
    medicineId: req.query.medicine_id,
    pack: req.query.pack,
    batchNo: req.query.batch_no,
    dateFrom: req.query.date_from,
    dateTo: req.query.date_to,
    page: req.query.page,
    limit: req.query.limit,
  });

  return ApiResponse.ok(res, data);
});

export const priceHistory = asyncHandler(async (req, res) => {
  const data = await SearchService.priceHistory({
    medicineId: req.query.medicine_id,
    limit: req.query.limit,
  });

  return ApiResponse.ok(res, data);
});
