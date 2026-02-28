import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff } from "lucide-react"
import { getRememberedEmail } from "@/lib/auth"

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ""

export function LoginForm({
  className,
  onSubmit,
  isLoading,
  error,
  onForgotPassword,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [defaultEmail, setDefaultEmail] = useState("")
  const [turnstileToken, setTurnstileToken] = useState("")
  const [turnstileError, setTurnstileError] = useState("")
  const turnstileWidgetIdRef = useRef(null)

  useEffect(() => {
    setDefaultEmail(getRememberedEmail() || "")
    setRememberMe(!!getRememberedEmail())
  }, [])

  const onTurnstileSuccess = useCallback((token) => {
    setTurnstileToken(token)
    setTurnstileError("")
  }, [])

  const onTurnstileError = useCallback(() => {
    setTurnstileToken("")
    setTurnstileError("Verification failed. Please try again.")
  }, [])

  const onTurnstileExpire = useCallback(() => {
    setTurnstileToken("")
  }, [])

  // Load Cloudflare Turnstile script and render widget when site key is set
  const turnstileContainerRef = useRef(null)
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || typeof window === "undefined" || !turnstileContainerRef.current) return
    const renderWidget = () => {
      if (!window.turnstile || !turnstileContainerRef.current) return
      if (turnstileWidgetIdRef.current != null) return
      try {
        turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "light",
          callback: onTurnstileSuccess,
          "error-callback": onTurnstileError,
          "expired-callback": onTurnstileExpire,
        })
      } catch (_) {}
    }
    if (window.turnstile) {
      renderWidget()
      return
    }
    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
    script.async = true
    script.onload = renderWidget
    document.head.appendChild(script)
  }, [onTurnstileSuccess, onTurnstileError, onTurnstileExpire])

  // Reset Turnstile widget when login fails so user can get a new token
  useEffect(() => {
    if (error && TURNSTILE_SITE_KEY && typeof window !== "undefined" && window.turnstile && turnstileWidgetIdRef.current != null) {
      try {
        window.turnstile.reset(turnstileWidgetIdRef.current)
      } catch (_) {}
      setTurnstileToken("")
    }
  }, [error])

  return (
    <div className={cn("flex flex-col gap-8", className)} {...props}>
      <Card className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm p-0">
        <CardContent className="grid p-0 md:grid-cols-2 min-h-[480px] md:min-h-[520px]">
          <form
            className="p-8 md:p-10 lg:p-12 flex flex-col justify-center"
            onSubmit={(e) => {
              e.preventDefault()
              setTurnstileError("")
              if (TURNSTILE_SITE_KEY && !turnstileToken) {
                setTurnstileError("Please complete the verification below.")
                return
              }
              const form = e.target
              const email = form.querySelector('input[name="email"]')?.value
              const password = form.querySelector('input[name="password"]')?.value
              onSubmit?.({ email, password, rememberMe, turnstileToken: TURNSTILE_SITE_KEY ? turnstileToken : undefined })
            }}
          >
            <FieldGroup className="gap-6">
              <div className="flex flex-col items-center gap-2 text-center mb-2">
                <h1 className="text-2xl md:text-3xl font-bold">Welcome back</h1>
                <p className="text-muted-foreground text-balance text-sm md:text-base">
                  Login to your CPDO Inventory account
                </p>
              </div>
              {error && (
                <p className="text-center text-sm text-red-600">{error}</p>
              )}
              {(turnstileError) && (
                <p className="text-center text-sm text-red-600">{turnstileError}</p>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" placeholder="m@example.com" required disabled={isLoading} defaultValue={defaultEmail} />
              </Field>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  {onForgotPassword && (
                    <button
                      type="button"
                      onClick={onForgotPassword}
                      className="text-sm text-zinc-500 hover:text-zinc-700 underline-offset-2 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={isLoading}
                    className="pr-10"
                    placeholder="********"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <div className="flex w-full min-w-0 items-center gap-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(!!checked)}
                  disabled={isLoading}
                  aria-describedby="rememberMe-description"
                />
                <label
                  htmlFor="rememberMe"
                  id="rememberMe-description"
                  className="min-w-0 flex-1 cursor-pointer select-none text-sm font-medium leading-none text-zinc-700 hover:text-zinc-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Remember me
                </label>
              </div>
              {TURNSTILE_SITE_KEY && (
                <div className="flex flex-col items-center gap-1">
                  <div ref={turnstileContainerRef} />
                </div>
              )}
              <Field>
                <Button type="submit" disabled={isLoading} className="bg-zinc-900 text-white hover:bg-zinc-800">
                  {isLoading ? "Signing in…" : "Login"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
          <div className="relative hidden md:flex flex-col items-center justify-center bg-zinc-100 p-10 lg:p-12 min-h-[320px]">
            <div className="rounded-full bg-zinc-200/80 p-6 mb-6 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                <path d="M20 7h-9" />
                <path d="M14 17H5" />
                <circle cx="17" cy="17" r="3" />
                <circle cx="7" cy="7" r="3" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-zinc-800">CPDO Inventory</p>
            <p className="text-sm text-zinc-500 mt-1 text-center max-w-[200px]">Manage stock, items, and reports in one place.</p>
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center mt-2 text-sm text-zinc-500">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
