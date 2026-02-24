/**
 * Cloudflare Turnstile server-side verification.
 * @see https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verify a Turnstile token with Cloudflare.
 * @param {string} secret - TURNSTILE_SECRET_KEY
 * @param {string} token - Token from the client widget
 * @param {string} [remoteip] - Optional user IP for analytics
 * @returns {Promise<{ success: boolean, errorCodes?: string[] }>}
 */
export async function verifyTurnstile(secret, token, remoteip) {
  if (!secret || !token) {
    return { success: false, errorCodes: ["missing-inputs"] };
  }
  const body = new URLSearchParams({
    secret,
    response: token,
    ...(remoteip && { remoteip }),
  });
  const res = await fetch(SITEVERIFY_URL, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const data = await res.json().catch(() => ({}));
  return {
    success: data.success === true,
    errorCodes: data["error-codes"] || [],
  };
}
