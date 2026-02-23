import { useState, useEffect } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { toast } from "sonner"
import { authService } from "@/services"
import { getErrorMessage } from "@/utils/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getToken } from "@/lib/auth"

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const emailParam = searchParams.get("email") || ""

  const [email, setEmail] = useState(emailParam)
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setEmail((prev) => emailParam || prev)
  }, [emailParam])

  if (getToken()) {
    navigate("/dashboard", { replace: true })
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || otp.length !== 6) {
      setError("Enter your email and the 6-digit code from the email.")
      return
    }
    setIsLoading(true)
    try {
      await authService.verifyEmail({ email: email.trim().toLowerCase(), otp })
      toast.success("Email verified. You can sign in now.")
      navigate("/login", { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResend() {
    if (!email.trim()) {
      toast.error("Enter your email first.")
      return
    }
    setResendLoading(true)
    setError(null)
    try {
      await authService.resendVerification({ email: email.trim().toLowerCase() })
      toast.success("A new verification code was sent to your email.")
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6 md:p-10">
      <Card className="w-full max-w-md rounded-xl border border-zinc-200 shadow-sm">
        <CardContent className="p-8">
          <h1 className="text-xl font-bold text-center">Verify your email</h1>
          <p className="mt-2 text-center text-sm text-zinc-600">
            Enter the 6-digit code we sent to your email. New account must be verified before you can sign in.
          </p>
          <form onSubmit={handleSubmit} className="mt-6">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="verify-email">Email</FieldLabel>
                <Input
                  id="verify-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="verify-otp">Verification code</FieldLabel>
                <Input
                  id="verify-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={isLoading}
                  className="font-mono text-lg tracking-widest"
                />
              </Field>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
                {isLoading ? "Verifying…" : "Verify email"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading || !email.trim()}
                  className="text-sm text-zinc-500 hover:text-zinc-700 underline-offset-2 hover:underline"
                >
                  {resendLoading ? "Sending…" : "Resend code"}
                </button>
              </div>
            </FieldGroup>
          </form>
          <p className="mt-6 text-center text-sm text-zinc-500">
            <Link to="/login" className="underline-offset-2 hover:underline text-zinc-600">
              Back to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
