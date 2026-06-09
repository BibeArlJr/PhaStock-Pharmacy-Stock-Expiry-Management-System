const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    pharmacyId: {
      type: Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordToken: { type: String, default: undefined },
    resetPasswordExpire: { type: Date, default: undefined },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.getResetPasswordToken = function () {
  const crypto = require('crypto')
  const rawToken = crypto.randomBytes(32).toString('hex')
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex')
  this.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000)
  return rawToken
}

const User = mongoose.model('User', userSchema);

module.exports = User;
