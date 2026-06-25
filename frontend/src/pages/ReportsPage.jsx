import { useState, useEffect, useMemo } from "react"
import {
  BarChart3,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileDown,
  Columns3,
  ChevronUp,
  ChevronDown,
  Search,
  Users,
  UserMinus,
  UserCheck,
  LayoutList,
} from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FloatingHelpButton } from "@/components/HelpButton"
import { reportsTutorialSteps } from "@/constants/tutorialSteps"
import {
  itemsService,
  transactionsService,
  dashboardService,
  peopleService,
} from "@/services"
import { getErrorMessage } from "@/utils/api"
import { useCategories } from "@/contexts/CategoriesContext"

const REPORT_TYPES = [
  { value: "dashboard-summary", label: "Dashboard Summary" },
  { value: "inventory", label: "Inventory Summary" },
  { value: "stock-in", label: "Stock In" },
  { value: "stock-out", label: "Stock Out" },
  { value: "movements", label: "Movements" },
  { value: "issuance", label: "Issuance" },
]

const EXPORT_FORMATS = [
  { value: "excel", label: "Excel", icon: FileSpreadsheet },
  { value: "csv", label: "CSV", icon: FileDown },
  { value: "pdf", label: "PDF", icon: FileDown },
  { value: "json", label: "JSON", icon: FileDown },
]

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function csvEscape(value) {
  const s = value == null ? "" : String(value)
  if (s.includes("\"") || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, "\"\"")}"`
  }
  return s
}

function buildCsvBlob(headers, rows) {
  const lines = []
  lines.push(headers.map(csvEscape).join(","))
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h] ?? "")).join(","))
  }
  return new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" })
}

