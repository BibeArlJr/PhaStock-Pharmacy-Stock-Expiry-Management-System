import mongoose from 'mongoose';

const { Schema } = mongoose;

const supplierSchema = new Schema(
  {
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
  },
  {
    timestamps: true,
  }
);

supplierSchema.index({ name: 1 });

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;
