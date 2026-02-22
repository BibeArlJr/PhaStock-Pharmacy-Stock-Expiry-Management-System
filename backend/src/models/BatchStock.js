import mongoose from 'mongoose';

const { Schema } = mongoose;

const batchStockSchema = new Schema(
  {
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
  },
  {
    timestamps: true,
  }
);

batchStockSchema.index({ medicineId: 1, pack: 1, batchNo: 1, expiryDate: 1 }, { unique: true });
batchStockSchema.index({ medicineId: 1, expiryDate: 1 });
batchStockSchema.index({ expiryDate: 1 });
batchStockSchema.index({ availableBoxes: 1 });

const BatchStock = mongoose.model('BatchStock', batchStockSchema);

export default BatchStock;
