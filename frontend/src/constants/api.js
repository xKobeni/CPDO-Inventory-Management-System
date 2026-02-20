/**
 * API path constants. Base URL is set on the http client (VITE_API_BASE_URL).
 * Paths here are relative to that base (e.g. base is http://localhost:5000/api).
 */
export const API_PATHS = {
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    refresh: "/auth/refresh",
  },
  items: "/items",
  item: (id) => `/items/${id}`,
  itemsLowStock: "/items/low-stock",
  itemArchive: (id) => `/items/${id}/archive`,
  itemAssign: (id) => `/items/${id}/assign`,
  itemReturn: (id) => `/items/${id}/return`,
  itemTransfer: (id) => `/items/${id}/transfer`,
  transactions: "/transactions",
  transaction: (id) => `/transactions/${id}`,
  stockIn: "/transactions/stock-in",
  issuance: "/transactions/issuance",
  assetAssign: "/transactions/asset-assign",
  users: "/users",
  user: (id) => `/users/${id}`,
  userResetPassword: (id) => `/users/${id}/reset-password`,
  userDeactivate: (id) => `/users/${id}/deactivate`,
  userActivate: (id) => `/users/${id}/activate`,
  dashboard: {
    summary: "/dashboard/summary",
    categories: "/dashboard/categories",
    itemHistory: (id) => `/dashboard/item/${id}/history`,
  },
  export: {
    itemsXlsx: "/export/items.xlsx",
    itemsCsv: "/export/items.csv",
    transactionsXlsx: "/export/transactions.xlsx",
    auditXlsx: "/export/audit.xlsx",
  },
  import: {
    items: "/import/items",
  },
}
