import { Outlet } from "react-router-dom"
import AppShell from "@/components/layout/AppShell"
import { CategoriesProvider } from "@/contexts/CategoriesContext"
import { PeopleProvider } from "@/contexts/PeopleContext"
import { TutorialProvider } from "@/contexts/TutorialContext"
import TutorialOverlay from "@/components/TutorialOverlay"

export default function AppLayout() {
  return (
    <CategoriesProvider>
      <PeopleProvider>
        <TutorialProvider>
          <AppShell>
            <Outlet />
          </AppShell>
          <TutorialOverlay />
        </TutorialProvider>
      </PeopleProvider>
    </CategoriesProvider>
  )
}