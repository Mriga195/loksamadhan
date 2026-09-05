const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['forgot-password', 'signup'],
      required: true,
      default: 'forgot-password',
    },
    attempts: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // MongoDB TTL index: automatically deletes document after 10 minutes (600s)
    },
  },
  { timestamps: false }
);

module.exports = mongoose.model('Otp', otpSchema);
