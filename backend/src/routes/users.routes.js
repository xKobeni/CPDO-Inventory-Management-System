import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { validateBody } from "../middleware/validate.js";
import {
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminResetPassword,
  adminDeactivateUser,
  adminActivateUser,
  adminDeleteUser,
  adminResendVerificationEmail,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  adminResetPasswordSchema,
} from "../controllers/users.controller.js";

const r = Router();

// Admin-only
r.use(requireAuth, requireRole("ADMIN"));

r.get("/", adminListUsers);
r.post("/", validateBody(adminCreateUserSchema), adminCreateUser);
r.put("/:id", validateBody(adminUpdateUserSchema), adminUpdateUser);

r.post("/:id/reset-password", validateBody(adminResetPasswordSchema), adminResetPassword);
r.post("/:id/resend-verification", adminResendVerificationEmail);

r.post("/:id/deactivate", adminDeactivateUser);
r.post("/:id/activate", adminActivateUser);
r.delete("/:id", adminDeleteUser);

export default r;