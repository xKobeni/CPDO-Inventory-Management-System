import app from "./app.js";
import { connectDB } from "./config/db.js";
import "dotenv/config";
import { startBackupScheduler } from "./services/backup.service.js";

const PORT = process.env.PORT || 5000;

(async () => {
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