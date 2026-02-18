import { Router } from "express";
import { authLimiter } from "../middleware/rateLimit.js";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { loginSchema, login, refresh, logout } from "../controllers/auth.controller.js";

const r = Router();

r.post("/login", authLimiter, validateBody(loginSchema), login);
r.post("/refresh", authLimiter, refresh);

// Make logout require access token (more reliable)
r.post("/logout", requireAuth, logout);

export default r;