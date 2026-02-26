import { http } from "@/lib/http"
import { setAuth } from "@/lib/auth"
import { API_PATHS } from "@/constants/api"

/**
 * @param {{ email: string, password: string, turnstileToken?: string }} payload
 * @returns {Promise<{ accessToken: string, user: { id: string, name: string, email: string, role: string } }>}
 */
export async function login(payload) {
  const { data } = await http.post(API_PATHS.auth.login, payload)
  const user = data.user
    ? { ...data.user, role: (data.user.role || "").toLowerCase() }
    : data.user
  setAuth({ token: data.accessToken, user })
  return { accessToken: data.accessToken, user }
}

export async function logout() {
  const { data } = await http.post(API_PATHS.auth.logout)
  return data
}

/**
 * @param {string} token - Verification token from email link
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
export async function verifyEmail(token) {
  const { data } = await http.get(`${API_PATHS.auth.verifyEmail}?token=${encodeURIComponent(token)}`)
  return data
}

/**
 * @param {{ email: string }} payload
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
export async function resendVerification(payload) {
  const { data } = await http.post(API_PATHS.auth.resendVerification, payload)
  return data
}

/**
 * @param {{ email: string }} payload
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
export async function forgotPassword(payload) {
  const { data } = await http.post(API_PATHS.auth.forgotPassword, payload)
  return data
}

/**
 * @param {{ email: string, otp: string, newPassword: string }} payload
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
export async function resetPassword(payload) {
  const { data } = await http.post(API_PATHS.auth.resetPassword, payload)
  return data
}

/**
 * Get current user's profile
 * @returns {Promise<{ id: string, name: string, email: string, role: string, isActive: boolean, isVerified: boolean, createdAt: string }>}
 */
export async function getMe() {
  const { data } = await http.get(API_PATHS.auth.me)
  return data
}

/**
 * Update current user's profile
 * @param {{ name: string }} payload
 * @returns {Promise<{ id: string, name: string, email: string, role: string }>}
 */
export async function updateProfile(payload) {
  const { data } = await http.put(API_PATHS.auth.profile, payload)
  return data
}

/**
 * Change current user's password
 * @param {{ currentPassword: string, newPassword: string }} payload
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
export async function changePassword(payload) {
  const { data } = await http.post(API_PATHS.auth.changePassword, payload)
  return data
}
