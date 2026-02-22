import * as SupplierService from '../services/supplier.service.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const toSupplierResponse = (supplier) => ({
  id: supplier._id.toString(),
  name: supplier.name,
  phone: supplier.phone || '',
  address: supplier.address || '',
  created_at: supplier.createdAt.toISOString(),
  updated_at: supplier.updatedAt.toISOString(),
});

export const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await SupplierService.createSupplier(req.body);
  return ApiResponse.created(res, toSupplierResponse(supplier));
});

export const listSuppliers = asyncHandler(async (req, res) => {
  const result = await SupplierService.listSuppliers(req.query);

  return ApiResponse.ok(res, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    items: result.items.map(toSupplierResponse),
  });
});

export const getSupplierById = asyncHandler(async (req, res) => {
  const supplier = await SupplierService.getSupplierById(req.params.id);

  if (!supplier) {
    throw new ApiError(404, 'NOT_FOUND', 'Supplier not found');
  }

  return ApiResponse.ok(res, toSupplierResponse(supplier));
});

export const patchSupplier = asyncHandler(async (req, res) => {
  const supplier = await SupplierService.updateSupplier(req.params.id, req.body);

  if (!supplier) {
    throw new ApiError(404, 'NOT_FOUND', 'Supplier not found');
  }

  return ApiResponse.ok(res, toSupplierResponse(supplier));
});
