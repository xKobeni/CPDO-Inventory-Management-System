import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { PanelLeft, PanelLeftClose, LogOut } from "lucide-react"
import { clearAuth, getUser } from "@/lib/auth"
import { clearCsrfToken } from "@/lib/http"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useSidebarCollapsed } from "./SidebarCollapsedContext"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

function getInitials(name) {
  if (!name || typeof name !== "string") return "?"
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export default function Topbar() {
  const user = getUser()
  const navigate = useNavigate()
  const { collapsed, setCollapsed } = useSidebarCollapsed()
  const [logoutOpen, setLogoutOpen] = useState(false)

  function handleSignOut() {
    clearAuth()
    clearCsrfToken()
    setLogoutOpen(false)
    toast.success("Successfully signed out")
    navigate("/login", { replace: true })
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white/95 px-4 shadow-sm backdrop-blur md:px-6">
      <div className="flex w-full items-center justify-between gap-4">
        {/* Left: menu / collapse + title */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SidebarTrigger className="md:hidden" aria-label="Open menu" />
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 md:flex"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
          <Separator orientation="vertical" className="h-5 md:block" />
          <h1 className="truncate text-sm font-semibold text-zinc-800">CPDO Inventory</h1>
        </div>

        {/* Right: user menu */}
        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 rounded-full px-2 py-1.5 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
              >
                <Avatar className="h-7 w-7 rounded-full border border-zinc-200">
                  <AvatarFallback className="bg-zinc-200 text-xs font-medium text-zinc-600">
                    {user?.name ? getInitials(user.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[140px] truncate text-sm sm:inline">{user?.email || "User"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{user?.name || "User"}</p>
                  <p className="truncate text-xs text-zinc-500">{user?.email}</p>
                  {user?.role && (
                    <p className="text-xs text-zinc-400 capitalize">Role: {user.role}</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 cursor-pointer text-zinc-600 focus:text-red-600"
                onClick={() => setLogoutOpen(true)}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You will need to log in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              className="bg-zinc-900 text-white hover:bg-zinc-800 focus:ring-zinc-900"
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}
