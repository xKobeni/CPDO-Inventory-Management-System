import { createContext, useContext, useCallback, useEffect, useMemo, useState } from "react"
import { peopleService } from "@/services"

const PeopleContext = createContext(null)

export function PeopleProvider({ children }) {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshPeople = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await peopleService.listPeople({ active: "true" })
      setPeople(Array.isArray(data) ? data : [])
    } catch (err) {
      setPeople([])
      setError(err?.response?.data?.message ?? err?.message ?? "Failed to load people")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshPeople().catch(() => {})
  }, [refreshPeople])

  const peopleOptions = useMemo(() => {
    return (people || [])
      .filter((p) => p?.isActive !== false)
      .map((p) => ({
        id: p._id ?? p.id,
        name: p.name ?? "",
        position: p.position ?? "",
        office: p.office ?? "CPDC",
      }))
      .filter((p) => String(p.name).trim())
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [people])

  return (
    <PeopleContext.Provider
      value={{
        people,
        peopleOptions,
        loading,
        error,
        refreshPeople,
      }}
    >
      {children}
    </PeopleContext.Provider>
  )
}

export function usePeople() {
  const ctx = useContext(PeopleContext)
  if (!ctx) throw new Error("usePeople must be used within PeopleProvider")
  return ctx
}

