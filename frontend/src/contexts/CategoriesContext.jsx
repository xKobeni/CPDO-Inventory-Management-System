import { createContext, useContext, useState, useCallback, useEffect } from "react"
import { Pill, Box, Monitor, FlaskConical, Stethoscope, Car, Laptop } from "lucide-react"
import { dashboardService } from "@/services"

const ICON_MAP = {
  Pill,
  Box,
  Monitor,
  FlaskConical,
  Stethoscope,
  Car,
  Laptop,
}

/** URL-friendly slug from category name (must match backend item category strings). */
export function slugFromName(name) {
  if (!name || typeof name !== "string") return ""
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/** Optional: map known category slugs to icon names for nicer UI. */
const SLUG_TO_ICON = {
  printer: "Laptop",
  drugs: "Pill",
  "furniture-fixtures": "Box",
  "ict-equipment": "Monitor",
  "laboratory-equipment": "FlaskConical",
  "medical-supplies": "Stethoscope",
  "motor-vehicles": "Car",
  "office-equipment": "Laptop",
  general: "Box",
}

const CategoriesContext = createContext(null)

export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    dashboardService
      .getCategories()
      .then((data) => {
        if (cancelled) return
        const all = data?.all ?? []
        const list = all.map((entry) => {
          const name = entry.category ?? "General"
          const slug = slugFromName(name)
          const types = entry.types ?? []
          const itemType = types.includes("ASSET") && types.includes("SUPPLY")
            ? "ASSET"
            : types[0] === "ASSET"
              ? "ASSET"
              : "SUPPLY"
          const iconName = SLUG_TO_ICON[slug] ?? "Box"
          return {
            id: slug,
            name,
            slug,
            iconName,
            itemType,
            count: entry.count ?? 0,
          }
        })
        setCategories(list)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? err?.message ?? "Failed to load categories")
          setCategories([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const getCategoriesWithIcons = useCallback(() => {
    return categories.map((c) => ({
      ...c,
      icon: ICON_MAP[c.iconName] || Box,
    }))
  }, [categories])

  const getCategoryBySlug = useCallback(
    (slug) => {
      const c = categories.find((cat) => cat.slug === slug)
      return c ? { ...c, icon: ICON_MAP[c.iconName] || Box } : null
    },
    [categories]
  )

  const refreshCategories = useCallback(() => {
    setLoading(true)
    setError(null)
    dashboardService
      .getCategories()
      .then((data) => {
        const all = data?.all ?? []
        const list = all.map((entry) => {
          const name = entry.category ?? "General"
          const slug = slugFromName(name)
          const types = entry.types ?? []
          const itemType = types.includes("ASSET") && types.includes("SUPPLY")
            ? "ASSET"
            : types[0] === "ASSET"
              ? "ASSET"
              : "SUPPLY"
          const iconName = SLUG_TO_ICON[slug] ?? "Box"
          return {
            id: slug,
            name,
            slug,
            iconName,
            itemType,
            count: entry.count ?? 0,
          }
        })
        setCategories(list)
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? err?.message ?? "Failed to load categories")
        setCategories([])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <CategoriesContext.Provider
      value={{
        categories,
        loading,
        error,
        refreshCategories,
        getCategoriesWithIcons,
        getCategoryBySlug,
        ICON_MAP,
        ICON_OPTIONS: Object.keys(ICON_MAP),
      }}
    >
      {children}
    </CategoriesContext.Provider>
  )
}

export function useCategories() {
  const ctx = useContext(CategoriesContext)
  if (!ctx) throw new Error("useCategories must be used within CategoriesProvider")
  return ctx
}
