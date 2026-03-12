import { useState, useEffect, useCallback } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Clock } from "lucide-react"

const INACTIVITY_WARNING_TIME = 25 * 60 * 1000 // 25 minutes (5 min before token expires)
const INACTIVITY_LOGOUT_TIME = 30 * 60 * 1000 // 30 minutes (when token actually expires)

export function InactivityWarning() {
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(5 * 60) // 5 minutes in seconds
  const [lastActivity, setLastActivity] = useState(() => Date.now())

  const resetActivity = useCallback(() => {
    setLastActivity(Date.now())
    setShowWarning(false)
  }, [])

  const handleContinue = useCallback(async () => {
    setShowWarning(false)
    resetActivity()
  }, [resetActivity])

  // Track user activity
  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"]
    
    const handleActivity = () => {
      if (showWarning) {
        // If warning is shown and user interacts, auto-refresh
        handleContinue()
      } else {
        resetActivity()
      }
    }

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [showWarning, resetActivity, handleContinue])

  // Check for inactivity and update countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivity

      if (timeSinceLastActivity >= INACTIVITY_LOGOUT_TIME) {
        // Force reload to clear state and redirect to login
        window.location.reload()
      } else if (timeSinceLastActivity >= INACTIVITY_WARNING_TIME) {
        setShowWarning(true)
        const remainingSeconds = Math.floor((INACTIVITY_LOGOUT_TIME - timeSinceLastActivity) / 1000)
        setCountdown(remainingSeconds > 0 ? remainingSeconds : 0)
      }
    }, 1000) // Check every second

    return () => clearInterval(interval)
  }, [lastActivity])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-amber-100 p-3">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-xl">Still there?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-3 pt-2">
            <p>
              You've been inactive for a while. For security reasons, your session will expire soon.
            </p>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-amber-800 font-medium mb-1">Time remaining:</p>
              <p className="text-3xl font-bold text-amber-600 tabular-nums">{formatTime(countdown)}</p>
            </div>
            <p className="text-sm text-zinc-600">
              Click "Continue Session" to stay logged in, or you'll be automatically logged out.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction 
            onClick={handleContinue}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          >
            Continue Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
