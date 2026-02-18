import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import {
  exportItemsXlsx,
  exportItemsCsv,
  exportTransactionsXlsx,
  exportAuditXlsx,
} from "../controllers/export.controller.js";

const r = Router();

r.use(requireAuth, requireRole("ADMIN", "STAFF"));

r.get("/items.xlsx", exportItemsXlsx);
r.get("/items.csv", exportItemsCsv);
r.get("/transactions.xlsx", exportTransactionsXlsx);
r.get("/audit.xlsx", exportAuditXlsx);

export default r;