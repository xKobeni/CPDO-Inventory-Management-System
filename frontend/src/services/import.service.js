import { http } from "@/lib/http"
import { API_PATHS } from "@/constants/api"

/**
 * @param {File} file - Excel/CSV file for item import
 * @param {"upsert"|"createOnly"|"updateOnly"} mode - Import mode
 * @returns {Promise<Object>} - Import result { totalRows, inserted, updated, skipped, errors }
 */
export async function importItems(file, mode = "upsert") {
  const formData = new FormData()
  formData.append("file", file)
  const { data } = await http.post(`${API_PATHS.import.items}?mode=${mode}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })
  return data
}
