import { useState } from "react"
import { useNavigate, useLocation, Navigate } from "react-router-dom"
import { LoginForm } from "@/components/login-form"
import { getToken } from "@/lib/auth"
import { authService } from "@/services"
import { getErrorMessage } from "@/utils/api"

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
      await authService.login({ email, password })
      navigate(from, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
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
