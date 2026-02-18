import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { listTransactions, createStockIn, createIssuance } from "../controllers/transactions.controller.js";

const r = Router();

const txItemSchema = z.object({
  itemId: z.string().min(10),
  qty: z.number().int().min(1),
});

const stockInSchema = z.object({
  items: z.array(txItemSchema).min(1),
  supplier: z.string().max(200).optional(),
  referenceNo: z.string().max(80).optional(),
});

const issuanceSchema = z.object({
  items: z.array(txItemSchema).min(1),
  issuedToOffice: z.string().max(200),
  issuedToPerson: z.string().max(200).optional(),
  purpose: z.string().max(300).optional(),
});

r.get("/", requireAuth, listTransactions);

// only ADMIN/STAFF can create stock movements
r.post("/stock-in", requireAuth, requireRole("ADMIN", "STAFF"), validateBody(stockInSchema), createStockIn);
r.post("/issuance", requireAuth, requireRole("ADMIN", "STAFF"), validateBody(issuanceSchema), createIssuance);

export default r;