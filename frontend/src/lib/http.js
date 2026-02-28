import axios from "axios"
import { clearAuth, getToken, setAuth, getUser } from "@/lib/auth"

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // Required for refresh token cookie
})

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false
let failedQueue = []

// Store CSRF token & last fetch time
let csrfToken = null
let lastCsrfFetch = null

// Get CSRF token from memory or localStorage
function getCsrfToken() {
  if (csrfToken) return csrfToken
  
  // Try to recover from localStorage (persists across page refreshes)
  const stored = localStorage.getItem("csrfToken")
  const storedTime = localStorage.getItem("csrfTokenTime")
  if (stored && storedTime) {
    const age = Date.now() - parseInt(storedTime)
    if (age < 24 * 60 * 60 * 1000) { // Still valid (24 hours)
      csrfToken = stored
      lastCsrfFetch = parseInt(storedTime)
      return csrfToken
    } else {
      // Token expired, clear it
      clearCsrfToken()
    }
  }
  return null
}

// Set CSRF token in memory and localStorage
function setCsrfToken(token) {
  csrfToken = token
  lastCsrfFetch = Date.now()
  localStorage.setItem("csrfToken", token)
  localStorage.setItem("csrfTokenTime", lastCsrfFetch.toString())
}

// Clear CSRF token
function clearCsrfToken() {
  csrfToken = null
  lastCsrfFetch = null
  localStorage.removeItem("csrfToken")
  localStorage.removeItem("csrfTokenTime")
}

// Fetch CSRF token from server
export async function fetchCsrfToken() {
  try {
    const { data } = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL}/csrf-token`,
      { withCredentials: true }
    )
    setCsrfToken(data.csrfToken)
    return csrfToken
  } catch (err) {
    console.error("Failed to fetch CSRF token:", err)
    return getCsrfToken()
  }
}

// Export clearCsrfToken for use in logout flow
export { clearCsrfToken }

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
  
  // Add CSRF token for non-GET requests
  if (!["GET", "HEAD", "OPTIONS"].includes(config.method?.toUpperCase())) {
    // Refresh CSRF token if we don't have one or if it's older than 24 hours (matches backend expire time)
    let currentToken = getCsrfToken()
    const tokenAge = lastCsrfFetch ? Date.now() - lastCsrfFetch : Infinity
    if (!currentToken || tokenAge > 24 * 60 * 60 * 1000) {
      await fetchCsrfToken()
      currentToken = getCsrfToken()
    }
    if (currentToken) {
      config.headers["X-CSRF-Token"] = currentToken
    }
  }
  
  return config
})

http.interceptors.response.use(
  (res) => {
    // Check if response contains a new CSRF token and update it
    if (res.data?.csrfToken) {
      setCsrfToken(res.data.csrfToken)
    }
    return res
  },
  async (err) => {
    const originalRequest = err.config

    // If CSRF token is invalid or missing, clear it and fetch a new one
    if (err?.response?.status === 403 && (err?.response?.data?.code === "CSRF_TOKEN_INVALID" || err?.response?.data?.code === "CSRF_TOKEN_MISSING")) {
      clearCsrfToken()
      await fetchCsrfToken()
      const newToken = getCsrfToken()
      if (newToken && originalRequest.headers) {
        originalRequest.headers["X-CSRF-Token"] = newToken
        return http(originalRequest)
      }
    }

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
        // Attempt to refresh the token
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