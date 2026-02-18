import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { importItems } from "../controllers/import.controller.js";

const r = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

r.post("/items", requireAuth, requireRole("ADMIN", "STAFF"), upload.single("file"), importItems);

export default r;