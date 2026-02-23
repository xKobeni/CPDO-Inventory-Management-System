import { useState, useEffect } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { toast } from "sonner"
import { authService } from "@/services"
import { getErrorMessage } from "@/utils/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff } from "lucide-react"
import { getToken } from "@/lib/auth"

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const emailParam = searchParams.get("email") || ""

  const [email, setEmail] = useState(emailParam)
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
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
    if (!email.trim() || otp.length !== 6 || !newPassword || newPassword.length < 8) {
      setError("Enter email, 6-digit code, and a new password (at least 8 characters).")
      return
    }
    setIsLoading(true)
    try {
      await authService.resetPassword({
        email: email.trim().toLowerCase(),
        otp,
        newPassword,
      })
      toast.success("Password reset. You can sign in with your new password.")
      navigate("/login", { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6 md:p-10">
      <Card className="w-full max-w-md rounded-xl border border-zinc-200 shadow-sm">
        <CardContent className="p-8">
          <h1 className="text-xl font-bold text-center">Reset password</h1>
          <p className="mt-2 text-center text-sm text-zinc-600">
            Enter the 6-digit code from your email and choose a new password.
          </p>
          <form onSubmit={handleSubmit} className="mt-6">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="reset-email">Email</FieldLabel>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="reset-otp">Reset code</FieldLabel>
                <Input
                  id="reset-otp"
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
              <Field>
                <FieldLabel htmlFor="reset-password">New password</FieldLabel>
                <div className="relative">
                  <Input
                    id="reset-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-zinc-500 hover:bg-zinc-100"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || otp.length !== 6 || newPassword.length < 8}
              >
                {isLoading ? "Resetting…" : "Reset password"}
              </Button>
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
