import { Router } from "express";
import { authLimiter } from "../middleware/rateLimit.js";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { setCsrfToken, addCsrfToResponse } from "../middleware/csrf.js";
import {
  loginSchema,
  login,
  refresh,
  logout,
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

// Login and refresh provide new CSRF tokens
r.post("/login", authLimiter, validateBody(loginSchema), setCsrfToken, addCsrfToResponse, login);
r.post("/refresh", authLimiter, setCsrfToken, addCsrfToResponse, refresh);
r.post("/logout", requireAuth, logout);

r.get("/verify-email", verifyEmail);
r.post("/resend-verification", authLimiter, validateBody(resendVerificationSchema), resendVerification);
r.post("/forgot-password", authLimiter, validateBody(forgotPasswordSchema), forgotPassword);
r.post("/reset-password", authLimiter, validateBody(resetPasswordSchema), resetPassword);

// Profile management
r.get("/me", requireAuth, getMe);
r.put("/profile", requireAuth, validateBody(updateProfileSchema), updateProfile);
r.post("/change-password", requireAuth, validateBody(changePasswordSchema), changePassword);

export default r;