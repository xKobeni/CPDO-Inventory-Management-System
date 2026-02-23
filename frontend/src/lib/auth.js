const KEY = "cpdc_auth"
const REMEMBER_EMAIL_KEY = "cpdc_remember_email"

export function setAuth({ token, user }) {
  localStorage.setItem(KEY, JSON.stringify({ token, user }))
}

export function getAuth() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getToken() {
  return getAuth()?.token || null
}

export function getUser() {
  return getAuth()?.user || null
}

export function clearAuth() {
  localStorage.removeItem(KEY)
}

/** Remember me: store only email (never password). */
export function setRememberedEmail(email) {
  if (email != null && String(email).trim()) {
    localStorage.setItem(REMEMBER_EMAIL_KEY, String(email).trim())
  } else {
    localStorage.removeItem(REMEMBER_EMAIL_KEY)
  }
}

export function getRememberedEmail() {
  try {
    return localStorage.getItem(REMEMBER_EMAIL_KEY) || null
  } catch {
    return null
  }
}