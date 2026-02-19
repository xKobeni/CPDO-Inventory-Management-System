import { createContext, useContext, useState, useCallback } from "react"
import { Pill, Box, Monitor, FlaskConical, Stethoscope, Car, Laptop } from "lucide-react"

const ICON_MAP = {
  Pill,
  Box,
  Monitor,
  FlaskConical,
  Stethoscope,
  Car,
  Laptop,
}

const INITIAL_CATEGORIES = [
  { id: "1", name: "Printer", slug: "printer", iconName: "Laptop" },
  { id: "2", name: "Drugs", slug: "drugs", iconName: "Pill" },
  { id: "3", name: "Furniture & Fixtures", slug: "furniture-fixtures", iconName: "Box" },
  { id: "4", name: "ICT Equipment", slug: "ict-equipment", iconName: "Monitor" },
  { id: "5", name: "Laboratory Equipment", slug: "laboratory-equipment", iconName: "FlaskConical" },
  { id: "6", name: "Medical Supplies", slug: "medical-supplies", iconName: "Stethoscope" },
  { id: "7", name: "Motor Vehicles", slug: "motor-vehicles", iconName: "Car" },
  { id: "8", name: "Office Equipment", slug: "office-equipment", iconName: "Laptop" },
]

const CategoriesContext = createContext(null)

export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState(INITIAL_CATEGORIES)

  const addCategory = useCallback(({ name, slug, iconName = "Box" }) => {
    const id = String(Date.now())
    setCategories((prev) => [...prev, { id, name, slug: slug || name.toLowerCase().replace(/\s+/g, "-"), iconName }])
  }, [])

  const updateCategory = useCallback((id, { name, slug, iconName }) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, ...(name && { name }), ...(slug && { slug }), ...(iconName && { iconName }) } : c
      )
    )
  }, [])

  const deleteCategory = useCallback((id) => {
    setCategories((prev) => prev.filter((c) => c.id !== id))
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

  return (
    <CategoriesContext.Provider
      value={{
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
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
