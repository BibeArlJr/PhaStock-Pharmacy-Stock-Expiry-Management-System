const SupplierService = require('../services/supplier.service.js');
const ApiError = require('../utils/ApiError.js');
const ApiResponse = require('../utils/ApiResponse.js');
const asyncHandler = require('../utils/asyncHandler.js');
const toSupplierResponse = (supplier) => ({
  id: supplier._id.toString(),
  name: supplier.name,
  phone: supplier.phone || '',
  email: supplier.email || '',
  address: supplier.address || '',
  pan_vat: supplier.panVat || '',
  notes: supplier.notes || '',
  status: supplier.status || 'active',
  created_at: supplier.createdAt.toISOString(),
  updated_at: supplier.updatedAt.toISOString(),
});
const createSupplier = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?._id;
  const pharmacyId = req.user?.pharmacy?.id || null;
  const supplier = await SupplierService.createSupplier(req.body, userId, pharmacyId);
  return ApiResponse.created(res, toSupplierResponse(supplier));
});
const listSuppliers = asyncHandler(async (req, res) => {
  const pharmacyId = req.user?.pharmacy?.id || null;
  const result = await SupplierService.listSuppliers(req.query, pharmacyId);

  return ApiResponse.ok(res, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    total_pages: result.total_pages,
    items: result.items.map(toSupplierResponse),
  });
});
const getSupplierById = asyncHandler(async (req, res) => {
  const pharmacyId = req.user?.pharmacy?.id || null;
  const supplier = await SupplierService.getSupplierById(req.params.id, pharmacyId);

  return ApiResponse.ok(res, toSupplierResponse(supplier));
});
const patchSupplier = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?._id;
  const pharmacyId = req.user?.pharmacy?.id || null;
  const supplier = await SupplierService.updateSupplier(req.params.id, req.body, userId, pharmacyId);

  return ApiResponse.ok(res, toSupplierResponse(supplier));
});
const deleteSupplier = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?._id;
  const pharmacyId = req.user?.pharmacy?.id || null;
  await SupplierService.deleteSupplier(req.params.id, userId, pharmacyId);

  return ApiResponse.ok(res, { deleted: true, message: 'Supplier deleted' });
});

module.exports = { createSupplier, listSuppliers, getSupplierById, patchSupplier, deleteSupplier };
