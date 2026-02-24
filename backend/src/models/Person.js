import mongoose from "mongoose";

const PersonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    position: { type: String, trim: true, default: "" },
    office: { type: String, trim: true, default: "CPDC" },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Avoid duplicates (case-insensitive)
PersonSchema.index({ name: 1 }, { unique: true });

export default mongoose.model("Person", PersonSchema);

