const mongoose = require('mongoose');
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
    fefoMode: {
      type: Boolean,
      default: true,
    },
    defaultPageSize: {
      type: Number,
      default: 20,
      min: 5,
      max: 100,
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

module.exports = Settings;
