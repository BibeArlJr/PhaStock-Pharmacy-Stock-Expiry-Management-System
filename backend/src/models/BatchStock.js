const mongoose = require('mongoose');
const { Schema } = mongoose;

const batchStockSchema = new Schema(
  {
    pharmacyId: {
      type: Schema.Types.ObjectId,
      ref: 'Pharmacy',
      index: true,
    },
    medicineId: {
      type: Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },
    pack: {
      type: String,
      required: true,
      trim: true,
    },
    batchNo: {
      type: String,
      required: true,
      trim: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    availableBoxes: {
      type: Number,
      required: true,
      min: 0,
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    mrp: {
      type: Number,
      required: true,
      min: 0,
    },
    source: {
      type: String,
      enum: ['receipt', 'manual'],
      default: 'receipt',
    },
    sourceType: {
      type: String,
      enum: ['receipt', 'manual'],
      default: 'receipt',
      index: true,
    },
    sourceReceiptId: {
      type: Schema.Types.ObjectId,
      ref: 'PurchaseReceipt',
      required: false,
    },
    sourceReceiptItemId: {
      type: Schema.Types.ObjectId,
      ref: 'PurchaseReceiptItem',
      required: false,
    },
    sourceManualEntryId: {
      type: Schema.Types.ObjectId,
      required: false,
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

batchStockSchema.index({ pharmacyId: 1, medicineId: 1, pack: 1, batchNo: 1, expiryDate: 1 }, { unique: true });
batchStockSchema.index({ medicineId: 1, expiryDate: 1 });
batchStockSchema.index({ expiryDate: 1 });
batchStockSchema.index({ availableBoxes: 1 });

const BatchStock = mongoose.model('BatchStock', batchStockSchema);

module.exports = BatchStock;
