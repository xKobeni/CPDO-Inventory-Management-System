import { http } from "@/lib/http"
import { API_PATHS } from "@/constants/api"

/**
 * @param {{ q?: string, role?: string, active?: 'true'|'false' }} params
 * @returns {Promise<Array>}
 */
export async function listUsers(params = {}) {
  const { data } = await http.get(API_PATHS.users, { params })
  return data
}

/**
 * @param {{ name: string, email: string, password: string, role?: 'ADMIN'|'STAFF'|'REQUESTER' }} body
 * @returns {Promise<Object>}
 */
export async function createUser(body) {
  const { data } = await http.post(API_PATHS.users, body)
  return data
}

/**
 * @param {string} id - User ID
 * @param {{ name?: string, role?: string, isActive?: boolean }} body
 * @returns {Promise<Object>}
 */
export async function updateUser(id, body) {
  const { data } = await http.put(API_PATHS.user(id), body)
  return data
}

/**
 * @param {string} id - User ID
 * @param {{ newPassword: string }} body
 * @returns {Promise<Object>}
 */
export async function resetPassword(id, body) {
  const { data } = await http.post(API_PATHS.userResetPassword(id), body)
  return data
}

export async function deactivateUser(id) {
  const { data } = await http.post(API_PATHS.userDeactivate(id))
  return data
}

export async function activateUser(id) {
  const { data } = await http.post(API_PATHS.userActivate(id))
  return data
}

export async function deleteUser(id) {
  const { data } = await http.delete(API_PATHS.user(id))
  return data
}
