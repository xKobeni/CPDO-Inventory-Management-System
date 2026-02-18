import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";
import { connectDB } from "../config/db.js";
import { hashPassword } from "../utils/hash.js";

async function seedAdmin() {
  const name = process.env.SEED_ADMIN_NAME || "CPDC Admin";
  const email = (process.env.SEED_ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD || "";

  if (!email) throw new Error("SEED_ADMIN_EMAIL is missing in .env");
  if (!password || password.length < 8) throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters");

  await connectDB();

  const existing = await User.findOne({ email });

  if (existing) {
    console.log(`Admin/user already exists: ${email}`);
    // Optional: promote to ADMIN if you want:
    if (existing.role !== "ADMIN") {
      existing.role = "ADMIN";
      existing.isActive = true;
      await existing.save();
      console.log("Existing user promoted to ADMIN.");
    }
    return;
  }

  const admin = await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: "ADMIN",
    isActive: true,
  });

  console.log("✅ Seeded ADMIN user:");
  console.log({ id: admin._id.toString(), name: admin.name, email: admin.email, role: admin.role });
}

seedAdmin()
  .catch((err) => {
    console.error("❌ Seed admin failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch (err) {
      console.error("Error closing database connection:", err.message);
    }
  });