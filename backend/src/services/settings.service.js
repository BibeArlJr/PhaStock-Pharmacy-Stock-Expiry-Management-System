import Settings from '../models/Settings.js';

export const getSettings = async () => {
  let settings = await Settings.findOne();

  if (!settings) {
    settings = await Settings.create({});
  }

  return settings;
};

export const updateSettings = async (payload, userId) =>
  Settings.findOneAndUpdate(
    {},
    {
      ...payload,
      updatedBy: userId,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );
