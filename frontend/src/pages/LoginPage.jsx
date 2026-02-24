import { useState } from "react"
import { useNavigate, useLocation, Navigate, Link } from "react-router-dom"
import { toast } from "sonner"
import { LoginForm } from "@/components/login-form"
import { getToken, setRememberedEmail } from "@/lib/auth"
import { authService } from "@/services"
import { getErrorMessage } from "@/utils/api"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [needsVerification, setNeedsVerification] = useState(null) // { email }
  const [resendLoading, setResendLoading] = useState(false)

  const from = location.state?.from || "/dashboard"

  if (getToken()) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit({ email, password, rememberMe, turnstileToken }) {
    setError(null)
    setNeedsVerification(null)
    setIsLoading(true)
    try {
      await authService.login({ email, password, turnstileToken })
      setRememberedEmail(rememberMe ? email : null)
      toast.success("Successfully signed in")
      navigate(from, { replace: true })
    } catch (err) {
      if (err?.response?.status === 403 && err?.response?.data?.code === "NEEDS_VERIFICATION") {
        setNeedsVerification({ email: err.response.data.email || email })
        setError(err.response.data.message || "Please verify your email before signing in.")
      } else {
        setError(getErrorMessage(err))
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResendVerification() {
    if (!needsVerification?.email) return
    setResendLoading(true)
    try {
      await authService.resendVerification({ email: needsVerification.email })
      toast.success("A new verification code was sent to your email.")
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6 md:p-10">
      <div className="w-full max-w-4xl">
        <LoginForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
          onForgotPassword={() => navigate("/forgot-password")}
        />
        {needsVerification?.email && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-medium text-amber-800">Verify your email</p>
            <p className="mt-1 text-amber-700">
              We sent a 6-digit code to <strong>{needsVerification.email}</strong>. Enter it on the verification page to sign in.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
              >
                <Link to={`/verify-email?email=${encodeURIComponent(needsVerification.email)}`}>
                  Enter verification code
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={resendLoading}
                onClick={handleResendVerification}
              >
                {resendLoading ? "Sending…" : "Resend code"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
