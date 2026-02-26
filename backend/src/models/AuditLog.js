import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true }, // e.g. "ITEM_CREATE", "LOGIN"
    targetType: { type: String, default: null },
    targetId: { type: String, default: null },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

// Indexes for performance
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1 });
AuditLogSchema.index({ createdAt: -1 });

export default mongoose.model("AuditLog", AuditLogSchema);