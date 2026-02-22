import mongoose from 'mongoose';

const { Schema } = mongoose;

const purchaseReceiptItemSchema = new Schema(
  {
    receiptId: {
      type: Schema.Types.ObjectId,
      ref: 'PurchaseReceipt',
      required: true,
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
    quantityBoxes: {
      type: Number,
      required: true,
      min: 1,
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
  },
  {
    timestamps: true,
  }
);

purchaseReceiptItemSchema.index({ receiptId: 1 });
purchaseReceiptItemSchema.index({ medicineId: 1, batchNo: 1, pack: 1, expiryDate: 1 });
purchaseReceiptItemSchema.index({ batchNo: 1 });
purchaseReceiptItemSchema.index({ expiryDate: 1 });

const PurchaseReceiptItem = mongoose.model('PurchaseReceiptItem', purchaseReceiptItemSchema);

export default PurchaseReceiptItem;
