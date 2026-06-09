const ReceiptService = require('../services/receipt.service.js');
const ApiError = require('../utils/ApiError.js');
const ApiResponse = require('../utils/ApiResponse.js');
const asyncHandler = require('../utils/asyncHandler.js');
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
        phone: header.supplier.phone || '',
        address: header.supplier.address || '',
      }
    : null,
  invoice_number: header.invoiceNumber,
  invoice_date: header.invoiceDate.toISOString(),
  payment_mode: header.paymentMode,
  receipt_type: header.receiptType,
  total_amount: header.totalAmount || 0,
  discount_amount: header.discountAmount || 0,
  net_amount: header.netAmount || 0,
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

const mapReceiptPayload = (body) => ({
  header: {
    supplierId: body.supplier_id,
    invoiceNumber: body.invoice_number,
    invoiceDate: body.invoice_date,
    paymentMode: body.payment_mode,
    receiptType: body.receipt_type,
    discountAmount: body.discount_amount,
  },
  items: body.items.map((item) => ({
    medicineId: item.medicine_id,
    pack: item.pack,
    batchNo: item.batch_no,
    expiryDate: item.expiry_date,
    quantityBoxes: item.quantity_boxes,
    purchasePrice: item.purchase_price,
    mrp: item.mrp,
  })),
});
const createReceipt = asyncHandler(async (req, res) => {
  const payload = {
    ...mapReceiptPayload(req.body),
    userId: req.user.id,
    pharmacyId: req.user?.pharmacy?.id,
  };

  const result = await ReceiptService.createReceipt(payload);

  return ApiResponse.created(res, {
    receipt_id: result.receiptId,
    batch_updates: result.batchUpdates,
  });
});
const updateReceipt = asyncHandler(async (req, res) => {
  const result = await ReceiptService.updateReceipt({
    id: req.params.id,
    ...mapReceiptPayload(req.body),
    pharmacyId: req.user?.pharmacy?.id,
  });

  return ApiResponse.ok(res, {
    receipt_id: result.receiptId,
    message: 'Receipt updated',
  });
});
const deleteReceipt = asyncHandler(async (req, res) => {
  const result = await ReceiptService.deleteReceipt({
    id: req.params.id,
    pharmacyId: req.user?.pharmacy?.id,
  });

  return ApiResponse.ok(res, {
    receipt_id: result.receiptId,
    message: 'Receipt deleted',
  });
});
const deleteReceiptsBulk = asyncHandler(async (req, res) => {
  const result = await ReceiptService.deleteReceiptsBulk({
    ids: req.body.ids,
    pharmacyId: req.user?.pharmacy?.id,
  });

  return ApiResponse.ok(res, {
    deleted_count: result.deletedCount,
    deleted_ids: result.deletedIds,
    message: 'Receipts deleted',
  });
});
const listReceipts = asyncHandler(async (req, res) => {
  const result = await ReceiptService.listReceipts({
    pharmacyId: req.user?.pharmacy?.id,
    supplierId: req.query.supplier_id,
    invoiceNumber: req.query.invoice_number,
    q: req.query.q,
    batchNo: req.query.batch_no,
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
const getReceiptDetail = asyncHandler(async (req, res) => {
  const detail = await ReceiptService.getReceiptDetail(req.params.id, req.user?.pharmacy?.id);

  if (!detail) {
    throw new ApiError(404, 'NOT_FOUND', 'Purchase receipt not found');
  }

  return ApiResponse.ok(res, {
    receipt: mapReceiptHeader(detail.header),
    items: detail.items.map(mapReceiptItem),
  });
});

module.exports = { createReceipt, updateReceipt, deleteReceipt, deleteReceiptsBulk, listReceipts, getReceiptDetail };
