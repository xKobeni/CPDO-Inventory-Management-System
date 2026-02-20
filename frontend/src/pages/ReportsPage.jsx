import { useState } from "react"
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

export default function ReportsPage() {
  const [reportType, setReportType] = useState("inventory")
  const [dateFrom, setDateFrom] = useState("2026-01-01")
  const [dateTo, setDateTo] = useState("2026-02-19")
  const [hasResults, setHasResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [inventoryResults, setInventoryResults] = useState([])
  const [txResults, setTxResults] = useState([])

  const isInventory = reportType === "inventory"
  const results = isInventory ? inventoryResults : txResults
  const resultCount = Array.isArray(results) ? results.length : 0

  const handleGenerate = async () => {
    setLoading(true)
    setHasResults(false)
    try {
      if (reportType === "inventory") {
        const data = await itemsService.listItems({ archived: "false" })
        setInventoryResults(data)
      } else {
        const type = reportType === "stock-in" ? "STOCK_IN" : "ISSUANCE"
        const data = await transactionsService.listTransactions({ type })
        setTxResults(data)
      }
      setHasResults(true)
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
        const blob = await exportService.downloadTransactionsXlsx()
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
            <CardDescription>Select report type, date range, and generate results.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="report-type">Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
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
                <div className="flex gap-2">
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
              </div>
            </div>
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
              {REPORT_TYPES.find((r) => r.value === reportType)?.label} — {dateFrom} to {dateTo}
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
                  {results.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.category}</TableCell>
                      <TableCell>{r.itemType === "SUPPLY" ? r.quantityOnHand : "1"}</TableCell>
                      <TableCell>{r.unit}</TableCell>
                      <TableCell>{r.itemType}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {(reportType === "stock-in" || reportType === "stock-out" || reportType === "issuance") && (
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
                  {results.map((tx) => (
                    <TableRow key={tx._id}>
                      <TableCell className="tabular-nums">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>{tx.type}</TableCell>
                      <TableCell className="text-sm">
                        {(tx.items ?? []).map((i) => `${i.qty}× ${i.itemId?.name ?? "—"}`).join(", ")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {tx.supplier ? `Supplier: ${tx.supplier}` : tx.issuedToOffice ? `${tx.issuedToOffice}${tx.issuedToPerson ? ` · ${tx.issuedToPerson}` : ""}` : "—"}
                      </TableCell>
                      <TableCell>{tx.createdBy?.name ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
