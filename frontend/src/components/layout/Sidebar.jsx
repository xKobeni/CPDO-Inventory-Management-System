import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ClipboardList,
  FileBarChart2,
  Users,
  Shield,
  Settings,
} from "lucide-react"
import { getUser } from "@/lib/auth"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/items", label: "Inventory", icon: Package },
  { to: "/stock/in", label: "Stock In", icon: ArrowDownToLine },
  { to: "/stock/out", label: "Stock Out", icon: ArrowUpFromLine },
  { to: "/inventory/movements", label: "Movements", icon: ArrowLeftRight },
  { to: "/issuance", label: "Issuance", icon: ClipboardList },
  { to: "/reports", label: "Reports", icon: FileBarChart2 },
]

const adminNav = [
  { to: "/admin/users", label: "User Management", icon: Users },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: Shield },
  { to: "/settings", label: "Settings", icon: Settings },
]

const linkBase =
  "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2"
const linkActive = "bg-sidebar-primary text-sidebar-primary-foreground"
const linkInactive = "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"

function NavItem({ to, label, icon: Icon, collapsed }) {
  const content = (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          linkBase,
          isActive ? linkActive : linkInactive,
          collapsed ? "justify-center w-full px-0 py-3" : "px-3 py-2.5",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild className="w-full flex justify-center">
          {content}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }
  return content
}

export default function Sidebar({ collapsed = false }) {
  const user = getUser()

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar shadow-sm">
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Header */}
          <div className={`flex items-center border-b border-sidebar-border ${collapsed ? "justify-center p-4" : "gap-3 p-3"}`}>
            <div className={`grid shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground ${collapsed ? "h-10 w-10" : "h-9 w-9"}`}>
              CP
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-sidebar-foreground">CPDO Inventory</div>
                <div className="truncate text-xs text-sidebar-foreground/60">{user?.role ? `Role: ${user.role}` : "Not signed in"}</div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className={`flex-1 ${collapsed ? "px-0 py-3" : "p-2"}`}>
            <nav className={collapsed ? "flex flex-col items-center space-y-2" : "space-y-0.5"}>
              {nav.map((item) => (
                <NavItem key={item.to} {...item} collapsed={collapsed} />
              ))}
            </nav>

            {user?.role === "admin" && (
              <>
                {!collapsed && (
                  <div className="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                    Admin
                  </div>
                )}
                <nav className={collapsed ? "mt-6 flex flex-col items-center space-y-2" : "mt-1 space-y-0.5"}>
                  {adminNav.map((item) => (
                    <NavItem key={item.to} {...item} collapsed={collapsed} />
                  ))}
                </nav>
              </>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
