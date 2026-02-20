import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import {
  listItems,
  createItem,
  updateItem,
  archiveItem,
  lowStock,
  assignAsset,
  returnAsset,
  transferAsset,
} from "../controllers/items.controller.js";

const r = Router();

const accountableSchema = z.object({
  name: z.string().max(200).optional().default(""),
  position: z.string().max(200).optional().default(""),
  office: z.string().max(200).optional().default("CPDC"),
});

// Base shape without refinements so we can use .partial() for updates (Zod v4 disallows .partial() on refined schemas)
const itemSchemaShape = z.object({
  itemType: z.enum(["SUPPLY", "ASSET"]),

  sku: z.string().min(2).max(40).transform(s => s.toUpperCase().trim()),
  name: z.string().min(2).max(200),
  category: z.string().max(120).optional().default("General"),
  unit: z.string().max(30).optional().default("pc"),

  dateAcquired: z.string().datetime().optional().nullable().default(null),
  unitCost: z.number().min(0).optional().default(0),

  remarks: z.string().max(1000).optional().default(""),

  // SUPPLY fields
  quantityOnHand: z.number().int().min(0).optional().default(0),
  reorderLevel: z.number().int().min(0).optional().default(0),

  // ASSET fields
  propertyNumber: z.string().max(80).optional().nullable().default(null),
  serialNumber: z.string().max(120).optional().nullable().default(null),
  brand: z.string().max(120).optional().default(""),
  model: z.string().max(120).optional().default(""),
  location: z.string().max(200).optional().default(""),

  accountablePerson: z.object({
    name: z.string().max(200).optional().default(""),
    position: z.string().max(200).optional().default(""),
    office: z.string().max(200).optional().default("CPDC"),
  }).optional().default({}),

  status: z.enum(["IN_STOCK", "DEPLOYED", "FOR_REPAIR", "DISPOSED", "LOST"])
    .optional()
    .default("IN_STOCK"),

  condition: z.enum(["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"])
    .optional()
    .default("GOOD"),
});

const itemSchema = itemSchemaShape.superRefine((data, ctx) => {
  if (data.itemType === "ASSET") {
    if (!data.propertyNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "propertyNumber is required for ASSET items",
        path: ["propertyNumber"],
      });
    }
  }

  if (data.itemType === "SUPPLY") {
    if (data.propertyNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "propertyNumber must be empty for SUPPLY items",
        path: ["propertyNumber"],
      });
    }
  }
});

const itemUpdateSchema = itemSchemaShape.partial();

const assignSchema = z.object({
  accountablePerson: accountableSchema,
  location: z.string().max(200).optional().default(""),
  remarks: z.string().max(1000).optional().default(""),
  assignedDate: z.string().datetime().optional().nullable().default(null),
});

const returnSchema = z.object({
  remarks: z.string().max(1000).optional().default(""),
  returnedDate: z.string().datetime().optional().nullable().default(null),
});

const transferSchema = z.object({
  accountablePerson: accountableSchema,
  location: z.string().max(200).optional().default(""),
  remarks: z.string().max(1000).optional().default(""),
});

r.get("/", requireAuth, listItems);

// Supplies low-stock
r.get("/low-stock", requireAuth, requireRole("ADMIN", "STAFF"), lowStock);

// only ADMIN/STAFF can manage items
r.post("/", requireAuth, requireRole("ADMIN", "STAFF"), validateBody(itemSchema), createItem);
r.put("/:id", requireAuth, requireRole("ADMIN", "STAFF"), validateBody(itemUpdateSchema), updateItem);
r.post("/:id/archive", requireAuth, requireRole("ADMIN", "STAFF"), archiveItem);

// ASSET actions
r.post("/:id/assign", requireAuth, requireRole("ADMIN", "STAFF"), validateBody(assignSchema), assignAsset);
r.post("/:id/return", requireAuth, requireRole("ADMIN", "STAFF"), validateBody(returnSchema), returnAsset);
r.post("/:id/transfer", requireAuth, requireRole("ADMIN", "STAFF"), validateBody(transferSchema), transferAsset);

export default r;