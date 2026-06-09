const Settings = require('../models/Settings.js');
const getSettings = async (pharmacyId) => {
  let settings = await Settings.findOne({ pharmacyId });

  if (!settings) {
    settings = await Settings.create({ pharmacyId });
  }

  return settings;
};
const updateSettings = async (payload, userId, pharmacyId) => {
  const updateObj = {};

  if (payload.lowStockLimitBoxes !== undefined) updateObj.lowStockLimitBoxes = payload.lowStockLimitBoxes;
  if (payload.expiryAlertDays !== undefined) updateObj.expiryAlertDays = payload.expiryAlertDays;

  if (payload.fefo_mode !== undefined) updateObj.fefoMode = payload.fefo_mode;
  if (payload.default_page_size !== undefined) updateObj.defaultPageSize = payload.default_page_size;

  if (payload.fefoMode !== undefined) updateObj.fefoMode = payload.fefoMode;
  if (payload.defaultPageSize !== undefined) updateObj.defaultPageSize = payload.defaultPageSize;

  return Settings.findOneAndUpdate(
    { pharmacyId },
    {
      ...updateObj,
      pharmacyId,
      updatedBy: userId,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );
};

module.exports = { getSettings, updateSettings };
