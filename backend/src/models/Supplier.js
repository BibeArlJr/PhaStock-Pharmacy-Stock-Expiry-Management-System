const mongoose = require('mongoose');
const { Schema } = mongoose;

const supplierSchema = new Schema(
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
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    panVat: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

supplierSchema.index({ name: 1 });
supplierSchema.index({ phone: 1 });
supplierSchema.index({ email: 1 });
supplierSchema.index({ name: 1, phone: 1, email: 1 });
supplierSchema.index({ pharmacyId: 1, name: 1 });

const Supplier = mongoose.model('Supplier', supplierSchema);

module.exports = Supplier;
