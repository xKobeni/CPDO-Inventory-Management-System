import { useState } from "react"
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { SidebarCollapsedContext } from "./SidebarCollapsedContext"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"

function MobileSidebar() {
  const { openMobile, setOpenMobile } = useSidebar()

  return (
    <Sheet open={openMobile} onOpenChange={setOpenMobile}>
      <SheetContent side="left" className="w-64 p-0">
        <Sidebar collapsed={false} />
      </SheetContent>
    </Sheet>
  )
}

function AppShellInner({ children }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    try {
      return localStorage.getItem("sidebar-collapsed") === "true"
    } catch {
      return false
    }
  })

  const setCollapsedWithStorage = (value) => {
    setCollapsed(value)
    try {
      localStorage.setItem("sidebar-collapsed", String(value))
    } catch {
      // ignore localStorage errors
    }
  }

  const sidebarWidth = collapsed ? "md:w-16" : "md:w-64"
  const mainMargin = collapsed ? "md:ml-16" : "md:ml-64"

  return (
    <SidebarCollapsedContext.Provider value={{ collapsed, setCollapsed: setCollapsedWithStorage }}>
      <div className="flex min-h-screen w-full">
        <aside
          className={`hidden md:fixed md:inset-y-0 md:left-0 md:z-10 md:block md:transition-[width] md:duration-200 ${sidebarWidth}`}
        >
          <Sidebar collapsed={collapsed} />
        </aside>

        <MobileSidebar />

        <div className={`flex min-h-screen w-full flex-1 flex-col ${mainMargin} md:transition-[margin] md:duration-200`}>
          <Topbar />
          <main className="flex-1 overflow-auto bg-zinc-50 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarCollapsedContext.Provider>
  )
}

export default function AppShell({ children }) {
  return (
    <SidebarProvider>
      <AppShellInner>{children}</AppShellInner>
    </SidebarProvider>
  )
}
