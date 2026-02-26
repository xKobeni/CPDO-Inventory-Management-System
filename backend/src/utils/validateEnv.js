/**
 * Validate required environment variables on startup
 * Fail fast if critical configuration is missing
 */

const REQUIRED_ENV_VARS = [
  "NODE_ENV",
  "PORT",
  "MONGODB_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

const OPTIONAL_ENV_VARS = [
  "CLIENT_URL",
  "CLIENT_ORIGIN",
  "ACCESS_TOKEN_EXPIRES_IN",
  "REFRESH_TOKEN_EXPIRES_IN",
  "BREVO_API_KEY",
  "EMAIL_FROM_EMAIL",
  "EMAIL_FROM_NAME",
  "TURNSTILE_SECRET_KEY",
  "SENTRY_DSN",
  "SENTRY_ENVIRONMENT",
  "SENTRY_TRACES_SAMPLE_RATE",
  "SEED_ADMIN_EMAIL",
  "SEED_ADMIN_PASSWORD",
  "SEED_ADMIN_NAME",
];

export function validateEnv() {
  console.log("🔍 Validating environment variables...");

  const missing = [];
  const warnings = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName] || process.env[varName].trim() === "") {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((v) => console.error(`   - ${v}`));
    console.error("\nPlease check your .env file and ensure all required variables are set.");
    process.exit(1);
  }

  // Validate JWT secrets are strong
  if (process.env.JWT_ACCESS_SECRET && process.env.JWT_ACCESS_SECRET.length < 32) {
    warnings.push("JWT_ACCESS_SECRET should be at least 32 characters long");
  }
  if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
    warnings.push("JWT_REFRESH_SECRET should be at least 32 characters long");
  }

  // Validate NODE_ENV
  const validEnvs = ["development", "production", "test"];
  if (!validEnvs.includes(process.env.NODE_ENV)) {
    warnings.push(`NODE_ENV should be one of: ${validEnvs.join(", ")}`);
  }

  // Check if email is configured
  if (!process.env.BREVO_API_KEY) {
    warnings.push("BREVO_API_KEY not set - email notifications will be disabled");
  }

  // Check if CORS is configured
  if (!process.env.CLIENT_URL && !process.env.CLIENT_ORIGIN) {
    warnings.push("CLIENT_URL (or CLIENT_ORIGIN) not set - CORS will use default http://localhost:5173");
  }

  // Check if Turnstile is configured
  if (!process.env.TURNSTILE_SECRET_KEY) {
    warnings.push("TURNSTILE_SECRET_KEY not set - CAPTCHA protection will be disabled");
  }

  // Display warnings
  if (warnings.length > 0) {
    console.log("\n⚠️  Environment warnings:");
    warnings.forEach((w) => console.log(`   - ${w}`));
  }

  console.log("✅ Environment validation passed\n");

  // Return config summary
  return {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    emailEnabled: !!process.env.BREVO_API_KEY,
    turnstileEnabled: !!process.env.TURNSTILE_SECRET_KEY,
  };
}
