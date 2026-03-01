import { z } from "zod";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { hashPassword, verifyPassword, hashToken, verifyTokenHash } from "../utils/hash.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken, signEmailVerificationToken, verifyEmailVerificationToken } from "../utils/jwt.js";
import {
  sendVerificationEmail,
  sendPasswordResetOtpEmail,
} from "../services/email.service.js";
import { verifyTurnstile } from "../utils/turnstile.js";

const VERIFICATION_OTP_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_OTP_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "STAFF", "REQUESTER"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  turnstileToken: z.string().min(1).optional(),
});

export const resendVerificationSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  otp: z.string().length(6).regex(/^\d+$/),
  newPassword: z.string().min(8),
});

function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export async function register(req, res) {
  const { name, email, password, role } = req.body;

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: "Email already in use" });

  // If you want ONLY admin-created users, remove this endpoint later.
  const user = await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: role || "STAFF",
  });

  await AuditLog.create({ actorId: user._id, action: "REGISTER", targetType: "User", targetId: user._id.toString() });

  res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
}

export async function login(req, res) {
  const { email, password, turnstileToken } = req.body;
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (secret) {
    if (!turnstileToken) {
      return res.status(400).json({ message: "Verification required. Please complete the challenge and try again." });
    }
    const { success, errorCodes } = await verifyTurnstile(secret, turnstileToken, req.ip);
    if (!success) {
      return res.status(400).json({
        message: "Verification failed. Please try again.",
        code: "TURNSTILE_FAILED",
        errorCodes,
      });
    }
  }

  const user = await User.findOne({ email });
  if (!user || !user.isActive) return res.status(401).json({ message: "Invalid credentials" });

  // Check if account is locked
  if (user.isLocked) {
    const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
    return res.status(423).json({
      message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingTime} minute(s).`,
      code: "ACCOUNT_LOCKED",
      remainingTime,
    });
  }

  if (!user.isVerified) {
    return res.status(403).json({
      message: "Please verify your email before signing in.",
      code: "NEEDS_VERIFICATION",
      email: user.email,
    });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    // Increment login attempts and potentially lock account
    await user.incLoginAttempts();
    
    // Reload user to get updated loginAttempts and lockUntil
    await user.reload();
    
    const attemptsLeft = 5 - user.loginAttempts;
    if (user.isLocked) {
      return res.status(423).json({
        message: "Too many failed login attempts. Your account has been temporarily locked for 15 minutes.",
        code: "ACCOUNT_LOCKED",
      });
    }
    
    if (attemptsLeft > 0 && attemptsLeft <= 2) {
      return res.status(401).json({
        message: `Invalid credentials. ${attemptsLeft} attempt(s) remaining before account lockout.`,
      });
    }
    
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // Reset login attempts on successful login
  await user.resetLoginAttempts();

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  // store hashed refresh token (NO nonce)
  user.refreshTokenHash = await hashToken(refreshToken);
  await user.save();

  res.cookie("refresh_token", refreshToken, refreshCookieOptions());

  await AuditLog.create({ actorId: user._id, action: "LOGIN", targetType: "User", targetId: user._id.toString() });

  res.json({
    accessToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
}

export async function refresh(req, res) {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ message: "Missing refresh token" });

  try {
    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive || !user.refreshTokenHash) {
      return res.status(401).json({ message: "Refresh denied" });
    }

    // VERIFY the refresh cookie matches the stored hash
    const ok = await verifyTokenHash(token, user.refreshTokenHash);
    if (!ok) return res.status(401).json({ message: "Refresh denied" });

    // ROTATE refresh token
    const accessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    user.refreshTokenHash = await hashToken(newRefreshToken);
    await user.save();

    res.cookie("refresh_token", newRefreshToken, refreshCookieOptions());
    res.json({ accessToken });
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
}

export async function logout(req, res) {
  let userId = null;

  // 1) Prefer refresh cookie
  const token = req.cookies?.refresh_token;
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      userId = payload.sub;
    } catch {
      // ignore invalid cookie
    }
  }

  // 2) Fallback: access token (if you have req.user from requireAuth)
  if (!userId && req.user?._id) {
    userId = req.user._id.toString();
  }

  if (userId) {
    await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
  }

  res.clearCookie("refresh_token", { path: "/api/auth/refresh" });
  res.json({ ok: true });
}

export async function verifyEmail(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: "Verification token is required." });
  }

  let payload;
  try {
    payload = verifyEmailVerificationToken(token);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Verification link expired. Please request a new one." });
    }
    return res.status(400).json({ message: "Invalid verification link." });
  }

  const user = await User.findById(payload.sub);
  if (!user) return res.status(400).json({ message: "User not found." });

  if (user.isVerified) {
    return res.status(200).json({ ok: true, message: "Email already verified. You can now sign in." });
  }

  // Verify the stored token matches (optional extra security check)
  if (user.emailVerificationToken && user.emailVerificationToken !== token) {
    return res.status(400).json({ message: "Invalid verification link." });
  }

  user.isVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationTokenExpires = null;
  await user.save();

  res.json({ ok: true, message: "Email verified successfully. You can now sign in." });
}

export async function resendVerification(req, res) {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    // Same response for security: don't reveal if email exists
    return res.json({ ok: true, message: "If that email is registered, a new verification link was sent." });
  }
  if (user.isVerified) {
    return res.json({ ok: true, message: "Account is already verified. You can sign in." });
  }

  const verificationToken = signEmailVerificationToken(user._id, user.email);
  user.emailVerificationToken = verificationToken;
  user.emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await user.save();

  try {
    await sendVerificationEmail(user.email, user.name, verificationToken);
  } catch (err) {
    console.error("Resend verification email failed:", err?.message || err);
    return res.status(500).json({ message: "Failed to send email. Try again later." });
  }

  res.json({ ok: true, message: "A new verification link was sent to your email." });
}

export async function forgotPassword(req, res) {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user || !user.isActive) {
    return res.json({ ok: true, message: "If that email is registered, you will receive a reset code." });
  }

  const otp = generateOtp();
  user.passwordResetOtpHash = await hashToken(otp);
  user.passwordResetOtpExpires = new Date(Date.now() + RESET_OTP_EXPIRY_MS);
  await user.save();

  try {
    await sendPasswordResetOtpEmail(user.email, user.name, otp);
  } catch (err) {
    console.error("Forgot password email failed:", err?.message || err);
    return res.status(500).json({ message: "Failed to send email. Try again later." });
  }

  res.json({ ok: true, message: "If that email is registered, you will receive a reset code." });
}

export async function resetPassword(req, res) {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email });
  if (!user || !user.isActive) {
    return res.status(400).json({ message: "Invalid email or OTP." });
  }
  if (!user.passwordResetOtpHash || !user.passwordResetOtpExpires) {
    return res.status(400).json({ message: "No reset requested or code expired. Request a new code." });
  }
  if (new Date() > user.passwordResetOtpExpires) {
    user.passwordResetOtpHash = null;
    user.passwordResetOtpExpires = null;
    await user.save();
    return res.status(400).json({ message: "Reset code expired. Please request a new one." });
  }

  const ok = await verifyTokenHash(otp, user.passwordResetOtpHash);
  if (!ok) return res.status(400).json({ message: "Invalid email or OTP." });

  user.passwordHash = await hashPassword(newPassword);
  user.passwordResetOtpHash = null;
  user.passwordResetOtpExpires = null;
  user.refreshTokenHash = null;
  await user.save();

  res.json({ ok: true, message: "Password reset. You can sign in with your new password." });
}

// Get current user profile
export async function getMe(req, res) {
  const user = await User.findById(req.user._id).select("_id name email role isActive isVerified createdAt");
  if (!user) return res.status(404).json({ message: "User not found" });

  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  });
}

// Update current user profile (name only for now)
export const updateProfileSchema = z.object({
  name: z.string().min(2),
});

export async function updateProfile(req, res) {
  const { name } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const before = { name: user.name };
  user.name = name;
  await user.save();

  await AuditLog.create({
    actorId: user._id,
    action: "PROFILE_UPDATE",
    targetType: "User",
    targetId: user._id.toString(),
    meta: { before, after: { name: user.name } },
  });

  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
}

// Change password (requires current password)
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) return res.status(400).json({ message: "Current password is incorrect" });

  user.passwordHash = await hashPassword(newPassword);
  // Optionally invalidate all sessions by clearing refresh token hash
  user.refreshTokenHash = null;
  await user.save();

  await AuditLog.create({
    actorId: user._id,
    action: "PASSWORD_CHANGE",
    targetType: "User",
    targetId: user._id.toString(),
  });

  res.json({ ok: true, message: "Password changed successfully. Please log in again." });
}