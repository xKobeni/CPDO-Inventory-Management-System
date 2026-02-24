import app from "./app.js";
import { connectDB } from "./config/db.js";
import "dotenv/config";
import { startBackupScheduler } from "./services/backup.service.js";

const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

function validateEnv() {
  const required = ["MONGODB_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
  if (isProduction) required.push("CLIENT_ORIGIN");
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    console.error("Missing required env:", missing.join(", "));
    process.exit(1);
  }
}

(async () => {
  validateEnv();
  try {
    await connectDB();
    startBackupScheduler();
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err && err.message ? err.message : err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
})();