function buildXlsxBlob(headers, rows, sheetName = "Report") {
  const normalized = rows.map((row) => {
    const obj = {}
    headers.forEach((h) => {
      obj[h] = row[h] ?? ""
    })
    return obj
  })
  const ws = XLSX.utils.json_to_sheet(normalized, { header: headers })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

function savePdfTable(headers, rows, title, options = {}) {
  const orientation = headers.length > 6 ? "landscape" : "portrait"
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" })
  const subtitle = options.subtitle || ""
  const insightsText = options.insightsText || ""
  doc.setFontSize(12)
  doc.text(title, 40, 36)
  if (subtitle) {
    doc.setFontSize(9)
    doc.setTextColor(90)
    doc.text(subtitle, 40, 50)
  }
  if (insightsText) {
    doc.setFontSize(10)
    doc.setTextColor(30)
    doc.text("Insights", 40, subtitle ? 70 : 58)
    doc.setFontSize(9)
    doc.setTextColor(70)
    const wrapped = doc.splitTextToSize(insightsText, 520)
    doc.text(wrapped, 40, subtitle ? 84 : 72)
  }
  const tableStartY = insightsText ? (subtitle ? 116 : 104) : (subtitle ? 64 : 50)
  autoTable(doc, {
    startY: tableStartY,
    head: [headers],
    body: rows.map((row) => headers.map((h) => String(row[h] ?? ""))),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [41, 41, 41] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 24, right: 24 },
  })
  doc.save(`${title.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

function buildPdfInsightsText({
  reportType,
  issuancePeopleView,
  issuanceSearchDisplayTerms,
  reportSearchText,
  filterCategory,
  filterAccountablePerson,
  filterItemType,
  filterStatus,
  resultCount,
  dateSummary,
  exportRows,
  peopleWithSearchedItems,
  peopleWithoutSearchedItems,
  issuanceDisplayResults,
}) {
  const preview = (arr, n = 4) => {
    const list = (arr || []).filter(Boolean)
    if (!list.length) return ""
    if (list.length <= n) return list.join(", ")
    return `${list.slice(0, n).join(", ")}, +${list.length - n} more`
  }
  const uniqueFromRows = (key) => {
    const s = new Set()
    ;(exportRows || []).forEach((r) => {
      const v = (r?.[key] ?? "").toString().trim()
      if (v && v !== "—") s.add(v)
    })
    return Array.from(s)
  }

  const terms = issuanceSearchDisplayTerms.length ? issuanceSearchDisplayTerms.join(", ") : "selected keywords"
  const termsShown = issuanceSearchDisplayTerms.length ? issuanceSearchDisplayTerms.join(", ") : "none"
  const filterBits = [
    filterCategory ? `Category = ${filterCategory}` : null,
    filterItemType ? `Item type = ${filterItemType}` : null,
    filterStatus ? `Status = ${filterStatus}` : null,
    filterAccountablePerson ? `Person = ${filterAccountablePerson}` : null,
    reportSearchText?.trim() ? `Search = ${reportSearchText.trim()}` : null,
  ].filter(Boolean)
  const filterSummary = filterBits.length ? filterBits.join("; ") : "no extra filter constraints"
  const dateText = dateSummary || "all time"

  if (reportType === "issuance" && issuancePeopleView === "without") {
    const samplePeople = preview(peopleWithoutSearchedItems, 5)
    return `Gap analysis (${dateText}): ${resultCount} people in the directory have no matching issuance lines for item keywords [${termsShown}]. Applied filters: ${filterSummary}. ${samplePeople ? `Examples include ${samplePeople}. ` : ""}Use this list as the follow-up queue for pending distribution and accountability completion.`
  }
  if (reportType === "issuance" && issuancePeopleView === "with") {
    const samplePeople = preview(peopleWithSearchedItems, 5)
    return `Coverage snapshot (${dateText}): ${resultCount} people have matching issuance lines for item keywords [${termsShown}]. Applied filters: ${filterSummary}. ${samplePeople ? `Examples include ${samplePeople}. ` : ""}Use this view to validate completed distribution and confirm who is already covered.`
  }
  if (reportType === "issuance" && issuancePeopleView === "lines") {
    const itemNames = []
    issuanceDisplayResults.forEach((tx) => {
      ;(tx.items || []).forEach((line) => {
        const nm = line?.itemId?.name
        if (nm) itemNames.push(nm)
      })
    })
    const uniqueItems = Array.from(new Set(itemNames))
    const uniquePeople = uniqueFromRows("Accountable Person")
    return `Issuance line report (${dateText}) with ${resultCount} matching rows, covering ${uniqueItems.length} unique item(s) and ${uniquePeople.length} accountable-person entries. Applied filters: ${filterSummary}. ${uniqueItems.length ? `Item preview: ${preview(uniqueItems, 5)}. ` : ""}This export matches the currently visible table columns for reconciliation and audit traceability.`
  }
  if (reportType === "inventory") {
    const categories = uniqueFromRows("Category")
    const types = uniqueFromRows("Type")
    return `Inventory position (${dateText}): ${resultCount} item row(s) match the active filters (${filterSummary}). ${categories.length ? `Categories represented: ${preview(categories, 4)}. ` : ""}${types.length ? `Item types in scope: ${preview(types, 2)}. ` : ""}Use this to validate stock posture and prioritize replenishment or redistribution.`
  }
  if (reportType === "stock-in") {
    const details = uniqueFromRows("Details")
    return `Inbound movement summary (${dateText}): ${resultCount} stock-in transaction(s) match the current filters (${filterSummary}). ${details.length ? `Source/reference preview: ${preview(details, 4)}. ` : ""}Use this to review receiving throughput and supplier/reference traceability across the selected period.`
  }
  if (reportType === "stock-out") {
    const details = uniqueFromRows("Details")
    return `Outbound movement summary (${dateText}): ${resultCount} stock-out/issuance transaction(s) match the current filters (${filterSummary}). ${details.length ? `Recipient/purpose preview: ${preview(details, 4)}. ` : ""}Use this to verify release destinations and accountability handoff trail.`
  }
  if (reportType === "movements") {
    const directionSet = new Set((exportRows || []).map((r) => r.Direction).filter(Boolean))
    const details = uniqueFromRows("Details")
    return `Movement summary (${dateText}): ${resultCount} mixed inbound/outbound transaction(s) match the current filters (${filterSummary}). Directions present: ${preview(Array.from(directionSet), 2) || "none"}. ${details.length ? `Details preview: ${preview(details, 4)}. ` : ""}Use this as a single timeline for receipts and issuances.`
  }
  if (reportType === "dashboard-summary") {
    const kpiRows = (exportRows || []).filter((r) => r.Section === "KPIs")
    const look = (metric) => {
      const row = kpiRows.find((r) => r.Metric === metric)
      return row ? row.Value : "n/a"
    }
    return `Executive dashboard summary (${dateText}) with key signals: Total Items ${look("Total Items")}, Active Items ${look("Active Items")}, Low Stock ${look("Low Stock Items")}, and Transactions This Month ${look("Transactions This Month")}. Use this snapshot for management-level monitoring and action prioritization.`
  }
  return `Report contains ${resultCount} record(s) with ${filterSummary} over ${dateText}.`
}

/** Ensure API response is an array (handles { items }, { transactions }, or raw array). */
function toArray(data) {
  if (Array.isArray(data)) return data
  if (data?.items && Array.isArray(data.items)) return data.items
  if (data?.transactions && Array.isArray(data.transactions)) return data.transactions
  if (data?.data && Array.isArray(data.data)) return data.data
  return []
}

/** Transaction type sent to API. Issuance page uses "ISSUANCE,ASSET_ASSIGN" to get both supply issuances and asset assignments. */
const TRANSACTION_TYPE_MAP = {
  "stock-in": "STOCK_IN",
  "stock-out": "STOCK_OUT",
  movements: "STOCK_IN,ISSUANCE",
  issuance: "ISSUANCE,ASSET_ASSIGN",
}

function todayYYYYMMDD() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function formatLocalYYYYMMDD(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * Local-calendar bounds for filtering / export. Returns null for "all time".
 * @param {string} preset
 * @param {string} customFrom
 * @param {string} customTo
 * @param {number} [selectedYear]
 * @returns {{ from: string, to: string } | null}
 */
function boundsForDatePreset(preset, customFrom, customTo, selectedYear) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const year = selectedYear || now.getFullYear()
  if (preset === "all") return null
  if (preset === "range") {
    return { from: (customFrom || "").trim(), to: (customTo || "").trim() }
  }
  if (preset === "today") {
    const s = formatLocalYYYYMMDD(today)
    return { from: s, to: s }
  }
  if (preset === "yesterday") {
    const y = new Date(today)
    y.setDate(y.getDate() - 1)
    const s = formatLocalYYYYMMDD(y)
    return { from: s, to: s }
  }
  if (preset === "last7") {
    const start = new Date(today)
    start.setDate(start.getDate() - 6)
    return { from: formatLocalYYYYMMDD(start), to: formatLocalYYYYMMDD(today) }
  }
  if (preset === "last30") {
    const start = new Date(today)
    start.setDate(start.getDate() - 29)
    return { from: formatLocalYYYYMMDD(start), to: formatLocalYYYYMMDD(today) }
  }
  if (preset === "this_month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: formatLocalYYYYMMDD(start), to: formatLocalYYYYMMDD(today) }
  }
  if (preset === "last_month") {
    const firstThisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDayPrev = new Date(firstThisMonth)
    lastDayPrev.setDate(0)
    const firstPrev = new Date(lastDayPrev.getFullYear(), lastDayPrev.getMonth(), 1)
    return { from: formatLocalYYYYMMDD(firstPrev), to: formatLocalYYYYMMDD(lastDayPrev) }
  }
  if (preset === "this_year") {
    const start = new Date(year, 0, 1)
    return { from: formatLocalYYYYMMDD(start), to: formatLocalYYYYMMDD(today) }
  }
  if (preset === "calendar_year") {
    const start = new Date(year, 0, 1)
    const end = new Date(year, 11, 31)
    return { from: formatLocalYYYYMMDD(start), to: formatLocalYYYYMMDD(end) }
  }
  if (preset === "q1") {
    const start = new Date(year, 0, 1)
    const end = new Date(year, 2, 31)
    return { from: formatLocalYYYYMMDD(start), to: formatLocalYYYYMMDD(end) }
  }
  if (preset === "q2") {
    const start = new Date(year, 3, 1)
    const end = new Date(year, 5, 30)
    return { from: formatLocalYYYYMMDD(start), to: formatLocalYYYYMMDD(end) }
  }
  if (preset === "q3") {
    const start = new Date(year, 6, 1)
    const end = new Date(year, 8, 30)
    return { from: formatLocalYYYYMMDD(start), to: formatLocalYYYYMMDD(end) }
  }
  if (preset === "q4") {
    const start = new Date(year, 9, 1)
    const end = new Date(year, 11, 31)
    return { from: formatLocalYYYYMMDD(start), to: formatLocalYYYYMMDD(end) }
  }
  return { from: (customFrom || "").trim(), to: (customTo || "").trim() }
}

function describeBoundsHuman(bounds) {
  if (!bounds?.from || !bounds?.to) return ""
  const a = new Date(bounds.from + "T12:00:00")
  const b = new Date(bounds.to + "T12:00:00")
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return ""
  const opts = { month: "short", day: "numeric", year: "numeric" }
  return `${a.toLocaleDateString(undefined, opts)} – ${b.toLocaleDateString(undefined, opts)}`
}

const DATE_RANGE_PRESET_OPTIONS = [
  { value: "last30", label: "Last 30 days" },
  { value: "last7", label: "Last 7 days" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
  { value: "calendar_year", label: "Calendar year…" },
  { value: "q1", label: "Q1 (Jan–Mar)" },
  { value: "q2", label: "Q2 (Apr–Jun)" },
  { value: "q3", label: "Q3 (Jul–Sep)" },
  { value: "q4", label: "Q4 (Oct–Dec)" },
  { value: "all", label: "All time" },
  { value: "range", label: "Custom dates…" },
]

const ITEM_STATUS_OPTIONS = [
  { value: "SUPPLY_IN_STOCK", label: "Supply · In Stock" },
  { value: "SUPPLY_LOW_STOCK", label: "Supply · Low Stock" },
  { value: "SUPPLY_OUT_OF_STOCK", label: "Supply · Out of Stock" },
  { value: "_separator_asset", label: "──────── Asset status ────────", disabled: true },
  { value: "IN_STOCK", label: "In Stock" },
  { value: "DEPLOYED", label: "Deployed" },
  { value: "FOR_REPAIR", label: "For Repair" },
  { value: "DISPOSED", label: "Disposed" },
  { value: "LOST", label: "Lost" },
]

function matchesInventoryStatusFilter(row, filterStatus) {
  if (!filterStatus) return true
  const isSupply = row?.itemType === "SUPPLY"
  const qty = Number(row?.quantityOnHand ?? row?.quantity ?? 0)
  const reorder = Number(row?.reorderLevel ?? 0)
  if (filterStatus === "SUPPLY_IN_STOCK") {
    return isSupply && qty > Math.max(reorder, 0)
  }
  if (filterStatus === "SUPPLY_LOW_STOCK") {
    return isSupply && qty > 0 && qty <= Math.max(reorder, 0)
  }
  if (filterStatus === "SUPPLY_OUT_OF_STOCK") {
    return isSupply && qty <= 0
  }
  return (row?.status || "") === filterStatus
}

function inventoryStatusLabel(row) {
  if ((row?.itemType || "") === "SUPPLY") {
    const qty = Number(row?.quantityOnHand ?? row?.quantity ?? 0)
    const reorder = Number(row?.reorderLevel ?? 0)
    if (qty <= 0) return "OUT_OF_STOCK"
    if (qty <= Math.max(reorder, 0)) return "LOW_STOCK"
    return "IN_STOCK"
  }
  return row?.status || "—"
}

function buildInventoryActionItems(rows) {
  const low = []
  const out = []
  ;(rows || []).forEach((r) => {
    if ((r?.itemType || "") !== "SUPPLY") return
    const qty = Number(r?.quantityOnHand ?? r?.quantity ?? 0)
    const reorder = Number(r?.reorderLevel ?? 0)
    if (qty <= 0) {
      out.push(r)
    } else if (qty <= Math.max(reorder, 0)) {
      low.push(r)
    }
  })
  return { low, out }
}

const ISSUANCE_TABLE_STORAGE_KEY = "cpdo-reports-issuance-table-v2"

const ISSUANCE_COLUMN_IDS = [
  "acquiredDate",
  "itemName",
  "category",
  "itemType",
  "qty",
  "amount",
  "property",
  "accountable",
  "transferredTo",
  "remarks",
  "txType",
]

const ISSUANCE_COLUMN_META = {
  acquiredDate: { label: "Acquired Date", headerClass: "tabular-nums", cellClass: "tabular-nums" },
  itemName: { label: "Item Name", cellClass: "font-medium" },
  category: { label: "Category" },
  itemType: { label: "Item type" },
  qty: { label: "Qty", headerClass: "tabular-nums text-right", cellClass: "tabular-nums text-right" },
  amount: { label: "Amount", headerClass: "tabular-nums", cellClass: "tabular-nums" },
  property: { label: "Property" },
  accountable: { label: "Accountable Person" },
  transferredTo: { label: "Transferred To" },
  remarks: { label: "Remarks" },
  txType: { label: "Transaction type" },
}

const ISSUANCE_TABLE_DEFAULT_LAYOUT = {
  order: [...ISSUANCE_COLUMN_IDS],
  visible: {
    acquiredDate: true,
    itemName: true,
    category: false,
    itemType: false,
    qty: false,
    amount: true,
    property: true,
    accountable: true,
    transferredTo: false,
    remarks: true,
    txType: false,
  },
}

function normalizeIssuanceTableLayout(saved) {
  const visible = { ...ISSUANCE_TABLE_DEFAULT_LAYOUT.visible }
  const baseOrder = [...ISSUANCE_TABLE_DEFAULT_LAYOUT.order]
  if (!saved || !Array.isArray(saved.order)) {
    return { order: baseOrder, visible }
  }
  const order = []
  const seen = new Set()
  for (const id of saved.order) {
    if (ISSUANCE_COLUMN_IDS.includes(id) && !seen.has(id)) {
      order.push(id)
      seen.add(id)
    }
  }
  for (const id of ISSUANCE_COLUMN_IDS) {
    if (!seen.has(id)) order.push(id)
  }
  if (saved.visible && typeof saved.visible === "object") {
    for (const id of ISSUANCE_COLUMN_IDS) {
      if (typeof saved.visible[id] === "boolean") visible[id] = saved.visible[id]
    }
  }
  if (!order.some((id) => visible[id])) visible.itemName = true
  return { order, visible }
}

function loadIssuanceTableLayout() {
  try {
    const raw = localStorage.getItem(ISSUANCE_TABLE_STORAGE_KEY)
    if (!raw) return normalizeIssuanceTableLayout(null)
    return normalizeIssuanceTableLayout(JSON.parse(raw))
  } catch {
    return normalizeIssuanceTableLayout(null)
  }
}

function moveIssuanceColumnOrder(order, index, delta) {
  const j = index + delta
  if (j < 0 || j >= order.length) return order
  const next = [...order]
  ;[next[index], next[j]] = [next[j], next[index]]
  return next
}

function buildIssuanceRowParts(tx, line) {
  const item = typeof line.itemId === "object" && line.itemId != null ? line.itemId : null
  const acc = item?.accountablePerson ?? tx.accountablePerson ?? {}
  const accName = (typeof acc === "object" ? acc.name : null) ?? tx.issuedToPerson ?? ""
  const acquiredDate = item?.dateAcquired ?? tx.createdAt ?? tx.date
  const lineQty = line.qty ?? line.quantity ?? 1
  return {
    item,
    acc,
    accName,
    acquiredDate,
    lineQty,
    txType: tx.type ?? "—",
    remarks: tx.purpose ?? "—",
  }
}

function issuanceCellText(colId, parts) {
  const { item, acc, accName, acquiredDate, lineQty, txType, remarks } = parts
  switch (colId) {
    case "acquiredDate":
      return acquiredDate ? new Date(acquiredDate).toLocaleDateString() : "—"
    case "itemName":
      return item?.name ?? "—"
    case "category":
      return item?.category ?? "—"
    case "itemType":
      return item?.itemType ?? "—"
    case "qty":
      return String(lineQty)
    case "amount":
      return item?.unitCost != null && Number(item.unitCost) > 0
        ? Number(item.unitCost).toLocaleString()
        : "—"
    case "property":
      return item?.propertyNumber ?? "—"
    case "accountable":
      return accName
        ? [accName, typeof acc === "object" ? acc.position : null]
            .filter(Boolean)
            .join(" · ") || accName
        : "—"
    case "transferredTo":
      return item?.transferredTo ?? "—"
    case "remarks":
      return remarks
    case "txType":
      return txType
    default:
      return "—"
  }
}

/** Split user input into trimmed lowercase tokens (comma, semicolon, or newline). */
function parseIssuanceItemSearchTokens(raw) {
  if (!raw || typeof raw !== "string") return []
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

function itemNameMatchesIssuanceTokens(itemName, tokensLower) {
  if (!tokensLower.length) return true
  const n = (itemName || "").toLowerCase()
  return tokensLower.some((t) => n.includes(t))
}

function haystackMatchesReportTokens(haystackLower, tokensLower) {
  if (!tokensLower.length) return true
  return tokensLower.some((t) => haystackLower.includes(t))
}

function inventoryRowMatchesReportSearch(row, tokensLower) {
  if (!tokensLower.length) return true
  const parts = [
    row.name,
    row.category,
    row.unit,
    row.propertyNumber,
    row.itemType,
    row.accountablePerson?.name,
    row.accountablePerson?.office,
    row.accountablePerson?.position,
    row.division,
    row.remarks,
  ]
  const hay = parts.filter(Boolean).join(" ").toLowerCase()
  return haystackMatchesReportTokens(hay, tokensLower)
}

function transactionMatchesReportSearch(tx, tokensLower) {
  if (!tokensLower.length) return true
  const parts = [
    tx.supplier,
    tx.referenceNo,
    tx.purpose,
    tx.issuedToOffice,
    tx.issuedToPerson,
    tx.type,
    tx.remarks,
  ]
  if (typeof tx.accountablePerson === "object" && tx.accountablePerson != null) {
    parts.push(tx.accountablePerson.name, tx.accountablePerson.office, tx.accountablePerson.position)
  }
  if (typeof tx.createdBy === "object" && tx.createdBy != null) {
    parts.push(tx.createdBy.name)
  } else if (typeof tx.createdBy === "string") {
    parts.push(tx.createdBy)
  }
  ;(tx.items ?? []).forEach((line) => {
    const item = typeof line.itemId === "object" && line.itemId != null ? line.itemId : null
    if (item) {
      parts.push(item.name, item.category, item.propertyNumber, item.itemType)
    }
  })
  const hay = parts.filter(Boolean).join(" ").toLowerCase()
  return haystackMatchesReportTokens(hay, tokensLower)
}

function personNameFromIssuanceLine(tx, line) {
  const item = typeof line.itemId === "object" && line.itemId != null ? line.itemId : null
  const acc = item?.accountablePerson ?? tx.accountablePerson ?? {}
  const fromAcc =
    typeof acc === "object" && acc != null ? (acc.name || "").trim() : ""
  const fallback = (tx.issuedToPerson || "").trim()
  return fromAcc || fallback
}

export default function ReportsPage() {
  const { categories } = useCategories()
  const [reportType, setReportType] = useState("inventory")
  const [dateRangePreset, setDateRangePreset] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [reportYear, setReportYear] = useState(() => new Date().getFullYear())
  const [issuanceItemType, setIssuanceItemType] = useState("all")
  const [issuanceItemSearch, setIssuanceItemSearch] = useState("")
  const [issuancePeopleView, setIssuancePeopleView] = useState("lines")
  const [filterCategory, setFilterCategory] = useState("")
  const [filterAccountablePerson, setFilterAccountablePerson] = useState("")
  const [filterItemType, setFilterItemType] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [reportSearchText, setReportSearchText] = useState("")
  const [accountablePersonOptions, setAccountablePersonOptions] = useState([])
  const [hasResults, setHasResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const [pdfInsightMode, setPdfInsightMode] = useState("auto")
  const [pdfCustomInsight, setPdfCustomInsight] = useState("")
  const [pdfPendingExport, setPdfPendingExport] = useState(null)
  const [inventoryResults, setInventoryResults] = useState([])
  const [txResults, setTxResults] = useState([])
  const [dashboardResults, setDashboardResults] = useState(null)
  /** All people from Settings → People (system directory), loaded when Issuance report is selected. */
  const [systemPersonNames, setSystemPersonNames] = useState([])
  const [systemPeopleLoading, setSystemPeopleLoading] = useState(false)
  const [issuanceTableLayout, setIssuanceTableLayout] = useState(loadIssuanceTableLayout)
  /** Draft text by transaction id while editing issuance remarks (shared by all lines of that tx). */
  const [issuanceRemarksDraft, setIssuanceRemarksDraft] = useState({})
  const [savingIssuancePurposeTxId, setSavingIssuancePurposeTxId] = useState(null)

  const isInventory = reportType === "inventory"
  const results = isInventory ? inventoryResults : txResults

  const effectiveReportBounds = useMemo(
    () => boundsForDatePreset(dateRangePreset, dateFrom, dateTo, reportYear),
    [dateRangePreset, dateFrom, dateTo, reportYear]
  )

  const issuanceSearchTokens = useMemo(
    () => parseIssuanceItemSearchTokens(issuanceItemSearch),
    [issuanceItemSearch]
  )

  /** Original trimmed terms for UI chips (not lowercased). */
  const issuanceSearchDisplayTerms = useMemo(() => {
    if (!issuanceItemSearch || typeof issuanceItemSearch !== "string") return []
    return issuanceItemSearch
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }, [issuanceItemSearch])

  const visibleIssuanceColumns = useMemo(
    () => issuanceTableLayout.order.filter((id) => issuanceTableLayout.visible[id]),
    [issuanceTableLayout.order, issuanceTableLayout.visible]
  )

  useEffect(() => {
    try {
      localStorage.setItem(ISSUANCE_TABLE_STORAGE_KEY, JSON.stringify(issuanceTableLayout))
    } catch {
      /* quota / private mode */
    }
  }, [issuanceTableLayout])

  const filteredCategoryOptions = useMemo(() => {
    const itemType = reportType === "issuance" ? issuanceItemType : filterItemType
    if (!itemType || itemType === "all" || itemType === "_all") return categories
    return (categories || []).filter((c) => c.itemType === itemType)
  }, [categories, issuanceItemType, filterItemType, reportType])

  useEffect(() => {
    if (!filterCategory) return
    const stillValid = (filteredCategoryOptions || []).some((c) => c.name === filterCategory)
    if (!stillValid) setFilterCategory("")
  }, [filterCategory, filteredCategoryOptions])

  useEffect(() => {
    if (!filterCategory) return
    const cat = (categories || []).find((c) => c.name === filterCategory)
    if (!cat?.itemType) return
    if (reportType === "issuance") {
      if (issuanceItemType !== cat.itemType) setIssuanceItemType(cat.itemType)
    } else {
      if (filterItemType !== cat.itemType) setFilterItemType(cat.itemType)
    }
  }, [filterCategory, categories, reportType])

  const reportSearchTokens = useMemo(
    () => parseIssuanceItemSearchTokens(reportSearchText),
    [reportSearchText]
  )

  const inventoryDisplayResults = useMemo(() => {
    if (reportType !== "inventory") return []
    return inventoryResults.filter((r) => inventoryRowMatchesReportSearch(r, reportSearchTokens))
  }, [reportType, inventoryResults, reportSearchTokens])

  const stockMovementDisplayResults = useMemo(() => {
    if (reportType !== "stock-in" && reportType !== "stock-out" && reportType !== "movements") return []
    return txResults.filter((tx) => transactionMatchesReportSearch(tx, reportSearchTokens))
  }, [reportType, txResults, reportSearchTokens])

  const movementLineResults = useMemo(() => {
    if (reportType !== "movements") return []
    const lines = []
    ;(txResults || []).forEach((tx, txIdx) => {
      ;(tx.items || []).forEach((line, lineIdx) => {
        const item = typeof line.itemId === "object" && line.itemId != null ? line.itemId : null
        if (!item || item.itemType !== "SUPPLY") return

        // For movements page in reports, focus on supply in/out.
        const qty = Number(line.qty ?? line.quantity ?? 0)
        if (!qty) return
        const type = String(tx.type || "")
        const delta = type === "STOCK_IN" ? qty : type === "ISSUANCE" ? -qty : 0
        if (!delta) return

        const searchHay = [
          item.name,
          item.category,
          item.unit,
          item.propertyNumber,
          tx.purpose,
          tx.supplier,
          tx.referenceNo,
          tx.issuedToOffice,
          tx.issuedToPerson,
          typeof tx.createdBy === "object" ? tx.createdBy?.name : tx.createdBy,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!haystackMatchesReportTokens(searchHay, reportSearchTokens)) return

        lines.push({
          key: `${tx._id ?? tx.id ?? txIdx}-${item._id ?? item.id ?? lineIdx}`,
          tx,
          item,
          qty,
          delta,
          type,
        })
      })
    })

    const byItem = new Map()
    lines.forEach((r) => {
      const itemId = String(r.item?._id ?? r.item?.id ?? "")
      if (!itemId) return
      if (!byItem.has(itemId)) byItem.set(itemId, [])
      byItem.get(itemId).push(r)
    })

    const out = []
    byItem.forEach((list) => {
      list.sort((a, b) => new Date(b.tx?.createdAt || 0) - new Date(a.tx?.createdAt || 0))
      let running = Number(list[0]?.item?.quantityOnHand ?? 0)
      list.forEach((r) => {
        const balanceAfter = Math.max(0, running)
        const balanceBefore = Math.max(0, running - r.delta)
        out.push({ ...r, balanceBefore, balanceAfter })
        running = balanceBefore
      })
    })
    out.sort((a, b) => new Date(b.tx?.createdAt || 0) - new Date(a.tx?.createdAt || 0))
    return out
  }, [reportType, txResults, reportSearchTokens])

  const issuanceDisplayResults = useMemo(() => {
    if (reportType !== "issuance" || !Array.isArray(txResults)) return []
    return txResults
      .map((tx) => ({
        ...tx,
        items: (tx.items ?? []).filter((line) => {
          if (issuanceItemType !== "all" && (line.itemId?.itemType ?? "") !== issuanceItemType) {
            return false
          }
          if (filterAccountablePerson) {
            const itemAccName = line.itemId?.accountablePerson?.name?.trim()
            const txAccName = tx.accountablePerson?.name?.trim() || tx.issuedToPerson?.trim()
            if (itemAccName !== filterAccountablePerson && txAccName !== filterAccountablePerson) {
              return false
            }
          }
          const item = typeof line.itemId === "object" && line.itemId != null ? line.itemId : null
          if (!itemNameMatchesIssuanceTokens(item?.name, issuanceSearchTokens)) {
            return false
          }
          return true
        }),
      }))
      .filter((tx) => (tx.items ?? []).length > 0)
  }, [
    reportType,
    txResults,
    issuanceItemType,
    filterAccountablePerson,
    issuanceSearchTokens,
  ])

  const peopleWithSearchedItems = useMemo(() => {
    if (!issuanceSearchTokens.length) return []
    const names = new Set()
    issuanceDisplayResults.forEach((tx) => {
      ;(tx.items ?? []).forEach((line) => {
        const nm = personNameFromIssuanceLine(tx, line)
        if (nm) names.add(nm)
      })
    })
    return Array.from(names).sort()
  }, [issuanceDisplayResults, issuanceSearchTokens])

  const peopleWithoutSearchedItems = useMemo(() => {
    if (!issuanceSearchTokens.length) return []
    const receivedLower = new Set(peopleWithSearchedItems.map((n) => n.toLowerCase()))
    return systemPersonNames.filter((n) => !receivedLower.has(n.toLowerCase()))
  }, [peopleWithSearchedItems, systemPersonNames, issuanceSearchTokens])

  const issuanceLineRowCount = issuanceDisplayResults.reduce(
    (sum, tx) => sum + (tx.items ?? []).length,
    0
  )

  const resultCount =
    reportType === "issuance"
      ? issuancePeopleView !== "lines"
        ? issuanceSearchTokens.length
          ? issuancePeopleView === "with"
            ? peopleWithSearchedItems.length
            : peopleWithoutSearchedItems.length
          : 0
        : issuanceLineRowCount
      : reportType === "dashboard-summary"
        ? dashboardResults
          ? 1
          : 0
        : reportType === "inventory"
          ? inventoryDisplayResults.length
          : reportType === "stock-in" || reportType === "stock-out" || reportType === "movements"
            ? reportType === "movements"
              ? movementLineResults.length
              : stockMovementDisplayResults.length
            : Array.isArray(results)
              ? results.length
              : 0

  const resultsForTable =
    reportType === "issuance"
      ? issuanceDisplayResults
      : reportType === "inventory"
        ? inventoryDisplayResults
        : reportType === "stock-in" || reportType === "stock-out" || reportType === "movements"
          ? reportType === "movements"
            ? movementLineResults
            : stockMovementDisplayResults
          : results

  const inventoryActionSummary = useMemo(() => {
    if (reportType !== "inventory") return { low: [], out: [] }
    return buildInventoryActionItems(resultsForTable)
  }, [reportType, resultsForTable])

  const exportView = useMemo(() => {
    if (reportType === "dashboard-summary" && dashboardResults) {
      const headers = ["Section", "Metric", "Value"]
      const rows = []
      const kpis = dashboardResults.kpis || {}
      const pushMetric = (section, metric, value) => {
        rows.push({ Section: section, Metric: metric, Value: value ?? 0 })
      }
      pushMetric("KPIs", "Total Items", kpis.totalItems)
      pushMetric("KPIs", "Active Items", kpis.activeItems)
      pushMetric("KPIs", "Archived Items", kpis.archivedItems)
      pushMetric("KPIs", "Total Supplies", kpis.totalSupplies)
      pushMetric("KPIs", "Total Assets", kpis.totalAssets)
      pushMetric("KPIs", "Deployed Assets", kpis.deployedAssets)
      pushMetric("KPIs", "Out of Stock Items", kpis.outOfStockCount)
      pushMetric("KPIs", "Low Stock Items", kpis.lowStockCount)
      pushMetric("KPIs", "Transactions Today", kpis.txToday)
      pushMetric("KPIs", "Transactions This Month", kpis.txThisMonth)
      ;(dashboardResults.charts?.suppliesByCategory || []).forEach((r) => {
        pushMetric("Supplies by Category", r.category || "Uncategorized", r.count)
      })
      ;(dashboardResults.charts?.assetsByStatus || []).forEach((r) => {
        pushMetric("Assets by Status", r.status || "—", r.count)
      })
      return { headers, rows, sheetName: "Dashboard Summary" }
    }

    if (reportType === "inventory") {
      const headers = ["Item Name", "Category", "Quantity", "Unit", "Type", "Status"]
      const rows = resultsForTable.map((r) => ({
        "Item Name": r.name ?? "—",
        Category: r.category ?? "—",
        Quantity: r.itemType === "SUPPLY" ? (r.quantityOnHand ?? r.quantity ?? 0) : 1,
        Unit: r.unit ?? "—",
        Type: r.itemType ?? "—",
        Status: inventoryStatusLabel(r),
      }))
      return { headers, rows, sheetName: "Inventory" }
    }

    if (reportType === "stock-in" || reportType === "stock-out") {
      const headers = ["Date", "Type", "Items", "Details", "By"]
      const rows = resultsForTable.map((tx) => {
        const itemLines = (tx.items ?? []).map((line) => {
          const name = typeof line.itemId === "object" && line.itemId != null ? line.itemId.name : null
          const qty = line.qty ?? line.quantity ?? 1
          return `${qty}× ${name ?? "—"}`
        })
        const details =
          reportType === "stock-in"
            ? tx.supplier
              ? `Supplier: ${tx.supplier}`
              : tx.referenceNo ?? "—"
            : tx.issuedToOffice
              ? `${tx.issuedToOffice}${tx.issuedToPerson ? ` · ${tx.issuedToPerson}` : ""}`
              : tx.purpose ?? "—"
        return {
          Date: (tx.createdAt ?? tx.date) ? new Date(tx.createdAt ?? tx.date).toLocaleDateString() : "—",
          Type: tx.type ?? "—",
          Items: itemLines.join(", ") || "—",
          Details: details,
          By: typeof tx.createdBy === "object" && tx.createdBy?.name ? tx.createdBy.name : tx.createdBy ?? "—",
        }
      })
      return { headers, rows, sheetName: reportType === "stock-in" ? "Stock In" : "Stock Out" }
    }

    if (reportType === "movements") {
      const headers = ["Date", "Item", "Type", "Qty Change", "Balance Before", "Balance After", "Remarks", "By"]
      const rows = resultsForTable.map((row) => {
        const directionType = row.type === "STOCK_IN" ? "Stock In" : "Stock Out"
        const qtyChange = `${row.delta > 0 ? "+" : ""}${row.delta}${row.item?.unit ? ` ${row.item.unit}` : ""}`
        const remarks = row.tx?.purpose || row.tx?.remarks || "N/A"
        return {
          Date: (row.tx?.createdAt ?? row.tx?.date) ? new Date(row.tx?.createdAt ?? row.tx?.date).toLocaleDateString() : "—",
          Item: row.item?.name ?? "—",
          Type: directionType,
          "Qty Change": qtyChange,
          "Balance Before": Number.isFinite(row.balanceBefore) ? row.balanceBefore : "—",
          "Balance After": Number.isFinite(row.balanceAfter) ? row.balanceAfter : "—",
          Remarks: remarks,
          By: typeof row.tx?.createdBy === "object" && row.tx?.createdBy?.name ? row.tx.createdBy.name : row.tx?.createdBy ?? "—",
        }
      })
      return { headers, rows, sheetName: "Movements" }
    }

    if (reportType === "issuance" && issuancePeopleView === "lines") {
      const headers = visibleIssuanceColumns.map((id) => ISSUANCE_COLUMN_META[id]?.label ?? id)
      const rows = resultsForTable.flatMap((tx) =>
        (tx.items ?? []).map((line) => {
          const parts = buildIssuanceRowParts(tx, line)
          const row = {}
          visibleIssuanceColumns.forEach((colId) => {
            const header = ISSUANCE_COLUMN_META[colId]?.label ?? colId
            row[header] = issuanceCellText(colId, parts)
          })
          return row
        })
      )
      return { headers, rows, sheetName: "Issuance" }
    }

    if (reportType === "issuance" && issuancePeopleView !== "lines") {
      const list = issuancePeopleView === "with" ? peopleWithSearchedItems : peopleWithoutSearchedItems
      const headers = ["#", "Person", "Status"]
      const rows = list.map((name, i) => ({
        "#": i + 1,
        Person: name,
        Status: issuancePeopleView === "with" ? "Match" : "No match",
      }))
      return { headers, rows, sheetName: issuancePeopleView === "with" ? "Has Match" : "No Match" }
    }

    return { headers: [], rows: [], sheetName: "Report" }
  }, [
    reportType,
    dashboardResults,
    resultsForTable,
    issuancePeopleView,
    visibleIssuanceColumns,
    peopleWithSearchedItems,
    peopleWithoutSearchedItems,
  ])

  useEffect(() => {
    const needsPersonOptions =
      reportType === "issuance" ||
      reportType === "inventory" ||
      reportType === "stock-in" ||
      reportType === "stock-out" ||
      reportType === "movements"
    if (!needsPersonOptions) {
      setAccountablePersonOptions([])
      return
    }
    
    let cancelled = false
    
    // Fetch accountable persons from items
    const namesSet = new Set()
    
    const requests = [
      itemsService.listItems({ archived: "false" }),
      transactionsService.listTransactions({ type: "ISSUANCE,ASSET_ASSIGN" }),
      transactionsService.listTransactions({ type: "STOCK_IN" }),
    ]
    if (reportType !== "issuance") {
      requests.push(peopleService.listAllPeople())
    }

    Promise.all(requests)
      .then((responses) => {
        if (cancelled) return

        const itemsData = responses[0]
        const issuanceTxData = responses[1]
        const movementTxData = responses[2]
        const peopleRows = reportType !== "issuance" ? responses[3] : []

        ;(itemsData || []).forEach((item) => {
          const name = item.accountablePerson?.name?.trim()
          if (name) namesSet.add(name)
        })

        const mergeTxNames = (txList) => {
          txList.forEach((tx) => {
            const txAccName = tx.accountablePerson?.name?.trim() || tx.issuedToPerson?.trim()
            if (txAccName) namesSet.add(txAccName)
            ;(tx.items || []).forEach((line) => {
              const itemAccName = line.itemId?.accountablePerson?.name?.trim()
              if (itemAccName) namesSet.add(itemAccName)
            })
          })
        }

        mergeTxNames(toArray(issuanceTxData))
        mergeTxNames(toArray(movementTxData))

        ;(peopleRows || []).forEach((p) => {
          const n = (p.name || "").trim()
          if (n) namesSet.add(n)
        })

        setAccountablePersonOptions(Array.from(namesSet).sort())
      })
      .catch(() => {
        if (!cancelled) setAccountablePersonOptions([])
      })
      
    return () => { cancelled = true }
  }, [reportType])

  useEffect(() => {
    if (reportType !== "issuance") {
      setSystemPersonNames([])
      setSystemPeopleLoading(false)
      return
    }
    let cancelled = false
    setSystemPeopleLoading(true)
    peopleService
      .listAllPeople()
      .then((rows) => {
        if (cancelled) return
        const seen = new Set()
        const names = []
        for (const p of rows) {
          const n = (p.name || "").trim()
          if (!n) continue
          const key = n.toLowerCase()
          if (seen.has(key)) continue
          seen.add(key)
          names.push(n)
        }
        names.sort((a, b) => a.localeCompare(b))
        setSystemPersonNames(names)
      })
      .catch(() => {
        if (!cancelled) {
          setSystemPersonNames([])
          toast.error("Could not load the people directory.")
        }
      })
      .finally(() => {
        if (!cancelled) setSystemPeopleLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reportType])

  const handleDatePresetChange = (value) => {
    if (value === "range") {
      const seed = boundsForDatePreset(dateRangePreset, dateFrom, dateTo, reportYear)
      if (seed?.from && seed?.to) {
        setDateFrom(seed.from)
        setDateTo(seed.to)
      }
    }
    setDateRangePreset(value)
  }

  const applyFilters = (data, isInv) => {
    if (!data || !Array.isArray(data)) return data
    let out = data
    if (filterCategory) {
      if (isInv) {
        out = out.filter((r) => (r.category || "").trim() === filterCategory)
      } else {
        out = out.filter((tx) => {
          const items = tx.items ?? []
          return items.some((line) => (line.itemId?.category || "").trim() === filterCategory)
        })
      }
    }
    // Item type filter for non-issuance reports
    if (filterItemType && reportType !== "issuance") {
      if (isInv) {
        out = out.filter((r) => (r.itemType || "") === filterItemType)
      } else {
        out = out.filter((tx) => {
          const items = tx.items ?? []
          return items.some((line) => (line.itemId?.itemType || "") === filterItemType)
        })
      }
    }
    if (filterStatus && isInv) {
      out = out.filter((r) => matchesInventoryStatusFilter(r, filterStatus))
    }
    // For issuance reports, accountable person filtering is done at item level in issuanceDisplayResults
    if (filterAccountablePerson && reportType !== "issuance") {
      if (isInv) {
        out = out.filter(
          (r) => (r.accountablePerson?.name || "").trim() === filterAccountablePerson
        )
      } else {
        out = out.filter((tx) => {
          const items = tx.items ?? []
          const acc = tx.accountablePerson?.name?.trim() || tx.issuedToPerson?.trim()
          if (acc === filterAccountablePerson) return true
          return items.some(
            (line) => (line.itemId?.accountablePerson?.name || "").trim() === filterAccountablePerson
          )
        })
      }
    }
    return out
  }

  const handleReportTypeChange = (value) => {
    setReportType(value)
    setIssuanceItemType("all")
    setIssuanceItemSearch("")
    setIssuancePeopleView("lines")
    setFilterCategory("")
    setFilterAccountablePerson("")
    setFilterItemType("")
    setFilterStatus("")
    setReportSearchText("")
    setIssuanceRemarksDraft({})
    setHasResults(false)
  }

  const handleGenerate = async () => {
    setLoading(true)
    setHasResults(false)
    setIssuanceRemarksDraft({})
    try {
      if (reportType === "dashboard-summary") {
        const data = await dashboardService.getSummary()
        setDashboardResults(data)
      } else if (reportType === "inventory") {
        const params = { archived: "false" }
        if (filterCategory) params.category = filterCategory
        const raw = await itemsService.listItems(params)
        const data = toArray(raw)
        const filtered = applyFilters(data, true)
        setInventoryResults(Array.isArray(filtered) ? filtered : [])
      } else {
        const bounds = boundsForDatePreset(dateRangePreset, dateFrom, dateTo, reportYear)
        if (dateRangePreset === "range" && bounds && (!bounds.from || !bounds.to)) {
          toast.error("Choose both a start date and an end date.")
          return
        }
        const type = TRANSACTION_TYPE_MAP[reportType] ?? "ISSUANCE"
        let raw = await transactionsService.listTransactions({ type })
        let list = toArray(raw)
        if (list.length === 0 && reportType === "stock-out") {
          raw = await transactionsService.listTransactions({ type: "ISSUANCE" })
          list = toArray(raw)
        }
        const byDate =
          bounds == null
            ? list
            : list.filter((tx) => {
                if (reportType === "issuance") {
                  const items = tx.items ?? []
                  if (items.length === 0) return false
                  return items.some((line) => {
                    const item = typeof line.itemId === "object" && line.itemId != null ? line.itemId : null
                    if (!item) return false
                    const dateVal = item.dateAcquired
                    if (!dateVal) return false
                    const itemDate = new Date(dateVal)
                    if (Number.isNaN(itemDate.getTime())) return false
                    const itemLocalDate = formatLocalYYYYMMDD(itemDate)
                    return itemLocalDate >= bounds.from && itemLocalDate <= bounds.to
                  })
                }
                const dateVal = tx.createdAt ?? tx.date ?? tx.transactionDate ?? tx.updatedAt
                if (!dateVal) return true
                const txDate = new Date(dateVal)
                if (Number.isNaN(txDate.getTime())) return true
                const txLocalDate = formatLocalYYYYMMDD(txDate)
                return txLocalDate >= bounds.from && txLocalDate <= bounds.to
              })
        const filtered = applyFilters(byDate, false)
        setTxResults(Array.isArray(filtered) ? filtered : [])
      }
      setHasResults(true)
      toast.success("Report generated.")
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format) => {
    setExporting(true)
    try {
      if (!hasResults) {
        toast.error("Generate the report first.")
        return
      }
      if (!exportView.headers.length || !exportView.rows.length) {
        toast.error("No visible table rows to export.")
        return
      }
      const stamp = new Date().toISOString().slice(0, 10)
      if (format === "csv") {
        const blob = buildCsvBlob(exportView.headers, exportView.rows)
        downloadBlob(blob, `${reportType}_${stamp}.csv`)
      } else if (format === "excel") {
        const blob = buildXlsxBlob(exportView.headers, exportView.rows, exportView.sheetName)
        downloadBlob(blob, `${reportType}_${stamp}.xlsx`)
      } else if (format === "pdf") {
        const dateSummary =
          effectiveReportBounds == null
            ? "all time"
            : effectiveReportBounds.from && effectiveReportBounds.to
              ? `${effectiveReportBounds.from} to ${effectiveReportBounds.to}`
              : ""
        const autoInsights = buildPdfInsightsText({
          reportType,
          issuancePeopleView,
          issuanceSearchDisplayTerms,
          reportSearchText,
          filterCategory,
          filterAccountablePerson,
          filterItemType,
          filterStatus,
          resultCount,
          dateSummary,
          exportRows: exportView.rows,
          peopleWithSearchedItems,
          peopleWithoutSearchedItems,
          issuanceDisplayResults,
        })
        const subtitle =
          effectiveReportBounds == null
            ? "All time"
            : effectiveReportBounds.from && effectiveReportBounds.to
              ? `${effectiveReportBounds.from} to ${effectiveReportBounds.to}`
              : ""
        setPdfPendingExport({
          headers: exportView.headers,
          rows: exportView.rows,
          title: exportView.sheetName || reportType,
          subtitle,
          autoInsights,
        })
        setPdfInsightMode("auto")
        setPdfCustomInsight("")
        setPdfDialogOpen(true)
        return
      } else {
        toast.error("Unsupported export format.")
        return
      }
      toast.success("Download started.")
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  const handleConfirmPdfExport = () => {
    if (!pdfPendingExport) return
    const insightsText =
      pdfInsightMode === "custom"
        ? (pdfCustomInsight.trim() || pdfPendingExport.autoInsights || "")
        : (pdfPendingExport.autoInsights || "")
    savePdfTable(pdfPendingExport.headers, pdfPendingExport.rows, pdfPendingExport.title, {
      subtitle: pdfPendingExport.subtitle,
      insightsText,
    })
    setPdfDialogOpen(false)
    setPdfPendingExport(null)
    toast.success("Download started.")
  }

  const toggleIssuanceColumnVisible = (colId, checked) => {
    setIssuanceTableLayout((prev) => {
      const nextVisible = { ...prev.visible, [colId]: checked }
      const showing = prev.order.filter((id) => nextVisible[id]).length
      if (showing === 0) {
        toast.info("Keep at least one column visible.")
        return prev
      }
      return { ...prev, visible: nextVisible }
    })
  }

  const shiftIssuanceColumn = (index, delta) => {
    setIssuanceTableLayout((prev) => ({
      ...prev,
      order: moveIssuanceColumnOrder(prev.order, index, delta),
    }))
  }

  const resetIssuanceTableLayout = () => {
    setIssuanceTableLayout({
      order: [...ISSUANCE_TABLE_DEFAULT_LAYOUT.order],
      visible: { ...ISSUANCE_TABLE_DEFAULT_LAYOUT.visible },
    })
  }

  const persistIssuanceRemarks = async (txId, nextPurpose, previousPurpose) => {
    if (savingIssuancePurposeTxId) return
    if (nextPurpose === previousPurpose) {
      setIssuanceRemarksDraft((d) => {
        const n = { ...d }
        delete n[txId]
        return n
      })
      return
    }
    setSavingIssuancePurposeTxId(txId)
    try {
      await transactionsService.patchTransactionPurpose(txId, { purpose: nextPurpose })
      setTxResults((prev) =>
        prev.map((t) => {
          const tid = String(t._id ?? t.id)
          if (tid !== txId) return t
          return { ...t, purpose: nextPurpose }
        })
      )
      setIssuanceRemarksDraft((d) => {
        const n = { ...d }
        delete n[txId]
        return n
      })
      toast.success("Remarks saved.")
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSavingIssuancePurposeTxId(null)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between" data-tutorial="reports-header">
        <div className="min-w-0">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/dashboard">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Reports</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="mt-2 truncate text-xl font-semibold tracking-tight text-zinc-900">
            System Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate and export reports from inventory, stock, and issuance data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="icon">
            <RefreshCw className="size-4" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4" />
              Generate Report
            </CardTitle>
            <CardDescription>Select report type, date range, and generate results. Use &quot;Issuance&quot; to see data from the Item Issuance page (issued/assigned items).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2" data-tutorial="report-type-selector">
                <Label htmlFor="report-type">Report Type</Label>
                <Select value={reportType} onValueChange={handleReportTypeChange}>
                  <SelectTrigger id="report-type">
                    <SelectValue placeholder="Select report" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {reportType !== "dashboard-summary" && reportType !== "inventory" && (
                <div className="space-y-2" data-tutorial="date-range-controls">
                  <Label htmlFor="date-range-preset">Date range</Label>
                  <Select value={dateRangePreset} onValueChange={handleDatePresetChange}>
                    <SelectTrigger id="date-range-preset" className="w-full">
                      <SelectValue placeholder="Pick a range" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_RANGE_PRESET_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {["this_year", "q1", "q2", "q3", "q4", "calendar_year"].includes(dateRangePreset) && (
                    <div className="mt-2 flex items-center gap-2">
                      <Label htmlFor="report-year" className="text-xs font-normal text-muted-foreground">
                        Year
                      </Label>
                      <Select
                        value={String(reportYear)}
                        onValueChange={(v) => setReportYear(parseInt(v, 10))}
                      >
                        <SelectTrigger id="report-year" className="h-8 w-[100px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const cur = new Date().getFullYear()
                            const years = []
                            for (let y = cur - 10; y <= cur + 5; y++) years.push(y)
                            return years.map((y) => (
                              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {dateRangePreset !== "range" && dateRangePreset !== "all" && effectiveReportBounds && (
                    <p className="text-xs text-muted-foreground">
                      {describeBoundsHuman(effectiveReportBounds)}
                    </p>
                  )}
                  {dateRangePreset === "range" && (
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="date-from" className="text-xs font-normal text-muted-foreground">
                          From
                        </Label>
                        <Input
                          id="date-from"
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="date-to" className="text-xs font-normal text-muted-foreground">
                          To
                        </Label>
                        <Input
                          id="date-to"
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {reportType === "issuance" && (
              <div className="space-y-4 rounded-xl border border-border/90 bg-linear-to-b from-muted/35 via-muted/15 to-transparent p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border/60">
                      <Search className="size-4 text-muted-foreground" aria-hidden />
                    </span>
                    Issuance search & result view
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {issuancePeopleView === "lines" && (
                      <Badge variant="secondary" className="font-normal">
                        <LayoutList className="size-3.5" />
                        Detail lines
                      </Badge>
                    )}
                    {issuancePeopleView === "with" && (
                      <Badge className="bg-emerald-600 font-normal hover:bg-emerald-600">
                        <UserCheck className="size-3.5" />
                        Received
                      </Badge>
                    )}
                    {issuancePeopleView === "without" && (
                      <Badge variant="outline" className="border-amber-500/60 bg-amber-50 font-normal text-amber-950 dark:bg-amber-950/30 dark:text-amber-50">
                        <UserMinus className="size-3.5" />
                        Did not receive
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2" data-tutorial="issuance-item-filter">
                  <Label htmlFor="issuance-item-type">Item type</Label>
                  <Select
                    id="issuance-item-type"
                    value={issuanceItemType}
                    onValueChange={setIssuanceItemType}
                  >
                    <SelectTrigger className="w-full bg-background/80">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="ASSET">Asset</SelectItem>
                      <SelectItem value="SUPPLY">Supply</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="issuance-item-search" className="flex items-center gap-1.5">
                      <Search className="size-3.5 text-muted-foreground" aria-hidden />
                      Filter by item name
                    </Label>
                    <Input
                      id="issuance-item-search"
                      placeholder="e.g. bond paper, ballpen — commas or new lines"
                      value={issuanceItemSearch}
                      onChange={(e) => setIssuanceItemSearch(e.target.value)}
                      data-tutorial="issuance-item-name-search"
                      className="bg-background/90"
                    />
                    <p className="text-xs text-muted-foreground">
                      Partial name match per term; separate with commas, semicolons, or new lines. Multiple terms = match any term.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="issuance-people-view" className="flex items-center gap-1.5">
                      <Users className="size-3.5 text-muted-foreground" aria-hidden />
                      Result view
                    </Label>
                    <Select value={issuancePeopleView} onValueChange={setIssuancePeopleView}>
                      <SelectTrigger id="issuance-people-view" data-tutorial="issuance-people-view" className="bg-background/80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lines">Issuance lines (detail)</SelectItem>
                        <SelectItem value="with">People who received matching items</SelectItem>
                        <SelectItem value="without">People who did not receive matching items</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      “Did not receive” uses the full People directory from Settings → People (name match, ignores letter case).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {reportType && reportType !== "dashboard-summary" && (
              <div className="grid gap-4 sm:grid-cols-2" data-tutorial="report-filters">
                <div className="space-y-2">
                  <Label htmlFor="filter-category">Category</Label>
                  <Select value={filterCategory || "_all"} onValueChange={(v) => setFilterCategory(v === "_all" ? "" : v)}>
                    <SelectTrigger id="filter-category">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">All categories</SelectItem>
                      {(filteredCategoryOptions || []).map((c) => (
                        <SelectItem key={c.id || c.slug} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {reportType === "issuance" ? (
                  <div className="space-y-2">
                    <Label htmlFor="filter-accountable">Accountable Person</Label>
                    <Select
                      value={filterAccountablePerson || "_all"}
                      onValueChange={(v) => setFilterAccountablePerson(v === "_all" ? "" : v)}
                    >
                      <SelectTrigger id="filter-accountable">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All</SelectItem>
                        {accountablePersonOptions.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : reportType === "inventory" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="filter-item-type">Item Type</Label>
                      <Select
                        value={filterItemType || "_all"}
                        onValueChange={(v) => setFilterItemType(v === "_all" ? "" : v)}
                      >
                        <SelectTrigger id="filter-item-type">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_all">All</SelectItem>
                          <SelectItem value="ASSET">Asset</SelectItem>
                          <SelectItem value="SUPPLY">Supply</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="filter-status">Status</Label>
                      <Select
                        value={filterStatus || "_all"}
                        onValueChange={(v) => setFilterStatus(v === "_all" ? "" : v)}
                      >
                        <SelectTrigger id="filter-status">
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_all">All statuses</SelectItem>
                          {ITEM_STATUS_OPTIONS.map((s) =>
                            s.disabled ? (
                              <div
                                key={s.value}
                                className="px-2 py-1 text-[10px] tracking-wide text-muted-foreground"
                              >
                                {s.label}
                              </div>
                            ) : (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="filter-item-type">Item Type</Label>
                    <Select
                      value={filterItemType || "_all"}
                      onValueChange={(v) => setFilterItemType(v === "_all" ? "" : v)}
                    >
                      <SelectTrigger id="filter-item-type">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All</SelectItem>
                        <SelectItem value="ASSET">Asset</SelectItem>
                        <SelectItem value="SUPPLY">Supply</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {(reportType === "inventory" ||
              reportType === "stock-in" ||
              reportType === "stock-out" ||
              reportType === "movements") && (
              <div
                className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2"
                data-tutorial="report-search-filter"
              >
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="report-search">Search</Label>
                  <Input
                    id="report-search"
                    placeholder="Keywords — item name, supplier, reference, recipient…"
                    value={reportSearchText}
                    onChange={(e) => setReportSearchText(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Partial match across item names, categories, property numbers, supplier, reference, office or person on the transaction, recorded-by, and remarks. Use commas or new lines for multiple keywords (rows match if any keyword hits).
                  </p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="filter-accountable-inv">Person / accountable</Label>
                  <Select
                    value={filterAccountablePerson || "_all"}
                    onValueChange={(v) => setFilterAccountablePerson(v === "_all" ? "" : v)}
                  >
                    <SelectTrigger id="filter-accountable-inv">
                      <SelectValue placeholder="Everyone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">Everyone</SelectItem>
                      {accountablePersonOptions.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Narrow to one person: inventory shows items they hold; stock movements show transactions where they appear as accountable or recipient (Generate applies this; search refines the table without regenerating).
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleGenerate} disabled={loading} data-tutorial="generate-report-btn">
                <BarChart3 className="size-4" />
                {loading ? "Loading…" : "Generate Report"}
              </Button>
              {hasResults && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" data-tutorial="export-dropdown">
                      <Download className="size-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {EXPORT_FORMATS.filter((f) => {
                      // Export exactly what is visible in table: CSV / Excel / PDF
                      return f.value === "csv" || f.value === "excel" || f.value === "pdf"
                    }).map((f) => {
                      const Icon = f.icon
                      return (
                        <DropdownMenuItem key={f.value} onClick={() => handleExport(f.value)} disabled={exporting}>
                          <Icon className="size-4" />
                          {f.label}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-tutorial="report-summary">
          <CardHeader>
            <CardDescription>Summary</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {hasResults ? resultCount : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {hasResults
                ? `${resultCount} ${reportType === "issuance" && issuancePeopleView !== "lines" ? "person(s)" : "record(s)"} in this report. Use Export to download as PDF, Excel, or CSV.`
                : "Select report type and date range, then click Generate Report to view results."}
            </p>
          </CardContent>
        </Card>
      </section>

      {hasResults && (
        <section
          className={`overflow-hidden rounded-xl border bg-white ${reportType === "issuance" && issuancePeopleView !== "lines" ? "shadow-md ring-1 ring-border/60" : ""}`}
          data-tutorial="results-table"
        >
          <div
            className={`border-b px-4 py-4 lg:px-6 ${reportType === "issuance" && issuancePeopleView !== "lines" ? "bg-linear-to-r from-muted/40 via-background to-background" : ""}`}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-1">
                <h2 className="text-base font-semibold tracking-tight text-zinc-900">Report Results</h2>
                <p className="text-xs text-muted-foreground">
                  {REPORT_TYPES.find((r) => r.value === reportType)?.label}
                  {effectiveReportBounds == null
                    ? " — All time"
                    : effectiveReportBounds.from && effectiveReportBounds.to
                      ? ` — ${describeBoundsHuman(effectiveReportBounds) || `${effectiveReportBounds.from} to ${effectiveReportBounds.to}`}`
                      : ` — ${dateFrom || "…"} to ${dateTo || "…"}`}
                </p>
                {reportType === "issuance" && issuancePeopleView !== "lines" && issuanceSearchDisplayTerms.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Item keywords
                    </span>
                    {issuanceSearchDisplayTerms.map((t, i) => (
                      <Badge key={`${t}-${i}`} variant="secondary" className="font-mono text-[11px] font-normal">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              {reportType === "issuance" && issuancePeopleView !== "lines" && (
                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
                  <div className="flex flex-wrap justify-end gap-2">
                    {issuancePeopleView === "with" && (
                      <Badge className="gap-1 bg-emerald-600 pl-2 pr-2.5 hover:bg-emerald-600">
                        <UserCheck className="size-3.5" />
                        Has match · {peopleWithSearchedItems.length}
                      </Badge>
                    )}
                    {issuancePeopleView === "without" && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-500/70 bg-amber-50 pl-2 pr-2.5 text-amber-950 dark:bg-amber-950/35 dark:text-amber-50"
                      >
                        <UserMinus className="size-3.5" />
                        No match · {peopleWithoutSearchedItems.length}
                      </Badge>
                    )}
                  </div>
                  <p className="max-w-xs text-right text-[11px] text-muted-foreground">
                    {issuancePeopleView === "with"
                      ? "Listed people appear on at least one filtered issuance line."
                      : "Listed people are in Settings → People but have no matching line for these keywords."}
                  </p>
                </div>
              )}
            </div>
          </div>
          {reportType === "issuance" && issuancePeopleView === "lines" && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/15 px-4 py-2 lg:px-6">
              <p className="max-w-xl text-xs text-muted-foreground">
                Customize issuance columns and order. Extra fields (category, qty, transaction type) are off by default—turn them on below. Edit remarks in the table (saved when you leave the field). Saved on this device only.
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    data-tutorial="issuance-table-columns"
                  >
                    <Columns3 className="size-4" />
                    Table layout
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                  {ISSUANCE_COLUMN_IDS.map((colId) => (
                    <DropdownMenuCheckboxItem
                      key={colId}
                      checked={Boolean(issuanceTableLayout.visible[colId])}
                      onCheckedChange={(v) => toggleIssuanceColumnVisible(colId, Boolean(v))}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {ISSUANCE_COLUMN_META[colId].label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Column order</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="max-h-72 overflow-y-auto p-2">
                      <p className="mb-2 px-1 text-[11px] text-muted-foreground">Use arrows to reorder</p>
                      {issuanceTableLayout.order.map((colId, idx) => (
                        <div
                          key={colId}
                          className="flex items-center gap-1 rounded-sm px-1 py-0.5 hover:bg-accent/60"
                        >
                          <span className="min-w-0 flex-1 truncate text-xs">
                            {ISSUANCE_COLUMN_META[colId].label}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              shiftIssuanceColumn(idx, -1)
                            }}
                          >
                            <ChevronUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0"
                            disabled={idx === issuanceTableLayout.order.length - 1}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              shiftIssuanceColumn(idx, 1)
                            }}
                          >
                            <ChevronDown className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={resetIssuanceTableLayout}>Reset layout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          <div className="overflow-x-auto">
            {reportType === "dashboard-summary" && dashboardResults && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-3">Key Performance Indicators</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Total Items</TableCell>
                        <TableCell className="text-right tabular-nums">{dashboardResults.kpis?.totalItems ?? 0}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Active Items</TableCell>
                        <TableCell className="text-right tabular-nums">{dashboardResults.kpis?.activeItems ?? 0}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Archived Items</TableCell>
                        <TableCell className="text-right tabular-nums">{dashboardResults.kpis?.archivedItems ?? 0}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Total Supplies</TableCell>
                        <TableCell className="text-right tabular-nums">{dashboardResults.kpis?.totalSupplies ?? 0}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Total Assets</TableCell>
                        <TableCell className="text-right tabular-nums">{dashboardResults.kpis?.totalAssets ?? 0}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Deployed Assets</TableCell>
                        <TableCell className="text-right tabular-nums">{dashboardResults.kpis?.deployedAssets ?? 0}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Out of Stock Items</TableCell>
                        <TableCell className="text-right tabular-nums">{dashboardResults.kpis?.outOfStockCount ?? 0}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Low Stock Items</TableCell>
                        <TableCell className="text-right tabular-nums">{dashboardResults.kpis?.lowStockCount ?? 0}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Transactions Today</TableCell>
                        <TableCell className="text-right tabular-nums">{dashboardResults.kpis?.txToday ?? 0}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Transactions This Month</TableCell>
                        <TableCell className="text-right tabular-nums">{dashboardResults.kpis?.txThisMonth ?? 0}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {dashboardResults.charts?.suppliesByCategory?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Supplies by Category</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboardResults.charts.suppliesByCategory.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.category || "Uncategorized"}</TableCell>
                            <TableCell className="text-right tabular-nums">{item.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {dashboardResults.charts?.assetsByStatus?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Assets by Status</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboardResults.charts.assetsByStatus.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.status || "—"}</TableCell>
                            <TableCell className="text-right tabular-nums">{item.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
            {reportType === "inventory" && (
              <div className="space-y-3 p-4 lg:p-6">
                {(inventoryActionSummary.low.length > 0 || inventoryActionSummary.out.length > 0) && (
                  <div className="rounded-lg border border-amber-300/60 bg-amber-50/70 px-4 py-3 text-sm">
                    <p className="font-semibold text-amber-900">Action Needed</p>
                    {inventoryActionSummary.out.length > 0 && (
                      <p className="mt-1 text-amber-900">
                        Out of stock items ({inventoryActionSummary.out.length}) need immediate replenishment.
                        Prioritize purchase requests and coordinate urgent issuance alternatives.
                      </p>
                    )}
                    {inventoryActionSummary.low.length > 0 && (
                      <p className="mt-1 text-amber-900">
                        Low stock items ({inventoryActionSummary.low.length}) are at or below reorder level.
                        Prepare restock plans and monitor daily consumption until replenished.
                      </p>
                    )}
                    <p className="mt-2 text-xs text-amber-800">
                      {inventoryActionSummary.out.length > 0
                        ? `Out of stock sample: ${inventoryActionSummary.out.slice(0, 4).map((i) => i.name).join(", ")}${inventoryActionSummary.out.length > 4 ? ", …" : ""}. `
                        : ""}
                      {inventoryActionSummary.low.length > 0
                        ? `Low stock sample: ${inventoryActionSummary.low.slice(0, 4).map((i) => i.name).join(", ")}${inventoryActionSummary.low.length > 4 ? ", …" : ""}.`
                        : ""}
                    </p>
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryResults.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No inventory items match the selected filters.
                        </TableCell>
                      </TableRow>
                    ) : resultsForTable.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No rows match your search. Clear Search or try different keywords.
                        </TableCell>
                      </TableRow>
                    ) : (
                      resultsForTable.map((r, i) => (
                        <TableRow key={r._id ?? r.id ?? i}>
                          <TableCell className="font-medium">{r.name ?? "—"}</TableCell>
                          <TableCell>{r.category ?? "—"}</TableCell>
                          <TableCell>
                            {r.itemType === "SUPPLY"
                              ? (r.quantityOnHand ?? r.quantity ?? 0)
                              : "1"}
                          </TableCell>
                          <TableCell>{r.unit ?? "—"}</TableCell>
                          <TableCell>{r.itemType ?? "—"}</TableCell>
                          <TableCell className="font-medium">{inventoryStatusLabel(r)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            {reportType === "stock-in" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        <p>No stock-in transactions in the selected date range.</p>
                        <p className="mt-1 text-xs">Stock In = receiving inventory from suppliers. To see issued/assigned items (from the Issuance page), choose report type &quot;Issuance&quot;.</p>
                      </TableCell>
                    </TableRow>
                  ) : resultsForTable.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No rows match your search. Clear Search or try different keywords.
                      </TableCell>
                    </TableRow>
                  ) : (
                    resultsForTable.map((tx, i) => {
                      const itemLines = (tx.items ?? []).map((line) => {
                        const name =
                          typeof line.itemId === "object" && line.itemId != null
                            ? line.itemId.name
                            : null
                        const qty = line.qty ?? line.quantity ?? 1
                        return `${qty}× ${name ?? "—"}`
                      })
                      return (
                        <TableRow key={tx._id ?? tx.id ?? i}>
                          <TableCell className="tabular-nums">
                            {(tx.createdAt ?? tx.date) ? new Date(tx.createdAt ?? tx.date).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>{tx.type ?? "—"}</TableCell>
                          <TableCell className="text-sm">{itemLines.join(", ") || "—"}</TableCell>
                          <TableCell className="text-sm">
                            {tx.supplier ? `Supplier: ${tx.supplier}` : tx.referenceNo ?? "—"}
                          </TableCell>
                          <TableCell>
                            {typeof tx.createdBy === "object" && tx.createdBy?.name
                              ? tx.createdBy.name
                              : tx.createdBy ?? "—"}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            )}
            {reportType === "stock-out" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        <p>No stock-out transactions in the selected date range.</p>
                        <p className="mt-1 text-xs">To see items issued or assigned to divisions/personnel (from the Issuance page), choose report type &quot;Issuance&quot;.</p>
                      </TableCell>
                    </TableRow>
                  ) : resultsForTable.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No rows match your search. Clear Search or try different keywords.
                      </TableCell>
                    </TableRow>
                  ) : (
                    resultsForTable.map((tx, i) => {
                      const itemLines = (tx.items ?? []).map((line) => {
                        const name =
                          typeof line.itemId === "object" && line.itemId != null
                            ? line.itemId.name
                            : null
                        const qty = line.qty ?? line.quantity ?? 1
                        return `${qty}× ${name ?? "—"}`
                      })
                      return (
                        <TableRow key={tx._id ?? tx.id ?? i}>
                          <TableCell className="tabular-nums">
                            {(tx.createdAt ?? tx.date) ? new Date(tx.createdAt ?? tx.date).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>{tx.type ?? "—"}</TableCell>
                          <TableCell className="text-sm">{itemLines.join(", ") || "—"}</TableCell>
                          <TableCell className="text-sm">
                            {tx.issuedToOffice
                              ? `${tx.issuedToOffice}${tx.issuedToPerson ? ` · ${tx.issuedToPerson}` : ""}`
                              : tx.purpose ?? "—"}
                          </TableCell>
                          <TableCell>
                            {typeof tx.createdBy === "object" && tx.createdBy?.name
                              ? tx.createdBy.name
                              : tx.createdBy ?? "—"}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            )}
            {reportType === "movements" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty Change</TableHead>
                    <TableHead>Balance Before</TableHead>
                    <TableHead>Balance After</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        <p>No movement transactions in the selected date range.</p>
                        <p className="mt-1 text-xs">Movements shows supply-only stock in and stock out lines (assets are excluded).</p>
                      </TableCell>
                    </TableRow>
                  ) : resultsForTable.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        No rows match your search. Clear Search or try different keywords.
                      </TableCell>
                    </TableRow>
                  ) : (
                    resultsForTable.map((row, i) => {
                      const isIn = row.delta > 0
                      const itemMeta = [row.item?.category, row.item?.unit].filter(Boolean).join(" • ") || "N/A"
                      const remarks = row.tx?.purpose || row.tx?.remarks || "N/A"
                      return (
                        <TableRow key={row.key ?? i}>
                          <TableCell className="tabular-nums">
                            {(row.tx?.createdAt ?? row.tx?.date) ? new Date(row.tx?.createdAt ?? row.tx?.date).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-zinc-900">{row.item?.name ?? "—"}</span>
                              <span className="text-xs text-muted-foreground">{itemMeta}</span>
                            </div>
                          </TableCell>
                          <TableCell>{row.type === "STOCK_IN" ? "Stock In" : "Stock Out"}</TableCell>
                          <TableCell className={isIn ? "tabular-nums text-emerald-700" : "tabular-nums text-rose-700"}>
                            {isIn ? "+" : ""}{row.delta}{row.item?.unit ? ` ${row.item.unit}` : ""}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {Number.isFinite(row.balanceBefore) ? row.balanceBefore : "—"}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {Number.isFinite(row.balanceAfter) ? row.balanceAfter : "—"}
                          </TableCell>
                          <TableCell className="text-sm">{remarks}</TableCell>
                          <TableCell>
                            {typeof row.tx?.createdBy === "object" && row.tx?.createdBy?.name
                              ? row.tx.createdBy.name
                              : row.tx?.createdBy ?? "—"}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            )}
            {reportType === "issuance" && issuancePeopleView === "lines" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleIssuanceColumns.map((colId) => (
                      <TableHead key={colId} className={ISSUANCE_COLUMN_META[colId]?.headerClass}>
                        {ISSUANCE_COLUMN_META[colId].label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const colSpan = Math.max(visibleIssuanceColumns.length, 1)
                    const rows = resultsForTable.flatMap((tx, txIdx) =>
                      (tx.items ?? []).map((line, idx) => {
                        const parts = buildIssuanceRowParts(tx, line)
                        return (
                          <TableRow
                            key={`${tx._id ?? tx.id ?? txIdx}-${idx}-${parts.item?._id ?? parts.item?.id ?? line.itemId ?? idx}`}
                          >
                            {visibleIssuanceColumns.map((colId) => {
                              if (colId === "remarks") {
                                const tid = String(tx._id ?? tx.id ?? "")
                                const prevPurpose = tx.purpose ?? ""
                                const rawDraft = issuanceRemarksDraft[tid]
                                const value = rawDraft !== undefined ? rawDraft : prevPurpose
                                return (
                                  <TableCell key={colId} className="min-w-48 max-w-md align-top py-2">
                                    <Textarea
                                      aria-label="Remarks"
                                      rows={2}
                                      className="min-h-12 resize-y text-sm"
                                      value={value}
                                      disabled={savingIssuancePurposeTxId === tid}
                                      onChange={(e) =>
                                        setIssuanceRemarksDraft((d) => ({
                                          ...d,
                                          [tid]: e.target.value,
                                        }))
                                      }
                                      onBlur={(e) => {
                                        void persistIssuanceRemarks(tid, e.target.value, prevPurpose)
                                      }}
                                    />
                                    <p className="mt-1 text-[10px] text-muted-foreground">
                                      Saves when you leave this field · Admin or staff only
                                    </p>
                                  </TableCell>
                                )
                              }
                              return (
                                <TableCell key={colId} className={ISSUANCE_COLUMN_META[colId]?.cellClass}>
                                  {issuanceCellText(colId, parts)}
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        )
                      })
                    )
                    if (rows.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
                            <p>No issuance records in the selected date range.</p>
                            <p className="mt-1 text-xs">Records are filtered by transaction created date. Try extending the end date to today if you recently added issuances.</p>
                          </TableCell>
                        </TableRow>
                      )
                    }
                    return rows
                  })()}
                </TableBody>
              </Table>
            )}
            {reportType === "issuance" && issuancePeopleView !== "lines" && (
              <div className="border-b border-border/80 bg-muted/15 px-4 py-4 lg:px-6">
                <div className="mb-3 flex flex-wrap items-start gap-2 rounded-lg border border-border/70 bg-background/90 px-3 py-2.5 text-sm text-muted-foreground shadow-sm">
                  <Users className="mt-0.5 size-4 shrink-0 text-zinc-600" aria-hidden />
                  <span className="min-w-0 leading-snug">
                    {issuancePeopleView === "with" ? (
                      <>
                        <span className="font-medium text-foreground">Received matching items</span>
                        {" — "}
                        People who appear on at least one issuance line that matches your filters and item keywords in the
                        selected period.
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-foreground">Did not receive matching items</span>
                        {" — "}
                        People listed in Settings → People who have no matching issuance line for the keywords above
                        (names compared case-insensitively).
                      </>
                    )}
                  </span>
                </div>
                <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow className="border-b border-border/80 bg-muted/50 hover:bg-muted/50">
                        <TableHead className="w-14 text-center tabular-nums text-muted-foreground">#</TableHead>
                        <TableHead className="font-semibold text-foreground">
                          {issuancePeopleView === "with" ? "Person (has match)" : "Person (no match in period)"}
                        </TableHead>
                        <TableHead className="hidden w-28 sm:table-cell">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!issuanceSearchTokens.length ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={3} className="p-0">
                            <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
                              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                                <Search className="size-5 text-muted-foreground" />
                              </div>
                              <p className="max-w-md text-sm font-medium text-foreground">Enter item keywords first</p>
                              <p className="max-w-md text-xs text-muted-foreground">
                                Use the Filter by item name field above, then generate again. Separate terms with commas,
                                semicolons, or new lines.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : issuancePeopleView === "without" && systemPeopleLoading ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={3} className="p-0">
                            <div className="flex flex-col items-center gap-2 py-14 text-center text-sm text-muted-foreground">
                              <RefreshCw className="size-6 animate-spin opacity-70" />
                              Loading people directory…
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : issuancePeopleView === "without" && !systemPeopleLoading && systemPersonNames.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={3} className="p-0">
                            <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                              <p className="text-sm font-medium text-foreground">No people in the directory</p>
                              <p className="max-w-md text-xs text-muted-foreground">
                                Add people under Settings → People, then refresh this report.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : issuancePeopleView === "with" && peopleWithSearchedItems.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={3} className="p-0">
                            <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                              <p className="text-sm font-medium text-foreground">No matches in this period</p>
                              <p className="max-w-md text-xs text-muted-foreground">
                                No one meets these filters for the selected date range. Try broader keywords or a wider
                                date range.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : issuancePeopleView === "without" && peopleWithoutSearchedItems.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={3} className="p-0">
                            <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                              <p className="text-sm font-medium text-foreground">Everyone has a match</p>
                              <p className="max-w-md text-xs text-muted-foreground">
                                All directory names appear on at least one matching issuance line for this filter.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        (issuancePeopleView === "with" ? peopleWithSearchedItems : peopleWithoutSearchedItems).map(
                          (name, i) => (
                            <TableRow
                              key={`${name}-${i}`}
                              className={
                                issuancePeopleView === "with"
                                  ? "border-l-[3px] border-l-emerald-500/70 odd:bg-background even:bg-muted/25"
                                  : "border-l-[3px] border-l-amber-500/55 odd:bg-background even:bg-muted/25"
                              }
                            >
                              <TableCell className="text-center tabular-nums text-muted-foreground">{i + 1}</TableCell>
                              <TableCell className="font-medium text-foreground">{name}</TableCell>
                              <TableCell className="hidden sm:table-cell">
                                {issuancePeopleView === "with" ? (
                                  <Badge className="bg-emerald-600/95 font-normal hover:bg-emerald-600/95">Match</Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="border-amber-500/60 font-normal text-amber-950 dark:text-amber-100"
                                  >
                                    Gap
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>PDF Insights</DialogTitle>
            <DialogDescription>
              Choose automatic insights from current filters, or write your own narrative before generating the PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/25 p-3 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Report:</span> {pdfPendingExport?.title || "—"}
              </p>
              <p className="mt-1">
                <span className="font-medium text-foreground">Rows:</span> {pdfPendingExport?.rows?.length ?? 0}
                {pdfPendingExport?.subtitle ? ` · ${pdfPendingExport.subtitle}` : ""}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant={pdfInsightMode === "auto" ? "default" : "outline"}
                onClick={() => setPdfInsightMode("auto")}
              >
                Auto insights
              </Button>
              <Button
                type="button"
                variant={pdfInsightMode === "custom" ? "default" : "outline"}
                onClick={() => setPdfInsightMode("custom")}
              >
                Custom insights
              </Button>
            </div>

            {pdfInsightMode === "auto" ? (
              <div className="space-y-2">
                <Label>Auto-generated narrative</Label>
                <div className="max-h-48 overflow-y-auto rounded-md border bg-background px-3 py-2 text-sm text-foreground">
                  {pdfPendingExport?.autoInsights || "No automatic insight available."}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="pdf-custom-insight">Custom narrative</Label>
                <Textarea
                  id="pdf-custom-insight"
                  rows={7}
                  value={pdfCustomInsight}
                  onChange={(e) => setPdfCustomInsight(e.target.value)}
                  placeholder="Write your custom explanation and insights for this report..."
                />
                <p className="text-xs text-muted-foreground">
                  If left empty, the system will fall back to the auto insight text.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPdfExport} disabled={!pdfPendingExport}>
              Generate PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FloatingHelpButton steps={reportsTutorialSteps} pageId="reports" />
    </div>
  )
}
