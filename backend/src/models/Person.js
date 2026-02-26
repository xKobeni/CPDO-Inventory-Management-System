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

// Additional indexes for performance
PersonSchema.index({ office: 1, isActive: 1 });
PersonSchema.index({ createdAt: -1 });
PersonSchema.index({ name: "text" }); // Text search

export default mongoose.model("Person", PersonSchema);

