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

export async function downloadTransactionsXlsx() {
  const { data } = await http.get(API_PATHS.export.transactionsXlsx, {
    responseType: "blob",
  })
  return data
}

export async function downloadAuditXlsx() {
  const { data } = await http.get(API_PATHS.export.auditXlsx, {
    responseType: "blob",
  })
  return data
}
