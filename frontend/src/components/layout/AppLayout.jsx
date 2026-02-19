import { Outlet } from "react-router-dom"
import AppShell from "@/components/layout/AppShell"
import { CategoriesProvider } from "@/contexts/CategoriesContext"

export default function AppLayout() {
  return (
    <CategoriesProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </CategoriesProvider>
  )
}