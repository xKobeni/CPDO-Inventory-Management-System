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

export default mongoose.model("AuditLog", AuditLogSchema);