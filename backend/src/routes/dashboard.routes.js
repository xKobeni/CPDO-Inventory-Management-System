import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import {
  getDashboardSummary,
  getCategories,
  getItemHistory,
} from "../controllers/dashboard.controller.js";

const r = Router();

r.get("/summary", requireAuth, requireRole("ADMIN", "STAFF"), getDashboardSummary);
r.get("/categories", requireAuth, requireRole("ADMIN", "STAFF"), getCategories);
r.get("/item/:id/history", requireAuth, requireRole("ADMIN", "STAFF"), getItemHistory);

export default r;