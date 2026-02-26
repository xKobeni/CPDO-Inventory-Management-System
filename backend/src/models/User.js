import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: ["ADMIN", "STAFF", "REQUESTER"],
      default: "STAFF",
      index: true,
    },

    refreshTokenHash: { type: String, default: null },
    isActive: { type: Boolean, default: true },

    // Email verification (OTP) – required for new admin-created accounts before first login
    isVerified: { type: Boolean, default: true },
    emailVerificationOtpHash: { type: String, default: null },
    emailVerificationOtpExpires: { type: Date, default: null },

    // User-initiated password reset (forgot password flow, OTP)
    passwordResetOtpHash: { type: String, default: null },
    passwordResetOtpExpires: { type: Date, default: null },

    // Account lockout for failed login attempts
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes for performance (note: email has unique constraint, role has inline index)
UserSchema.index({ isActive: 1 });
UserSchema.index({ isVerified: 1 });
UserSchema.index({ createdAt: -1 });

// Virtual for checking if account is locked
UserSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Method to increment login attempts
UserSchema.methods.incLoginAttempts = function () {
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

  // If lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  // Increment attempts
  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account if max attempts reached
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
UserSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0, lastLoginAt: new Date() },
    $unset: { lockUntil: 1 },
  });
};

export default mongoose.model("User", UserSchema);