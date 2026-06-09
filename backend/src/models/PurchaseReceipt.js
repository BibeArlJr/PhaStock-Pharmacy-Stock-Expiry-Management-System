const mongoose = require('mongoose');
const { Schema } = mongoose;

const purchaseReceiptSchema = new Schema(
  {
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
    },
    paymentMode: {
      type: String,
      enum: ['CASH', 'CREDIT', 'BANK', 'OTHER'],
      required: true,
    },
    receiptType: {
      type: String,
      enum: ['NORMAL_PURCHASE', 'RETURN_CREDIT'],
      required: true,
    },
    totalAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    netAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

purchaseReceiptSchema.index({ supplierId: 1, invoiceNumber: 1 }, { unique: true });
purchaseReceiptSchema.index({ invoiceDate: -1 });

const PurchaseReceipt = mongoose.model('PurchaseReceipt', purchaseReceiptSchema);

module.exports = PurchaseReceipt;
