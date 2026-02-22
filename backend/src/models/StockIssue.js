import mongoose from 'mongoose';

const { Schema } = mongoose;

const stockIssueSchema = new Schema(
  {
    batchStockId: {
      type: Schema.Types.ObjectId,
      ref: 'BatchStock',
      required: true,
    },
    issuedBoxes: {
      type: Number,
      required: true,
      min: 1,
    },
    issuedDate: {
      type: Date,
      required: true,
    },
    remark: {
      type: String,
      trim: true,
      default: '',
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

stockIssueSchema.index({ batchStockId: 1, issuedDate: -1 });
stockIssueSchema.index({ issuedDate: -1 });

const StockIssue = mongoose.model('StockIssue', stockIssueSchema);

export default StockIssue;
