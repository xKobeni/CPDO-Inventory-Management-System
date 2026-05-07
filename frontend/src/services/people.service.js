import { http } from "@/lib/http"
import { API_PATHS } from "@/constants/api"

export async function listPeople(params = {}) {
  const { data } = await http.get(API_PATHS.people, { params })
  return Array.isArray(data) ? data : (data?.people ?? [])
}

/**
 * Fetch every person record (paginates with pageSize 500 until all pages are read).
 * For query flags see {@link listPeople} (e.g. active: "true").
 */
export async function listAllPeople(params = {}) {
  const merged = { ...params }
  const out = []
  let page = 1
  const pageSize = 500
  while (true) {
    const { data } = await http.get(API_PATHS.people, {
      params: { ...merged, page, pageSize },
    })
    const chunk = Array.isArray(data) ? data : (data?.people ?? [])
    const totalPages =
      typeof data?.totalPages === "number" && data.totalPages >= 1 ? data.totalPages : 1
    out.push(...chunk)
    if (page >= totalPages || chunk.length === 0) break
    page += 1
  }
  return out
}

export async function createPerson(body) {
  const { data } = await http.post(API_PATHS.people, body)
  return data
}

export async function deactivatePerson(id) {
  const { data } = await http.post(API_PATHS.personDeactivate(id))
  return data
}

export async function activatePerson(id) {
  const { data } = await http.post(API_PATHS.personActivate(id))
  return data
}

export async function updatePerson(id, body) {
  const { data } = await http.put(`${API_PATHS.people}/${id}`, body)
  return data
}

export async function deletePerson(id) {
  const { data } = await http.delete(`${API_PATHS.people}/${id}`)
  return data
}

