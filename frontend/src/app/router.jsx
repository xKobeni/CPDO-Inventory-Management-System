import { createBrowserRouter } from "react-router-dom"
import ProtectedRoute from "@/components/layout/ProtectedRoute"
import AppLayout from "@/components/layout/AppLayout"

import LoginPage from "@/pages/LoginPage"
import VerifyEmailPage from "@/pages/VerifyEmailPage"
import ForgotPasswordPage from "@/pages/ForgotPasswordPage"
import ResetPasswordPage from "@/pages/ResetPasswordPage"
import Unauthorized from "@/pages/Unauthorized"

import DashboardHome from "@/pages/DashboardHome"
import ItemsPage from "@/pages/ItemsPage"
import CategoryItemsPage from "@/pages/CategoryItemsPage"
import ManageCategoriesPage from "@/pages/ManageCategoriesPage"
import LowStockPage from "@/pages/LowStockPage"
import OutOfStockPage from "@/pages/OutOfStockPage"

// placeholders you’ll create:
import StockInPage from "@/pages/StockInPage"
import StockOutPage from "@/pages/StockOutPage"
import IssuancePage from "@/pages/IssuancePage"
import ReportsPage from "@/pages/ReportsPage"
import SettingsPage from "@/pages/SettingsPage"

// admin:
import UsersPage from "@/pages/UsersPage"
import AuditLogsPage from "@/pages/AuditLogsPage"

const ROLES = { ADMIN: "admin", STAFF: "staff" }

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/unauthorized", element: <Unauthorized /> },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />, // dashboard-01 shell
        children: [
          { path: "/", element: <DashboardHome /> },
          { path: "/dashboard", element: <DashboardHome /> },

          { path: "/items", element: <ItemsPage /> },
          { path: "/items/manage-categories", element: <ManageCategoriesPage /> },
          { path: "/items/low-stock", element: <LowStockPage /> },
          { path: "/items/out-of-stock", element: <OutOfStockPage /> },
          { path: "/items/category/:categorySlug", element: <CategoryItemsPage /> },
          { path: "/stock/in", element: <StockInPage /> },
          { path: "/stock/out", element: <StockOutPage /> },
          { path: "/issuance", element: <IssuancePage /> },
          { path: "/reports", element: <ReportsPage /> },
          { path: "/settings", element: <SettingsPage /> },

          // Admin-only routes
          {
            element: <ProtectedRoute allowRoles={[ROLES.ADMIN]} />,
            children: [
              { path: "/admin/users", element: <UsersPage /> },
              { path: "/admin/audit-logs", element: <AuditLogsPage /> },
            ],
          },
        ],
      },
    ],
  },
])