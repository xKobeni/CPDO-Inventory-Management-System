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
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);