import mongoose from 'mongoose';

const { Schema } = mongoose;

const emailVerificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

emailVerificationSchema.index({ expiresAt: 1 });

const EmailVerification = mongoose.model('EmailVerification', emailVerificationSchema);

export default EmailVerification;
