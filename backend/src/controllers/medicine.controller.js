const MedicineService = require('../services/medicine.service.js');
const ApiError = require('../utils/ApiError.js');
const ApiResponse = require('../utils/ApiResponse.js');
const asyncHandler = require('../utils/asyncHandler.js');
const toMedicineResponse = (medicine) => ({
  id: medicine._id.toString(),
  name: medicine.name,
  strength: medicine.strength || '',
  category: medicine.category || '',
  notes: medicine.notes || '',
  created_at: medicine.createdAt.toISOString(),
  updated_at: medicine.updatedAt.toISOString(),
});
const createMedicine = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?._id;
  const pharmacyId = req.user?.pharmacy?.id || null;
  const medicine = await MedicineService.createMedicine(req.body, userId, pharmacyId);
  return ApiResponse.created(res, toMedicineResponse(medicine));
});
const listMedicines = asyncHandler(async (req, res) => {
  const pharmacyId = req.user?.pharmacy?.id || null;
  const result = await MedicineService.listMedicines(req.query, pharmacyId);

  return ApiResponse.ok(res, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    total_pages: result.total_pages,
    items: result.items.map(toMedicineResponse),
  });
});
const getMedicineById = asyncHandler(async (req, res) => {
  const pharmacyId = req.user?.pharmacy?.id || null;
  const medicine = await MedicineService.getMedicineById(req.params.id, pharmacyId);

  return ApiResponse.ok(res, toMedicineResponse(medicine));
});
const patchMedicine = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?._id;
  const pharmacyId = req.user?.pharmacy?.id || null;
  const medicine = await MedicineService.updateMedicine(req.params.id, req.body, userId, pharmacyId);

  return ApiResponse.ok(res, toMedicineResponse(medicine));
});
const deleteMedicine = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?._id;
  const pharmacyId = req.user?.pharmacy?.id || null;
  await MedicineService.deleteMedicine(req.params.id, userId, pharmacyId);

  return ApiResponse.ok(res, { deleted: true, message: 'Medicine deleted' });
});

module.exports = { createMedicine, listMedicines, getMedicineById, patchMedicine, deleteMedicine };
