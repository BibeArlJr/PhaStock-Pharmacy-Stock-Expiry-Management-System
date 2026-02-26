import mongoose from 'mongoose';

const { Schema } = mongoose;

const stockIssueItemSchema = new Schema(
  {
    medicineId: {
      type: Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },
    medicineNameSnapshot: {
      type: String,
      trim: true,
      default: '',
    },
    strengthSnapshot: {
      type: String,
      trim: true,
      default: '',
    },
    batchStockId: {
      type: Schema.Types.ObjectId,
      ref: 'BatchStock',
      required: true,
    },
    batchNoSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    expiryDateSnapshot: {
      type: Date,
      required: true,
    },
    qtyBoxes: {
      type: Number,
      required: true,
      min: 1,
    },
    availableBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    availableAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    rate: {
      type: Number,
      min: 0,
    },
    amount: {
      type: Number,
      min: 0,
    },
  },
  { _id: false }
);

const stockIssueSchema = new Schema(
  {
    issueNo: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    issueDate: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'VOID'],
      default: 'ACTIVE',
      index: true,
    },
    fromStoreId: {
      type: Schema.Types.ObjectId,
      ref: 'Pharmacy',
    },
    toStoreId: {
      type: Schema.Types.ObjectId,
      ref: 'Pharmacy',
    },
    totalQty: {
      type: Number,
      min: 0,
      required: true,
    },
    totalAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    voidedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    voidReason: {
      type: String,
    },
    voidedAt: {
      type: Date,
    },
    items: {
      type: [stockIssueItemSchema],
      required: true,
      default: [],
      validate: [(arr) => arr.length > 0, 'At least one item is required'],
    },
  },
  {
    timestamps: true,
  }
);

const StockIssue = mongoose.model('StockIssue', stockIssueSchema);

export default StockIssue;
