const mongoose = require('mongoose');
const { Schema } = mongoose;

const medicineSchema = new Schema(
  {
    pharmacyId: {
      type: Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    strength: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

medicineSchema.index({ name: 1 });
medicineSchema.index({ strength: 1 });
medicineSchema.index({ category: 1 });
medicineSchema.index({ name: 1, strength: 1, category: 1 });
medicineSchema.index({ pharmacyId: 1, name: 1, strength: 1, category: 1 });

const Medicine = mongoose.model('Medicine', medicineSchema);

module.exports = Medicine;
