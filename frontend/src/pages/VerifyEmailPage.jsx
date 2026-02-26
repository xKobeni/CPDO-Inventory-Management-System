import { useState, useEffect } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { toast } from "sonner"
import { authService } from "@/services"
import { getErrorMessage } from "@/utils/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getToken } from "@/lib/auth"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState("verifying") // verifying, success, error
  const [error, setError] = useState(null)

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    if (getToken()) {
      navigate("/dashboard", { replace: true })
      return
    }

    // If no token in URL, show error
    if (!token) {
      setStatus("error")
      setError("Invalid verification link. The token is missing.")
      return
    }

    // Verify the token automatically
    async function verifyToken() {
      try {
        const response = await authService.verifyEmail(token)
        setStatus("success")
        toast.success(response.message || "Email verified successfully!")
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate("/login", { replace: true })
        }, 2000)
      } catch (err) {
        setStatus("error")
        const errorMsg = getErrorMessage(err)
        setError(errorMsg)
        toast.error(errorMsg)
      }
    }

    verifyToken()
  }, [token, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6 md:p-10">
      <Card className="w-full max-w-md rounded-xl border border-zinc-200 shadow-sm">
        <CardContent className="p-8">
          <div className="text-center">
            {status === "verifying" && (
              <>
                <Loader2 className="w-16 h-16 mx-auto mb-4 text-zinc-600 animate-spin" />
                <h1 className="text-xl font-bold">Verifying your email...</h1>
                <p className="mt-2 text-sm text-zinc-600">
                  Please wait while we verify your email address.
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
                <h1 className="text-xl font-bold text-green-600">Email Verified!</h1>
                <p className="mt-2 text-sm text-zinc-600">
                  Your email has been successfully verified. Redirecting to login...
                </p>
                <Button 
                  onClick={() => navigate("/login", { replace: true })}
                  className="mt-6 w-full"
                >
                  Go to Login
                </Button>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
                <h1 className="text-xl font-bold text-red-600">Verification Failed</h1>
                <p className="mt-4 text-sm text-zinc-700 bg-red-50 border border-red-200 rounded p-3">
                  {error}
                </p>
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-zinc-600">
                    Your verification link may have expired or is invalid.
                  </p>
                  <Button 
                    onClick={() => navigate("/login")}
                    className="w-full"
                  >
                    Go to Login
                  </Button>
                  <p className="text-sm text-zinc-500">
                    Need help? Contact your system administrator.
                  </p>
                </div>
              </>
            )}
          </div>

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
