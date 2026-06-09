const mongoose = require('mongoose');const BatchStock = require('../models/BatchStock.js');
const asyncHandler = require('../utils/asyncHandler.js');
// TODO: remove after pharmacyId migration is fully completed.
const getBatchStockCountDebug = asyncHandler(async (req, res) => {
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

module.exports = { getBatchStockCountDebug };
