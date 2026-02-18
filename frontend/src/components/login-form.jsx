import { useState } from "react"
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
import { Eye, EyeOff } from "lucide-react"

export function LoginForm({
  className,
  onSubmit,
  isLoading,
  error,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className={cn("flex flex-col gap-8", className)} {...props}>
      <Card className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm p-0">
        <CardContent className="grid p-0 md:grid-cols-2 min-h-[480px] md:min-h-[520px]">
          <form
            className="p-8 md:p-10 lg:p-12 flex flex-col justify-center"
            onSubmit={(e) => {
              e.preventDefault()
              const form = e.target
              const email = form.querySelector('input[name="email"]')?.value
              const password = form.querySelector('input[name="password"]')?.value
              onSubmit?.({ email, password })
            }}
          >
            <FieldGroup className="gap-6">
              <div className="flex flex-col items-center gap-2 text-center mb-2">
                <h1 className="text-2xl md:text-3xl font-bold">Welcome back</h1>
                <p className="text-muted-foreground text-balance text-sm md:text-base">
                  Login to your CPDC Inventory account
                </p>
              </div>
              {error && (
                <p className="text-center text-sm text-red-600">{error}</p>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" placeholder="m@example.com" required disabled={isLoading} />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
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
              <Field>
                <Button type="submit" disabled={isLoading}>
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
            <p className="text-lg font-semibold text-zinc-800">CPDC Inventory</p>
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
