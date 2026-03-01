import { http } from "@/lib/http"
import { API_PATHS } from "@/constants/api"

/** Download as blob using authenticated http (cookies + Bearer token). */
export async function downloadItemsXlsx() {
  const { data } = await http.get(API_PATHS.export.itemsXlsx, {
    responseType: "blob",
  })
  return data
}

export async function downloadItemsCsv() {
  const { data } = await http.get(API_PATHS.export.itemsCsv, {
    responseType: "blob",
  })
  return data
}

/**
 * @param {Object} [params] - Query params: from, to, type (e.g. ISSUANCE), itemType (e.g. ASSET, SUPPLY for issuance report).
 */
export async function downloadTransactionsXlsx(params = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== "") searchParams.set(key, value)
  })
  const query = searchParams.toString()
  const url = query
    ? `${API_PATHS.export.transactionsXlsx}?${query}`
    : API_PATHS.export.transactionsXlsx
  const { data } = await http.get(url, { responseType: "blob" })
  return data
}

export async function downloadAuditXlsx() {
  const { data } = await http.get(API_PATHS.export.auditXlsx, {
    responseType: "blob",
  })
  return data
}

export async function downloadDashboardSummaryXlsx() {
  const { data } = await http.get(API_PATHS.export.dashboardSummaryXlsx, {
    responseType: "blob",
  })
  return data
}

/**
 * Download full database backup as Excel (.xlsx)
 */
export async function downloadBackupXlsx() {
  const { data } = await http.get(API_PATHS.export.backupXlsx, {
    responseType: "blob",
  })
  return data
}

/**
 * Download full database backup as JSON
 */
export async function downloadBackupJson() {
  const { data } = await http.get(API_PATHS.export.backupJson, {
    responseType: "blob",
  })
  return data
}

/**
 * Download full database backup as CSV
 */
export async function downloadBackupCsv() {
  const { data } = await http.get(API_PATHS.export.backupCsv, {
    responseType: "blob",
  })
  return data
}
