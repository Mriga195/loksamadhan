const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'citizen' },
    department: { type: String, default: null },
  },
  { timestamps: true }
);

// ── Instance methods ──


/** Compare plaintext password against stored hash */
userSchema.methods.comparePassword = function (plaintext) {
  return bcrypt.compare(plaintext, this.passwordHash);
};

/**
 * Public-safe projection — strips passwordHash and sensitive fields.
 * Used in all public API responses (Hard Rule #3).
 */
userSchema.methods.toPublic = function () {
  return {
    _id: this._id,
    name: this.name,
    role: this.role,
    department: this.department,
  };
};

// ── Static helpers ──

/** Hash a plaintext password (use before saving a new user) */
userSchema.statics.hashPassword = function (plaintext) {
  return bcrypt.hash(plaintext, 10);
};

module.exports = mongoose.model('User', userSchema);
