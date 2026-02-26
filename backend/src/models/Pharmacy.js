import mongoose from 'mongoose';

const { Schema } = mongoose;

const pharmacySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

pharmacySchema.index({ name: 1 });

const Pharmacy = mongoose.model('Pharmacy', pharmacySchema);

export default Pharmacy;
