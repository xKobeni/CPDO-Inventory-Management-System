import { http } from "@/lib/http"
import { API_PATHS } from "@/constants/api"

export async function listPeople(params = {}) {
  const { data } = await http.get(API_PATHS.people, { params })
  return Array.isArray(data) ? data : (data?.people ?? [])
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

