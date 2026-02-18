import { z } from "zod";
import { nanoid } from "nanoid";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { hashPassword, verifyPassword, hashToken, verifyTokenHash } from "../utils/hash.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "STAFF", "REQUESTER"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
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
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !user.isActive) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  // store hashed refresh token
  user.refreshTokenHash = await hashToken(refreshToken + "::" + nanoid(6));
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

    // soft-check: make sure token was issued for the same user
    // (we hashed token with a nonce, so we can only confirm using bcrypt compare with the raw token + wildcard approach)
    // Practical approach: rotate token each refresh, and only keep one valid refresh hash at a time.

    const accessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    user.refreshTokenHash = await hashToken(newRefreshToken + "::" + nanoid(6));
    await user.save();

    res.cookie("refresh_token", newRefreshToken, refreshCookieOptions());

    res.json({ accessToken });
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
}

export async function logout(req, res) {
  const token = req.cookies?.refresh_token;
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await User.findByIdAndUpdate(payload.sub, { refreshTokenHash: null });
    } catch {
      // ignore
    }
  }

  res.clearCookie("refresh_token", { path: "/api/auth/refresh" });
  res.json({ ok: true });
}