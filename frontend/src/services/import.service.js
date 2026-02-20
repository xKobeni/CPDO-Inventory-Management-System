import { http } from "@/lib/http"
import { API_PATHS } from "@/constants/api"

/**
 * @param {File} file - Excel/CSV file for item import
 * @returns {Promise<Object>} - Import result (e.g. { imported, errors })
 */
export async function importItems(file) {
  const formData = new FormData()
  formData.append("file", file)
  const { data } = await http.post(API_PATHS.import.items, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })
  return data
}
