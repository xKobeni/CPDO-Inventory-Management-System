/**
 * Sentry Error Monitoring Integration
 * 
 * To enable:
 * 1. Sign up at https://sentry.io
 * 2. Create a new project for Node.js/Express
 * 3. Add SENTRY_DSN to your .env file
 * 4. npm install @sentry/node @sentry/profiling-node
 * 
 * Optional environment variables:
 * - SENTRY_DSN: Your Sentry project DSN (required to enable)
 * - SENTRY_ENVIRONMENT: Environment name (defaults to NODE_ENV)
 * - SENTRY_TRACES_SAMPLE_RATE: Performance monitoring sample rate (default: 0.1)
 */

let Sentry = null;
let isInitialized = false;

/**
 * Initialize Sentry
 * Safe to call even if @sentry/node is not installed
 */
export async function initSentry(app) {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    console.log("⚠️  Sentry not configured (SENTRY_DSN not set)");
    return false;
  }

  try {
    // Dynamically import Sentry (won't fail if not installed)
    const SentryNode = await import("@sentry/node");
    Sentry = SentryNode;

    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
      
      // Integrate with Express
      integrations: [
        // Enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // Enable Express request tracing
        new Sentry.Integrations.Express({ app }),
      ],

      // Filter sensitive data
      beforeSend(event, hint) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        
        // Remove sensitive data from request body
        if (event.request?.data) {
          const data = event.request.data;
          if (typeof data === "object") {
            delete data.password;
            delete data.currentPassword;
            delete data.newPassword;
            delete data.passwordHash;
            delete data.otp;
          }
        }
        
        return event;
      },
    });

    isInitialized = true;
    console.log("✅ Sentry error monitoring initialized");
    return true;
  } catch (err) {
    console.log("⚠️  Sentry not available:", err.message);
    console.log("   Install with: npm install @sentry/node @sentry/profiling-node");
    return false;
  }
}

/**
 * Get Sentry request handler middleware
 * Must be added before other middlewares
 */
export function getSentryRequestHandler() {
  if (!isInitialized || !Sentry) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.requestHandler();
}

/**
 * Get Sentry tracing middleware
 * Must be added after request handler
 */
export function getSentryTracingHandler() {
  if (!isInitialized || !Sentry) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.tracingHandler();
}

/**
 * Get Sentry error handler middleware
 * Must be added after all routes but before other error handlers
 */
export function getSentryErrorHandler() {
  if (!isInitialized || !Sentry) {
    return (err, req, res, next) => next(err);
  }
  return Sentry.Handlers.errorHandler();
}

/**
 * Manually capture an exception
 */
export function captureException(error, context = {}) {
  if (!isInitialized || !Sentry) {
    console.error("Error:", error);
    return;
  }
  
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Manually capture a message
 */
export function captureMessage(message, level = "info", context = {}) {
  if (!isInitialized || !Sentry) {
    console.log(`[${level}]`, message, context);
    return;
  }
  
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user) {
  if (!isInitialized || !Sentry) return;
  
  Sentry.setUser({
    id: user._id?.toString(),
    email: user.email,
    username: user.name,
    role: user.role,
  });
}

/**
 * Clear user context
 */
export function clearUserContext() {
  if (!isInitialized || !Sentry) return;
  Sentry.setUser(null);
}

export default Sentry;
