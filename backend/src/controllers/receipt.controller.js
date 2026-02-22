import * as ReceiptService from '../services/receipt.service.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const mapReceiptListItem = (item) => ({
  id: item._id.toString(),
  supplier: item.supplier
    ? {
        id: item.supplier._id.toString(),
        name: item.supplier.name,
      }
    : null,
  invoice_number: item.invoiceNumber,
  invoice_date: item.invoiceDate.toISOString(),
  payment_mode: item.paymentMode,
  receipt_type: item.receiptType,
  created_by: item.createdByUser
    ? {
        id: item.createdByUser._id.toString(),
        full_name: item.createdByUser.fullName,
      }
    : null,
  created_at: item.createdAt.toISOString(),
  item_count: item.itemCount,
});

const mapReceiptHeader = (header) => ({
  id: header._id.toString(),
  supplier: header.supplier
    ? {
        id: header.supplier._id.toString(),
        name: header.supplier.name,
      }
    : null,
  invoice_number: header.invoiceNumber,
  invoice_date: header.invoiceDate.toISOString(),
  payment_mode: header.paymentMode,
  receipt_type: header.receiptType,
  created_by: header.createdByUser
    ? {
        id: header.createdByUser._id.toString(),
        full_name: header.createdByUser.fullName,
      }
    : null,
  created_at: header.createdAt.toISOString(),
});

const mapReceiptItem = (item) => ({
  id: item._id.toString(),
  medicine: item.medicine
    ? {
        id: item.medicine._id.toString(),
        name: item.medicine.name,
        strength: item.medicine.strength || '',
      }
    : {
        id: item.medicineId.toString(),
        name: '',
        strength: '',
      },
  pack: item.pack,
  batch_no: item.batchNo,
  expiry_date: item.expiryDate.toISOString(),
  quantity_boxes: item.quantityBoxes,
  purchase_price: item.purchasePrice,
  mrp: item.mrp,
});

export const createReceipt = asyncHandler(async (req, res) => {
  const payload = {
    header: {
      supplierId: req.body.supplier_id,
      invoiceNumber: req.body.invoice_number,
      invoiceDate: req.body.invoice_date,
      paymentMode: req.body.payment_mode,
      receiptType: req.body.receipt_type,
    },
    items: req.body.items.map((item) => ({
      medicineId: item.medicine_id,
      pack: item.pack,
      batchNo: item.batch_no,
      expiryDate: item.expiry_date,
      quantityBoxes: item.quantity_boxes,
      purchasePrice: item.purchase_price,
      mrp: item.mrp,
    })),
    userId: req.user.id,
  };

  const result = await ReceiptService.createReceipt(payload);

  return ApiResponse.created(res, {
    receipt_id: result.receiptId,
    batch_updates: result.batchUpdates,
  });
});

export const listReceipts = asyncHandler(async (req, res) => {
  const result = await ReceiptService.listReceipts({
    supplierId: req.query.supplier_id,
    invoiceNumber: req.query.invoice_number,
    dateFrom: req.query.date_from,
    dateTo: req.query.date_to,
    page: req.query.page,
    limit: req.query.limit,
  });

  return ApiResponse.ok(res, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    items: result.items.map(mapReceiptListItem),
  });
});

export const getReceiptDetail = asyncHandler(async (req, res) => {
  const detail = await ReceiptService.getReceiptDetail(req.params.id);

  if (!detail) {
    throw new ApiError(404, 'NOT_FOUND', 'Purchase receipt not found');
  }

  return ApiResponse.ok(res, {
    receipt: mapReceiptHeader(detail.header),
    items: detail.items.map(mapReceiptItem),
  });
});
