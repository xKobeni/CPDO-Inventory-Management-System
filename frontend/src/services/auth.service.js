import { http } from "@/lib/http"
import { setAuth } from "@/lib/auth"
import { API_PATHS } from "@/constants/api"

/**
 * @param {{ email: string, password: string }} payload
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
