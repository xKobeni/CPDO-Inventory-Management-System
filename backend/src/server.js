import app from "./app.js";
import { connectDB } from "./config/db.js";
import "dotenv/config";
import { startBackupScheduler } from "./services/backup.service.js";
import { validateEnv } from "./utils/validateEnv.js";
import { initSentry } from "./config/sentry.js";

const PORT = process.env.PORT || 5000;

(async () => {
  // Validate environment variables before starting
  const config = validateEnv();
  
  // Initialize Sentry error monitoring
  await initSentry(app);
  
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");
    
    startBackupScheduler();
    console.log("✅ Backup scheduler started");
  } catch (err) {
    console.error("❌ Failed to connect to MongoDB:", err && err.message ? err.message : err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 API running on http://localhost:${PORT}`);
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   Email: ${config.emailEnabled ? "Enabled" : "Disabled"}`);
    console.log(`   Turnstile: ${config.turnstileEnabled ? "Enabled" : "Disabled"}\n`);
  });
})();