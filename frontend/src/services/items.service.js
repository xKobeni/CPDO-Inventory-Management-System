import { http } from "@/lib/http"
import { API_PATHS } from "@/constants/api"

/**
 * @param {{ q?: string, archived?: 'true'|'false', type?: string, category?: string }} params
 * @returns {Promise<Array>}
 */
export async function listItems(params = {}) {
  const { data } = await http.get(API_PATHS.items, { params })
  return data
}

export async function getLowStock() {
  const { data } = await http.get(API_PATHS.itemsLowStock)
  return data
}

/**
 * @param {Object} body - Item create payload (itemType, name, category, unit, etc.)
 * @returns {Promise<Object>}
 */
export async function createItem(body) {
  const { data } = await http.post(API_PATHS.items, body)
  return data
}

/**
 * @param {string} id - Item ID
 * @param {Object} body - Partial item update
 * @returns {Promise<Object>}
 */
export async function updateItem(id, body) {
  const { data } = await http.put(API_PATHS.item(id), body)
  return data
}

export async function archiveItem(id) {
  const { data } = await http.post(API_PATHS.itemArchive(id))
  return data
}

export async function restoreItem(id) {
  const { data } = await http.post(API_PATHS.itemRestore(id))
  return data
}

export async function deleteItem(id) {
  const { data } = await http.delete(API_PATHS.itemDelete(id))
  return data
}

/**
 * @param {string} id - Asset item ID
 * @param {{ accountablePerson?: { name?, position?, office? }, division?: string, remarks?: string, assignedDate?: string }} body
 * @returns {Promise<Object>}
 */
export async function assignAsset(id, body) {
  const { data } = await http.post(API_PATHS.itemAssign(id), body)
  return data
}

/**
 * @param {string} id - Asset item ID
 * @param {{ remarks?: string, returnedDate?: string }} body
 * @returns {Promise<Object>}
 */
export async function returnAsset(id, body = {}) {
  const { data } = await http.post(API_PATHS.itemReturn(id), body)
  return data
}

/**
 * @param {string} id - Asset item ID
 * @param {{ accountablePerson?: { name?, position?, office? }, division?: string, remarks?: string }} body
 * @returns {Promise<Object>}
 */
export async function transferAsset(id, body) {
  const { data } = await http.post(API_PATHS.itemTransfer(id), body)
  return data
}
