import axios from "axios"
import { clearAuth, getToken, setAuth, getUser } from "@/lib/auth"

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // Required for refresh token cookie
})

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

http.interceptors.request.use(async (config) => {
  // Add access token
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (res) => {
    return res
  },
  async (err) => {
    const originalRequest = err.config

    // If error is 401 and we haven't tried to refresh yet
    if (err?.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return http(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Attempt to refresh the token (refresh token is httpOnly cookie)
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        )

        const newToken = data.accessToken
        const user = getUser()

        // Update stored auth with new token
        if (user) {
          setAuth({ token: newToken, user })
        }

        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`

        // Process queued requests
        processQueue(null, newToken)

        // Retry the original request
        return http(originalRequest)
      } catch (refreshError) {
        // Refresh failed - clear auth and reject all queued requests
        processQueue(refreshError, null)
        clearAuth()
        // Redirect will be handled by ProtectedRoute
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // For other errors or if refresh already failed, reject normally
    return Promise.reject(err)
  }
)