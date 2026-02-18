import { useState } from "react"
import { useNavigate, useLocation, Navigate } from "react-router-dom"
import { LoginForm } from "@/components/login-form"
import { getToken, setAuth } from "@/lib/auth"
import { http } from "@/lib/http"

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const from = location.state?.from || "/dashboard"

  if (getToken()) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit({ email, password }) {
    setError(null)
    setIsLoading(true)
    try {
      const { data } = await http.post("/auth/login", { email, password })
      const user = data.user ? { ...data.user, role: (data.user.role || "").toLowerCase() } : data.user
      setAuth({ token: data.accessToken, user })
      navigate(from, { replace: true })
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Login failed."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6 md:p-10">
      <div className="w-full max-w-4xl">
        <LoginForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  )
}
