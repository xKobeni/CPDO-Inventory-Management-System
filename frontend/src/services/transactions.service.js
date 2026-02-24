import { http } from "@/lib/http"
import { API_PATHS } from "@/constants/api"

/**
 * @param {{ type?: string }} params
 * @returns {Promise<Array>}
 */
export async function listTransactions(params = {}) {
  const { data } = await http.get(API_PATHS.transactions, { params })
  return data
}

/**
 * @param {{ items: Array<{ itemId: string, qty: number }>, supplier?: string, referenceNo?: string }} body
 * @returns {Promise<Object>}
 */
export async function createStockIn(body) {
  const { data } = await http.post(API_PATHS.stockIn, body)
  return data
}

/**
 * @param {{ items: Array<{ itemId: string, qty: number }>, issuedToOffice: string, issuedToPerson?: string, purpose?: string, accountablePerson?: { name?, position?, office? } }} body
 * @returns {Promise<Object>}
 */
export async function createIssuance(body) {
  const { data } = await http.post(API_PATHS.issuance, body)
  return data
}

/**
 * Create ASSET_ASSIGN transaction; items get accountablePerson from the transaction.
 * @param {{ items: Array<{ itemId: string, qty?: number }>, accountablePerson: { name: string, position?: string, office?: string }, purpose?: string, remarks?: string }} body
 * @returns {Promise<Object>}
 */
export async function createAssetAssign(body) {
  const { data } = await http.post(API_PATHS.assetAssign, body)
  return data
}

/**
 * Remove an issuance transaction and return stock to inventory. Only ISSUANCE type.
 * @param {string} id - Transaction ID
 * @returns {Promise<Object>}
 */
export async function deleteIssuance(id) {
  const { data } = await http.delete(API_PATHS.transaction(id))
  return data
}

/**
 * Remove a single line item from an issuance/asset assignment transaction.
 * @param {string} txId
 * @param {string} itemId
 * @returns {Promise<Object>}
 */
export async function deleteIssuanceLine(txId, itemId) {
  const { data } = await http.delete(API_PATHS.transactionLine(txId, itemId))
  return data
}
