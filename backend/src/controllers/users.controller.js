import { z } from "zod";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { hashPassword, hashToken } from "../utils/hash.js";
import { sendPasswordResetNotification, sendVerificationOtpEmail } from "../services/email.service.js";

export const adminCreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().transform(v => v.toLowerCase().trim()),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "STAFF", "REQUESTER"]).default("STAFF"),
});

export const adminUpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["ADMIN", "STAFF", "REQUESTER"]).optional(),
  isActive: z.boolean().optional(),
});

export const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

export async function adminListUsers(req, res) {
  const { q, role, active } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (active === "true") filter.isActive = true;
  if (active === "false") filter.isActive = false;

  if (q) {
    filter.$or = [
      { name: new RegExp(q, "i") },
      { email: new RegExp(q, "i") },
    ];
  }

  const users = await User.find(filter)
    .select("_id name email role isActive isVerified createdAt updatedAt")
    .sort({ createdAt: -1 })
    .limit(500);

  res.json(users);
}

export async function adminCreateUser(req, res) {
  const { name, email, password, role } = req.body;

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: "Email already in use" });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const user = await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role,
    isActive: true,
    isVerified: false,
    emailVerificationOtpHash: await hashToken(otp),
    emailVerificationOtpExpires: otpExpires,
  });

  await AuditLog.create({
    actorId: req.user._id,
    action: "ADMIN_USER_CREATE",
    targetType: "User",
    targetId: user._id.toString(),
    meta: { email: user.email, role: user.role },
  });

  try {
    await sendVerificationOtpEmail(user.email, user.name, otp);
  } catch (err) {
    console.error("Verification email failed:", err?.message || err);
    // User is created; they can use "Resend verification" later
  }

  res.status(201).json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    isVerified: false,
  });
}

export async function adminUpdateUser(req, res) {
  const { id } = req.params;

  // Prevent self-lockout edge cases (optional)
  if (id === req.user._id.toString() && req.body.isActive === false) {
    return res.status(400).json({ message: "You cannot deactivate your own account." });
  }

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const before = { name: user.name, role: user.role, isActive: user.isActive };

  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.role !== undefined) user.role = req.body.role;
  if (req.body.isActive !== undefined) user.isActive = req.body.isActive;

  await user.save();

  await AuditLog.create({
    actorId: req.user._id,
    action: "ADMIN_USER_UPDATE",
    targetType: "User",
    targetId: user._id.toString(),
    meta: { before, after: { name: user.name, role: user.role, isActive: user.isActive } },
  });

  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  });
}

export async function adminResetPassword(req, res) {
  const { id } = req.params;
  const { newPassword } = req.body;

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.passwordHash = await hashPassword(newPassword);

  // Invalidate sessions by clearing refresh token hash (forces re-login everywhere)
  user.refreshTokenHash = null;

  await user.save();

  await AuditLog.create({
    actorId: req.user._id,
    action: "ADMIN_PASSWORD_RESET",
    targetType: "User",
    targetId: user._id.toString(),
    meta: { email: user.email },
  });

  try {
    await sendPasswordResetNotification(user.email, user.name);
  } catch (err) {
    console.error("Password reset email failed:", err?.message || err);
    // Do not fail the request; password was already reset
  }

  res.json({ ok: true });
}

export async function adminDeactivateUser(req, res) {
  const { id } = req.params;

  if (id === req.user._id.toString()) {
    return res.status(400).json({ message: "You cannot deactivate your own account." });
  }

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.isActive = false;
  user.refreshTokenHash = null; // force logout
  await user.save();

  await AuditLog.create({
    actorId: req.user._id,
    action: "ADMIN_USER_DEACTIVATE",
    targetType: "User",
    targetId: user._id.toString(),
    meta: { email: user.email },
  });

  res.json({ ok: true });
}

export async function adminActivateUser(req, res) {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.isActive = true;
  await user.save();

  await AuditLog.create({
    actorId: req.user._id,
    action: "ADMIN_USER_ACTIVATE",
    targetType: "User",
    targetId: user._id.toString(),
    meta: { email: user.email },
  });

  res.json({ ok: true });
}

export async function adminDeleteUser(req, res) {
  const { id } = req.params;

  // Prevent self-deletion
  if (id === req.user._id.toString()) {
    return res.status(400).json({ message: "You cannot delete your own account." });
  }

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: "User not found" });

  // Only allow deletion of deactivated users
  if (user.isActive !== false) {
    return res.status(400).json({ message: "Only deactivated users can be deleted. Please deactivate the user first." });
  }

  await AuditLog.create({
    actorId: req.user._id,
    action: "ADMIN_USER_DELETE",
    targetType: "User",
    targetId: user._id.toString(),
    meta: { email: user.email, name: user.name, role: user.role },
  });

  await User.findByIdAndDelete(id);

  res.json({ ok: true });
}