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
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);