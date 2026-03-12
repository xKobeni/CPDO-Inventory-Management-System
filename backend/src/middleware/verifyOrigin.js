function normalizeOrigin(value) {
  if (!value) return null;
  try {
    return new URL(String(value)).origin;
  } catch {
    return null;
  }
}

function getAllowedOrigins() {
  const raw =
    process.env.CLIENT_URL ||
    process.env.CLIENT_ORIGIN ||
    "http://localhost:5173";

  // Allow comma-separated list (useful for staging + prod)
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => normalizeOrigin(s) || s);
}

/**
 * Basic origin verification for cookie-auth endpoints.
 *
 * When refresh tokens are stored as httpOnly cookies, browsers will attach them
 * automatically on cross-site requests. This check blocks cross-site calls by
 * enforcing same-site `Origin`/`Referer` matching your configured frontend origin.
 */
export function verifyOrigin(req, res, next) {
  // Non-browser clients (curl/server-to-server) often omit Origin/Referer.
  // Allow them through; auth still required on protected routes.
  const origin = normalizeOrigin(req.headers.origin);
  const referer = normalizeOrigin(req.headers.referer);
  const presented = origin || referer;
  if (!presented) return next();

  const allowed = getAllowedOrigins();
  if (allowed.includes(presented)) return next();

  return res.status(403).json({ message: "Origin not allowed" });
}

