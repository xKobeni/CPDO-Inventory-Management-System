import { useState } from "react"
import { BarChart3, RefreshCw, Download, FileSpreadsheet, FileText, FileDown } from "lucide-react"
import { Link } from "react-router-dom"

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

const REPORT_TYPES = [
  { value: "inventory", label: "Inventory Summary" },
  { value: "stock-in", label: "Stock In" },
  { value: "stock-out", label: "Stock Out" },
  { value: "issuance", label: "Issuance" },
]

const EXPORT_FORMATS = [
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "excel", label: "Excel", icon: FileSpreadsheet },
  { value: "csv", label: "CSV", icon: FileDown },
]

// Sample report results (would come from API in real app)
const SAMPLE_RESULTS = {
  inventory: [
    { id: "I001", name: "Dell OptiPlex Desktop", category: "ICT Equipment", qty: 15, unit: "pcs", status: "In Stock" },
    { id: "I002", name: "Office Chair", category: "Furniture & Fixtures", qty: 25, unit: "pcs", status: "In Stock" },
    { id: "I003", name: "Paracetamol 500mg", category: "Drugs", qty: 500, unit: "boxes", status: "In Stock" },
  ],
  "stock-in": [
    { id: "SI-101", item: "Dell Monitor", qty: 10, supplier: "Tech Supplies Co.", date: "Feb 18, 2026" },
    { id: "SI-102", item: "Office Chair", qty: 5, supplier: "Furniture Hub", date: "Feb 17, 2026" },
  ],
  "stock-out": [
    { id: "SO-201", item: "Dell Monitor", qty: 2, department: "Planning", date: "Feb 18, 2026" },
    { id: "SO-202", item: "Printer Ink", qty: 5, department: "Admin Office", date: "Feb 16, 2026" },
  ],
  issuance: [
    { id: "ISS-301", item: "Laptop Dell Inspiron", issuedTo: "Louis Marco Toque", dept: "Planning", date: "Feb 16, 2026", status: "Active" },
    { id: "ISS-302", item: "Office Chair", issuedTo: "Adrian Perce", dept: "IT", date: "Feb 18, 2026", status: "Pending Return" },
  ],
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState("inventory")
  const [dateFrom, setDateFrom] = useState("2026-01-01")
  const [dateTo, setDateTo] = useState("2026-02-19")
  const [hasResults, setHasResults] = useState(false)

  const results = SAMPLE_RESULTS[reportType] ?? []
  const resultCount = results.length

  const handleGenerate = () => {
    setHasResults(true)
  }

  const handleExport = (format) => {
    // In real app: trigger download
    console.log(`Export as ${format}`, { reportType, dateFrom, dateTo })
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
              <Button onClick={handleGenerate}>
                <BarChart3 className="size-4" />
                Generate Report
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
                    {EXPORT_FORMATS.map((f) => {
                      const Icon = f.icon
                      return (
                        <DropdownMenuItem key={f.value} onClick={() => handleExport(f.value)}>
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
                    <TableHead>ID</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.id}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.category}</TableCell>
                      <TableCell>{r.qty}</TableCell>
                      <TableCell>{r.unit}</TableCell>
                      <TableCell>{r.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {reportType === "stock-in" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.id}</TableCell>
                      <TableCell>{r.item}</TableCell>
                      <TableCell>{r.qty}</TableCell>
                      <TableCell>{r.supplier}</TableCell>
                      <TableCell>{r.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {reportType === "stock-out" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.id}</TableCell>
                      <TableCell>{r.item}</TableCell>
                      <TableCell>{r.qty}</TableCell>
                      <TableCell>{r.department}</TableCell>
                      <TableCell>{r.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {reportType === "issuance" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Issued To</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.id}</TableCell>
                      <TableCell>{r.item}</TableCell>
                      <TableCell>{r.issuedTo}</TableCell>
                      <TableCell>{r.dept}</TableCell>
                      <TableCell>{r.date}</TableCell>
                      <TableCell>{r.status}</TableCell>
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
