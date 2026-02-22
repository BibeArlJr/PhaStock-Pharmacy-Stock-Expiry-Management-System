import mongoose from 'mongoose';

const { Schema } = mongoose;

const medicineSchema = new Schema(
  {
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
  },
  {
    timestamps: true,
  }
);

medicineSchema.index({ name: 1 });

const Medicine = mongoose.model('Medicine', medicineSchema);

export default Medicine;
