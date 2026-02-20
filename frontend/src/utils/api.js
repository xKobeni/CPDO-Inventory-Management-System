/**
 * Extract a user-friendly error message from an API error (axios error).
 * @param {unknown} err - Caught error (usually axios error with err.response?.data)
 * @returns {string}
 */
export function getErrorMessage(err) {
  if (!err) return "An error occurred."
  const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message
  return typeof msg === "string" ? msg : "An error occurred."
}

/**
 * Check if the error is a 401 (unauthorized).
 * @param {unknown} err
 * @returns {boolean}
 */
export function isUnauthorized(err) {
  return err?.response?.status === 401
}

/**
 * Check if the error is a 4xx client error.
 * @param {unknown} err
 * @returns {boolean}
 */
export function isClientError(err) {
  const status = err?.response?.status
  return typeof status === "number" && status >= 400 && status < 500
}
