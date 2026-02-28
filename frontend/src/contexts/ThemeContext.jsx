import { createContext, useContext, useEffect, useState } from "react"

const ThemeContext = createContext({
  themeColor: "red",
  setThemeColor: () => {},
})

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const [themeColor, setThemeColor] = useState(() => {
    return localStorage.getItem("themeColor") || "red"
  })

  useEffect(() => {
    const root = document.documentElement
    
    // Apply theme color as a data attribute
    root.setAttribute("data-theme", themeColor)
    
    // Save to localStorage
    localStorage.setItem("themeColor", themeColor)
  }, [themeColor])

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  )
}
