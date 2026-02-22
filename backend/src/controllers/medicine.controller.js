import * as MedicineService from '../services/medicine.service.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const toMedicineResponse = (medicine) => ({
  id: medicine._id.toString(),
  name: medicine.name,
  strength: medicine.strength || '',
  category: medicine.category || '',
  created_at: medicine.createdAt.toISOString(),
  updated_at: medicine.updatedAt.toISOString(),
});

export const createMedicine = asyncHandler(async (req, res) => {
  const medicine = await MedicineService.createMedicine(req.body);
  return ApiResponse.created(res, toMedicineResponse(medicine));
});

export const listMedicines = asyncHandler(async (req, res) => {
  const result = await MedicineService.listMedicines(req.query);

  return ApiResponse.ok(res, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    items: result.items.map(toMedicineResponse),
  });
});

export const getMedicineById = asyncHandler(async (req, res) => {
  const medicine = await MedicineService.getMedicineById(req.params.id);

  if (!medicine) {
    throw new ApiError(404, 'NOT_FOUND', 'Medicine not found');
  }

  return ApiResponse.ok(res, toMedicineResponse(medicine));
});

export const patchMedicine = asyncHandler(async (req, res) => {
  const medicine = await MedicineService.updateMedicine(req.params.id, req.body);

  if (!medicine) {
    throw new ApiError(404, 'NOT_FOUND', 'Medicine not found');
  }

  return ApiResponse.ok(res, toMedicineResponse(medicine));
});
