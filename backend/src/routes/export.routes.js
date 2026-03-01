import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import {
  exportItemsXlsx,
  exportItemsCsv,
  exportTransactionsXlsx,
  exportAuditXlsx,
  exportIssuanceXlsx,
  exportDashboardSummaryXlsx,
} from "../controllers/export.controller.js";

const r = Router();

r.use(requireAuth, requireRole("ADMIN", "STAFF"));

r.get("/items.xlsx", exportItemsXlsx);
r.get("/items.csv", exportItemsCsv);
r.get("/issuance.xlsx", exportIssuanceXlsx);
r.get("/transactions.xlsx", exportTransactionsXlsx);
r.get("/audit.xlsx", exportAuditXlsx);
r.get("/dashboard-summary.xlsx", exportDashboardSummaryXlsx);

export default r;