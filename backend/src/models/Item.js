import mongoose from "mongoose";

const AccountablePersonSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    position: { type: String, trim: true, default: "" },
    office: { type: String, trim: true, default: "CPDC" },
  },
  { _id: false }
);

const ItemSchema = new mongoose.Schema(
  {
    // SUPPLY vs ASSET
    itemType: {
      type: String,
      enum: ["SUPPLY", "ASSET"],
      default: "SUPPLY",
      index: true,
    },

    // Identification
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "General", trim: true, index: true },

    // Common fields
    unit: { type: String, default: "pc", trim: true },
    dateAcquired: { type: Date, default: null },
    unitCost: { type: Number, default: 0, min: 0 }, // amount

    remarks: { type: String, trim: true, default: "" },
    isArchived: { type: Boolean, default: false, index: true },

    // SUPPLY fields
    reorderLevel: { type: Number, default: 0, min: 0 },
    quantityOnHand: { type: Number, default: 0, min: 0 },

    // ASSET fields
    propertyNumber: { type: String, trim: true, default: null }, // unique for assets
    serialNumber: { type: String, trim: true, default: null },   // optional
    brand: { type: String, trim: true, default: "" },
    model: { type: String, trim: true, default: "" },

    location: { type: String, trim: true, default: "" },

    accountablePerson: { type: AccountablePersonSchema, default: () => ({}) },
    assignedDate: { type: Date, default: null },
    returnedDate: { type: Date, default: null },

    status: {
      type: String,
      enum: ["IN_STOCK", "DEPLOYED", "FOR_REPAIR", "DISPOSED", "LOST"],
      default: "IN_STOCK",
      index: true,
    },
    condition: {
      type: String,
      enum: ["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"],
      default: "GOOD",
      index: true,
    },
  },
  { timestamps: true }
);

// Unique-ish constraints (sparse allows nulls)
ItemSchema.index({ propertyNumber: 1 }, { unique: true, sparse: true });
ItemSchema.index({ serialNumber: 1 }, { unique: true, sparse: true });

export default mongoose.model("Item", ItemSchema);