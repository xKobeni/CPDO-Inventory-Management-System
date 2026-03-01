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
  exportBackupXlsx,
  exportBackupJson,
  exportBackupCsv,
} from "../controllers/export.controller.js";

const r = Router();

r.use(requireAuth, requireRole("ADMIN", "STAFF"));

r.get("/items.xlsx", exportItemsXlsx);
r.get("/items.csv", exportItemsCsv);
r.get("/issuance.xlsx", exportIssuanceXlsx);
r.get("/transactions.xlsx", exportTransactionsXlsx);
r.get("/audit.xlsx", exportAuditXlsx);
r.get("/dashboard-summary.xlsx", exportDashboardSummaryXlsx);
r.get("/backup.xlsx", exportBackupXlsx);
r.get("/backup.json", exportBackupJson);
r.get("/backup.csv", exportBackupCsv);

export default r;