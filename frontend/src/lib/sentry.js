/**
 * Sentry Error Monitoring for Frontend
 * 
 * To enable:
 * 1. Sign up at https://sentry.io
 * 2. Create a new project for React
 * 3. Add VITE_SENTRY_DSN to your .env file
 * 4. npm install @sentry/react
 * 
 * Environment variables:
 * - VITE_SENTRY_DSN: Your Sentry project DSN (required to enable)
 * - VITE_SENTRY_ENVIRONMENT: Environment name (defaults to 'development')
 * - VITE_SENTRY_TRACES_SAMPLE_RATE: Performance monitoring sample rate (default: 0.1)
 */

let Sentry = null
let isInitialized = false

/**
 * Initialize Sentry for React
 * Safe to call even if @sentry/react is not installed
 */
export async function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN

  if (!dsn) {
    console.log("ℹ️  Sentry not configured (VITE_SENTRY_DSN not set)")
    return false
  }

  try {
    // Only try to import if SENTRY_DSN is configured
    // This way build won't fail if package not installed
    let sentryModule
    try {
      sentryModule = await import("@sentry/react")
    } catch (importError) {
      console.log("⚠️  Sentry DSN configured but @sentry/react package not installed")
      console.log("   Install with: npm install @sentry/react")
      return false
    }

    Sentry = sentryModule

    Sentry.init({
      dsn,
      environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || "development",
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      
      // Performance Monitoring
      tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || "0.1"),
      
      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

      // Filter sensitive data
      beforeSend(event) {
        // Remove sensitive form data
        if (event.request?.data) {
          const data = event.request.data
          if (typeof data === "object") {
            delete data.password
            delete data.currentPassword
            delete data.newPassword
            delete data.otp
          }
        }

        // Remove sensitive breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.filter((breadcrumb) => {
            if (breadcrumb.category === "console" && breadcrumb.data) {
              const msg = String(breadcrumb.data.arguments || "").toLowerCase()
              if (msg.includes("password") || msg.includes("token")) {
                return false
              }
            }
            return true
          })
        }
        
        return event
      },
    })

    isInitialized = true
    console.log("✅ Sentry error monitoring initialized")
    return true
  } catch (err) {
    console.log("⚠️  Sentry initialization failed:", err.message)
    return false
  }
}

/**
 * Manually capture an exception
 */
export function captureException(error, context = {}) {
  if (!isInitialized || !Sentry) {
    console.error("Error:", error)
    return
  }

  Sentry.captureException(error, {
    extra: context,
  })
}

/**
 * Manually capture a message
 */
export function captureMessage(message, level = "info", context = {}) {
  if (!isInitialized || !Sentry) {
    console.log(`[${level}]`, message, context)
    return
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  })
}

export default Sentry
