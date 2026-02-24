import { Outlet } from "react-router-dom"
import AppShell from "@/components/layout/AppShell"
import { CategoriesProvider } from "@/contexts/CategoriesContext"
import { PeopleProvider } from "@/contexts/PeopleContext"

export default function AppLayout() {
  return (
    <CategoriesProvider>
      <PeopleProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </PeopleProvider>
    </CategoriesProvider>
  )
}