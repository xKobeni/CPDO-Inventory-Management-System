import { Link, useLocation, useNavigate } from "react-router-dom"
import { clearAuth } from "@/lib/auth"
import { clearCsrfToken } from "@/lib/http"
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
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const mainNav = [
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
]

const staffNav = [
  { to: "/staff/settings", label: "Staff Settings", icon: Settings },
]

const secondaryNav = [
  { to: "/settings", label: "Account Settings", icon: Settings },
]

export function AppSidebar(props) {
  const location = useLocation()
  const navigate = useNavigate()
  const user = getUser()

  function handleLogout() {
    clearAuth()
    clearCsrfToken()
    navigate("/login", { replace: true })
  }

  const navUser = user
    ? {
        name: user.name || "User",
        email: user.email || "",
        avatar: undefined,
      }
    : { name: "Guest", email: "", avatar: undefined }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link to="/dashboard">
                <img src="/cpdo_logo.png" alt="CPDCO Logo" className="size-8 object-contain" />
                <span className="text-base font-semibold">CPDC Inventory</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.to}>
                    <Link to={item.to}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.role === "admin" && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNav.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={location.pathname === item.to}>
                        <Link to={item.to}>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {user?.role === "staff" && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Staff</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {staffNav.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={location.pathname === item.to}>
                        <Link to={item.to}>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNav.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.to}>
                    <Link to={item.to}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={navUser} onLogout={handleLogout} />
      </SidebarFooter>
    </Sidebar>
  )
}
