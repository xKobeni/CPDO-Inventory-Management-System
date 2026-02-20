import mongoose from "mongoose";

const TxItemSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const AccountablePersonSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    position: { type: String, trim: true, default: "" },
    office: { type: String, trim: true, default: "CPDC" },
  },
  { _id: false }
);

const TransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["STOCK_IN", "ISSUANCE", "ASSET_ASSIGN", "ASSET_RETURN", "ASSET_TRANSFER"],
      required: true,
      index: true
    },

    items: { type: [TxItemSchema], required: true },

    // Single source of truth for "who" – item picks this up
    accountablePerson: { type: AccountablePersonSchema, default: () => ({}) },

    // for ISSUANCE (kept for backward compatibility; mirrored in accountablePerson)
    issuedToOffice: { type: String, trim: true },
    issuedToPerson: { type: String, trim: true },
    purpose: { type: String, trim: true },

    // for STOCK_IN
    supplier: { type: String, trim: true },
    referenceNo: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", TransactionSchema);