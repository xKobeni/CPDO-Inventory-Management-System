import axios from "axios"
import { clearAuth, getToken } from "@/lib/auth"

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    // If backend returns 401, force logout (optional but useful)
    if (err?.response?.status === 401) {
      clearAuth()
      // If you want auto-redirect on 401, your ProtectedRoute will catch it
    }
    return Promise.reject(err)
  }
)