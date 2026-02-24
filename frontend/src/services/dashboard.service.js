import { http } from "@/lib/http"
import { API_PATHS } from "@/constants/api"

/**
 * @returns {Promise<{ kpis: Object, charts: Object, previews: Object }>}
 */
export async function getSummary() {
  const { data } = await http.get(API_PATHS.dashboard.summary)
  return data
}

/**
 * @param {{ type?: 'SUPPLY'|'ASSET' }} params
 * @returns {Promise<{ all: Array, supply: Array, asset: Array }>}
 */
export async function getCategories(params = {}) {
  const { data } = await http.get(API_PATHS.dashboard.categories, { params })
  return data
}

/**
 * @param {string} itemId
 * @returns {Promise<{ item: Object, transactions: Array, auditLogs: Array, timeline: Array }>}
 */
export async function getItemHistory(itemId) {
  const { data } = await http.get(API_PATHS.dashboard.itemHistory(itemId))
  return data
}

/**
 * @returns {Promise<Array>} All audit logs (up to 10000), sorted by createdAt desc
 */
export async function getAuditLogs() {
  const { data } = await http.get(API_PATHS.dashboard.auditLogs)
  return data
}
