import mongoose from 'mongoose';

const { Schema } = mongoose;

const settingsSchema = new Schema(
  {
    pharmacyId: {
      type: Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
      unique: true,
    },
    lowStockLimitBoxes: {
      type: Number,
      default: 2,
      min: 0,
    },
    expiryAlertDays: {
      type: Number,
      default: 30,
      min: 0,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
