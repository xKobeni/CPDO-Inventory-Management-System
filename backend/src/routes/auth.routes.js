import { Router } from "express";
import { authLimiter } from "../middleware/rateLimit.js";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import {
  loginSchema,
  login,
  refresh,
  logout,
  verifyEmailSchema,
  verifyEmail,
  resendVerificationSchema,
  resendVerification,
  forgotPasswordSchema,
  forgotPassword,
  resetPasswordSchema,
  resetPassword,
  getMe,
  updateProfileSchema,
  updateProfile,
  changePasswordSchema,
  changePassword,
} from "../controllers/auth.controller.js";

const r = Router();

r.post("/login", authLimiter, validateBody(loginSchema), login);
r.post("/refresh", authLimiter, refresh);
r.post("/logout", requireAuth, logout);

r.post("/verify-email", authLimiter, validateBody(verifyEmailSchema), verifyEmail);
r.post("/resend-verification", authLimiter, validateBody(resendVerificationSchema), resendVerification);
r.post("/forgot-password", authLimiter, validateBody(forgotPasswordSchema), forgotPassword);
r.post("/reset-password", authLimiter, validateBody(resetPasswordSchema), resetPassword);

// Profile management
r.get("/me", requireAuth, getMe);
r.put("/profile", requireAuth, validateBody(updateProfileSchema), updateProfile);
r.post("/change-password", requireAuth, validateBody(changePasswordSchema), changePassword);

export default r;