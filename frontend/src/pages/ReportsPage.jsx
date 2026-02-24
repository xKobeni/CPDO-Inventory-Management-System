import { useState, useEffect } from "react"
import { BarChart3, RefreshCw, Download, FileSpreadsheet, FileDown } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { itemsService, transactionsService, exportService } from "@/services"
import { getErrorMessage } from "@/utils/api"
import { useCategories } from "@/contexts/CategoriesContext"

const REPORT_TYPES = [
  { value: "inventory", label: "Inventory Summary" },
  { value: "stock-in", label: "Stock In" },
  { value: "stock-out", label: "Stock Out" },
  { value: "issuance", label: "Issuance" },
]

const EXPORT_FORMATS = [
  { value: "excel", label: "Excel", icon: FileSpreadsheet },
  { value: "csv", label: "CSV", icon: FileDown },
]

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
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
  issuance: "ISSUANCE,ASSET_ASSIGN",
}

function todayYYYYMMDD() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export default function ReportsPage() {
  const { categories } = useCategories()
  const [reportType, setReportType] = useState("inventory")
  const [dateRangePreset, setDateRangePreset] = useState("range")
  const [dateFrom, setDateFrom] = useState("2026-01-01")
  const [dateTo, setDateTo] = useState(() => todayYYYYMMDD())
  const [issuanceItemType, setIssuanceItemType] = useState("all")
  const [filterCategory, setFilterCategory] = useState("")
  const [filterAccountablePerson, setFilterAccountablePerson] = useState("")
  const [accountablePersonOptions, setAccountablePersonOptions] = useState([])
  const [hasResults, setHasResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [inventoryResults, setInventoryResults] = useState([])
  const [txResults, setTxResults] = useState([])

  const isInventory = reportType === "inventory"
  const results = isInventory ? inventoryResults : txResults
  const issuanceDisplayResults =
    reportType === "issuance" && Array.isArray(txResults)
      ? txResults
          .map((tx) => ({
            ...tx,
            items:
              issuanceItemType === "all"
                ? tx.items ?? []
                : (tx.items ?? []).filter(
                    (line) => (line.itemId?.itemType ?? "") === issuanceItemType
                  ),
          }))
          .filter((tx) => (tx.items ?? []).length > 0)
      : []
  const resultCount =
    reportType === "issuance"
      ? issuanceDisplayResults.reduce(
          (sum, tx) => sum + (tx.items ?? []).length,
          0
        )
      : Array.isArray(results)
        ? results.length
        : 0
  const resultsForTable = reportType === "issuance" ? issuanceDisplayResults : results

  useEffect(() => {
    if (!reportType) return
    let cancelled = false
    itemsService
      .listItems({ archived: "false" })
      .then((data) => {
        if (cancelled) return
        const names = new Set()
        ;(data || []).forEach((item) => {
          const name = item.accountablePerson?.name?.trim()
          if (name) names.add(name)
        })
        setAccountablePersonOptions(Array.from(names).sort())
      })
      .catch(() => {
        if (!cancelled) setAccountablePersonOptions([])
      })
    return () => { cancelled = true }
  }, [reportType])

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
    if (filterAccountablePerson) {
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
    setFilterCategory("")
    setFilterAccountablePerson("")
    setHasResults(false)
  }

  const handleGenerate = async () => {
    setLoading(true)
    setHasResults(false)
    try {
      if (reportType === "inventory") {
        const params = { archived: "false" }
        if (filterCategory) params.category = filterCategory
        const raw = await itemsService.listItems(params)
        const data = toArray(raw)
        const filtered = applyFilters(data, true)
        setInventoryResults(Array.isArray(filtered) ? filtered : [])
      } else {
        const type = TRANSACTION_TYPE_MAP[reportType] ?? "ISSUANCE"
        let raw = await transactionsService.listTransactions({ type })
        let list = toArray(raw)
        if (list.length === 0 && reportType === "stock-out") {
          raw = await transactionsService.listTransactions({ type: "ISSUANCE" })
          list = toArray(raw)
        }
        const byDate =
          dateRangePreset === "all"
            ? list
            : list.filter((tx) => {
                const dateVal = tx.createdAt ?? tx.date ?? tx.transactionDate ?? tx.updatedAt
                if (!dateVal) return true
                const txDate = new Date(dateVal)
                if (Number.isNaN(txDate.getTime())) return true
                const fromStart = new Date(dateFrom + "T00:00:00.000Z")
                const toEnd = new Date(dateTo + "T23:59:59.999Z")
                return txDate >= fromStart && txDate <= toEnd
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
      if (reportType === "inventory") {
        const blob = format === "csv"
          ? await exportService.downloadItemsCsv()
          : await exportService.downloadItemsXlsx()
        downloadBlob(blob, `inventory_${new Date().toISOString().slice(0, 10)}.${format === "csv" ? "csv" : "xlsx"}`)
      } else {
        const params = {}
        if (dateRangePreset === "range") {
          if (dateFrom) params.from = dateFrom
          if (dateTo) params.to = dateTo
        }
        if (reportType === "issuance") {
          params.type = "ISSUANCE"
          if (issuanceItemType !== "all") params.itemType = issuanceItemType
          if (filterCategory) params.category = filterCategory
          if (filterAccountablePerson) params.accountablePerson = filterAccountablePerson
        } else if (reportType === "stock-in") params.type = "STOCK_IN"
        else if (reportType === "stock-out") params.type = "ISSUANCE"
        const blob = await exportService.downloadTransactionsXlsx(params)
        downloadBlob(blob, `transactions_${new Date().toISOString().slice(0, 10)}.xlsx`)
      }
      toast.success("Download started.")
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
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
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select
                  value={dateRangePreset}
                  onValueChange={(v) => setDateRangePreset(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="range">Custom range</SelectItem>
                  </SelectContent>
                </Select>
                {dateRangePreset === "range" && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                )}
              </div>
            </div>

            {reportType === "issuance" && (
              <div className="space-y-2">
                <Label htmlFor="issuance-item-type">Item type</Label>
                <Select
                  id="issuance-item-type"
                  value={issuanceItemType}
                  onValueChange={setIssuanceItemType}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="ASSET">Asset</SelectItem>
                    <SelectItem value="SUPPLY">Supply</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {reportType && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="filter-category">Category</Label>
                  <Select value={filterCategory || "_all"} onValueChange={(v) => setFilterCategory(v === "_all" ? "" : v)}>
                    <SelectTrigger id="filter-category">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">All categories</SelectItem>
                      {(categories || []).map((c) => (
                        <SelectItem key={c.id || c.slug} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleGenerate} disabled={loading}>
                <BarChart3 className="size-4" />
                {loading ? "Loading…" : "Generate Report"}
              </Button>
              {hasResults && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Download className="size-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {EXPORT_FORMATS.filter((f) => reportType !== "inventory" ? f.value !== "csv" : true).map((f) => {
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

        <Card>
          <CardHeader>
            <CardDescription>Summary</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {hasResults ? resultCount : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {hasResults
                ? `${resultCount} record(s) in this report. Use Export to download as PDF, Excel, or CSV.`
                : "Select report type and date range, then click Generate Report to view results."}
            </p>
          </CardContent>
        </Card>
      </section>

      {hasResults && (
        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b px-4 py-3 lg:px-6">
            <h2 className="text-sm font-semibold text-zinc-900">Report Results</h2>
            <p className="text-xs text-muted-foreground">
              {REPORT_TYPES.find((r) => r.value === reportType)?.label}
              {dateRangePreset === "all"
                ? " — All time"
                : ` — ${dateFrom} to ${dateTo}`}
            </p>
          </div>
          <div className="overflow-x-auto">
            {reportType === "inventory" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No inventory items match the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    results.map((r, i) => (
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
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
                  {results.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        <p>No stock-in transactions in the selected date range.</p>
                        <p className="mt-1 text-xs">Stock In = receiving inventory from suppliers. To see issued/assigned items (from the Issuance page), choose report type &quot;Issuance&quot;.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    results.map((tx, i) => {
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
                  {results.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        <p>No stock-out transactions in the selected date range.</p>
                        <p className="mt-1 text-xs">To see items issued or assigned to divisions/personnel (from the Issuance page), choose report type &quot;Issuance&quot;.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    results.map((tx, i) => {
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
            {reportType === "issuance" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Acquired Date</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Accountable Person</TableHead>
                    <TableHead>Transferred To</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const rows = resultsForTable.flatMap((tx, txIdx) =>
                      (tx.items ?? []).map((line, idx) => {
                        const item = typeof line.itemId === "object" ? line.itemId : null
                        const acc = item?.accountablePerson ?? tx.accountablePerson ?? {}
                        const accName =
                          (typeof acc === "object" ? acc.name : null) ?? tx.issuedToPerson ?? ""
                        const txDate = tx.createdAt ?? tx.date
                        return (
                          <TableRow
                            key={`${tx._id ?? tx.id ?? txIdx}-${idx}-${item?._id ?? item?.id ?? line.itemId ?? idx}`}
                          >
                            <TableCell className="tabular-nums">
                              {txDate ? new Date(txDate).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell className="font-medium">{item?.name ?? "—"}</TableCell>
                            <TableCell className="tabular-nums">
                              {item?.unitCost != null && Number(item.unitCost) > 0
                                ? `₱${Number(item.unitCost).toLocaleString()}`
                                : "—"}
                            </TableCell>
                            <TableCell>{item?.propertyNumber ?? "—"}</TableCell>
                            <TableCell>
                              {accName
                                ? [accName, typeof acc === "object" ? acc.position : null, typeof acc === "object" ? acc.office : null]
                                    .filter(Boolean)
                                    .join(" · ") || accName
                                : "—"}
                            </TableCell>
                            <TableCell>{item?.transferredTo ?? "—"}</TableCell>
                            <TableCell className="text-sm">{tx.purpose ?? "—"}</TableCell>
                          </TableRow>
                        )
                      })
                    )
                    if (rows.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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
          </div>
        </section>
      )}
    </div>
  )
}
