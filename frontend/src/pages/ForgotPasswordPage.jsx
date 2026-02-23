import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { authService } from "@/services"
import { getErrorMessage } from "@/utils/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getToken } from "@/lib/auth"
import { Navigate } from "react-router-dom"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  if (getToken()) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) return
    setIsLoading(true)
    try {
      await authService.forgotPassword({ email: email.trim().toLowerCase() })
      setSent(true)
      toast.success("If that email is registered, you will receive a reset code.")
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6 md:p-10">
        <Card className="w-full max-w-md rounded-xl border border-zinc-200 shadow-sm">
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-bold">Check your email</h1>
            <p className="mt-2 text-sm text-zinc-600">
              If <strong>{email}</strong> is registered, we sent a 6-digit code. Use it on the next page to set a new password.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to={`/reset-password?email=${encodeURIComponent(email)}`}>
                Enter reset code
              </Link>
            </Button>
            <p className="mt-6 text-sm text-zinc-500">
              <Link to="/login" className="underline-offset-2 hover:underline text-zinc-600">
                Back to login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6 md:p-10">
      <Card className="w-full max-w-md rounded-xl border border-zinc-200 shadow-sm">
        <CardContent className="p-8">
          <h1 className="text-xl font-bold text-center">Forgot password?</h1>
          <p className="mt-2 text-center text-sm text-zinc-600">
            Enter your email and we’ll send you a 6-digit code to reset your password.
          </p>
          <form onSubmit={handleSubmit} className="mt-6">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </Field>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending…" : "Send reset code"}
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
