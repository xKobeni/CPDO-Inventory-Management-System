import { createContext, useContext } from "react"

export const SidebarCollapsedContext = createContext({ collapsed: false, setCollapsed: () => {} })

export function useSidebarCollapsed() {
  const ctx = useContext(SidebarCollapsedContext)
  if (!ctx) return { collapsed: false, setCollapsed: () => {} }
  return ctx
}
