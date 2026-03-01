import crypto from "crypto";

/**
 * CSRF Protection using Double Submit Cookie pattern
 * 
 * How it works:
 * 1. Server generates a CSRF token and sends it both as a cookie AND in response body
 * 2. Client stores the token from response body and sends it in request header
 * 3. Server validates that header token matches cookie token
 * 
 * This protects against CSRF because an attacker can't read the cookie value
 * due to same-origin policy.
 */

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generate a random CSRF token
 */
export function generateCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Middleware to generate and set CSRF token cookie
 * Use this on endpoints that need to provide a CSRF token to the client
 */
export function setCsrfToken(req, res, next) {
  const token = generateCsrfToken();
  
  // Set as httpOnly cookie (can't be read by JavaScript)
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
  
  // Also expose token in response so client can send it back in header
  req.csrfToken = token;
  next();
}

/**
 * Middleware to verify CSRF token
 * Use this on state-changing endpoints (POST, PUT, DELETE)
 */
export function verifyCsrfToken(req, res, next) {
  // Skip CSRF for safe methods
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME.toLowerCase()];

  // Both must exist
  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      message: "CSRF token missing",
      code: "CSRF_TOKEN_MISSING",
    });
  }

  // Tokens must match (constant-time comparison to prevent timing attacks)
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    return res.status(403).json({
      message: "CSRF token invalid",
      code: "CSRF_TOKEN_INVALID",
    });
  }

  next();
}

/**
 * Middleware to add CSRF token to response
 * Use this after setCsrfToken to include token in JSON response
 */
export function addCsrfToResponse(req, res, next) {
  const originalJson = res.json.bind(res);
  
  res.json = function (data) {
    if (req.csrfToken) {
      return originalJson({
        ...data,
        csrfToken: req.csrfToken,
      });
    }
    return originalJson(data);
  };
  
  next();
}
