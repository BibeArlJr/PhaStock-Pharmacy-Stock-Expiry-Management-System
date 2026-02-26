import mongoose from 'mongoose';

import BatchStock from '../models/BatchStock.js';
import asyncHandler from '../utils/asyncHandler.js';

// TODO: remove after pharmacyId migration is fully completed.
export const getBatchStockCountDebug = asyncHandler(async (req, res) => {
  const pharmacyId = req.user?.pharmacy?.id || null;

  const totalForPharmacy = pharmacyId
    ? await BatchStock.countDocuments({
        pharmacyId: new mongoose.Types.ObjectId(pharmacyId),
      })
    : 0;

  const totalLegacyMissingPharmacyId = await BatchStock.countDocuments({
    $or: [{ pharmacyId: { $exists: false } }, { pharmacyId: null }],
  });

  return res.status(200).json({
    pharmacyId,
    totalForPharmacy,
    totalLegacyMissingPharmacyId,
  });
});
