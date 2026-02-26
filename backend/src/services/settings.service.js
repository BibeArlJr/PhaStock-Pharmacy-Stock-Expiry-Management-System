import Settings from '../models/Settings.js';

export const getSettings = async (pharmacyId) => {
  let settings = await Settings.findOne({ pharmacyId });

  if (!settings) {
    settings = await Settings.create({ pharmacyId });
  }

  return settings;
};

export const updateSettings = async (payload, userId, pharmacyId) =>
  Settings.findOneAndUpdate(
    { pharmacyId },
    {
      ...payload,
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
