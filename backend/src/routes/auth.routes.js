import { Router } from "express";
import { validateBody } from "../middleware/validate.js";
import { registerSchema, loginSchema, register, login, refresh, logout } from "../controllers/auth.controller.js";

const r = Router();

//r.post("/register", validateBody(registerSchema), register);
r.post("/login", validateBody(loginSchema), login);
r.post("/refresh", refresh);
r.post("/logout", logout);

export default r;