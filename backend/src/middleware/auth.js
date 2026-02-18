import { verifyAccessToken } from "../utils/jwt.js";
import User from "../models/User.js";

export async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) return res.status(401).json({ message: "Missing access token" });

    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.sub).select("_id name email role isActive");
    if (!user || !user.isActive) return res.status(401).json({ message: "User inactive or not found" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid/expired access token" });
  }
}