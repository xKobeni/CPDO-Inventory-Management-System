const KEY = "cpdc_auth"

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