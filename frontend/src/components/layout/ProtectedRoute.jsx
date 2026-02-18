import { Navigate, Outlet, useLocation } from "react-router-dom"
import { getToken, getUser } from "@/lib/auth"

export default function ProtectedRoute({ allowRoles }) {
  const location = useLocation()
  const token = getToken()
  const user = getUser()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (allowRoles?.length && !allowRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}