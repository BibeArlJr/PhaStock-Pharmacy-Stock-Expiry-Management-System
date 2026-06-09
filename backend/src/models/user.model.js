const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    pharmacyId: {
      type: mongoose.Schema.Types.ObjectId,
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
)

const User = mongoose.models.User || mongoose.model('User', userSchema)

module.exports = User

