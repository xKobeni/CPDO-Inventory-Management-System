import { useState, useEffect, useCallback } from "react"
import { Search, RefreshCw, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { itemsService, transactionsService } from "@/services"

const PAGE_SIZE_OPTIONS = [10, 25, 50]
function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function lastMonthStr() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

export default function StockOutPage() {
  const [transactions, setTransactions] = useState([])
  const [txLoading, setTxLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState(lastMonthStr())
  const [dateTo, setDateTo] = useState(todayStr())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Stock out form state
  const [supplies, setSupplies] = useState([])
  const [suppliesLoading, setSuppliesLoading] = useState(false)
  const [lines, setLines] = useState([{ itemId: "", qty: 1 }])
  const [purpose, setPurpose] = useState("usage")
  const [remarks, setRemarks] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchTransactions = useCallback(async (showToast = false) => {
    setTxLoading(true)
    setError(null)
    try {
      const data = await transactionsService.listTransactions({ type: "ISSUANCE" })
      setTransactions(data)
      if (showToast) toast.success("List refreshed.")
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load records."
      setError(msg)
      setTransactions([])
      toast.error(msg)
    } finally {
      setTxLoading(false)
    }
  }, [])

  const fetchSupplies = useCallback(async () => {
    setSuppliesLoading(true)
    try {
      const data = await itemsService.listItems({ type: "SUPPLY", archived: "false" })
      setSupplies(data)
    } catch (err) {
      toast.error("Failed to load supplies")
      setSupplies([])
    } finally {
      setSuppliesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
    fetchSupplies()
  }, [fetchTransactions, fetchSupplies])

  const setLine = (idx, field, value) => {
    const updated = [...lines]
    updated[idx] = { ...updated[idx], [field]: value }
    setLines(updated)
  }

  const addLine = () => {
    setLines([...lines, { itemId: "", qty: 1 }])
  }

  const removeLine = (idx) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== idx))
    }
  }

  const handleSubmit = async () => {
    // Validate form
    if (lines.some((line) => !line.itemId || line.qty < 1)) {
      toast.error("Please fill in all items and quantities")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        items: lines.map((line) => ({
          itemId: line.itemId,
          qty: parseInt(line.qty, 10),
        })),
        issuedToOffice: "INVENTORY ADJUSTMENT",
        issuedToPerson: "System",
        purpose: `Stock Out - ${purpose}${remarks.trim() ? ": " + remarks.trim() : ""}`,
      }
      await transactionsService.createIssuance(payload)
      toast.success("Stock out recorded successfully")
      setLines([{ itemId: "", qty: 1 }])
      setPurpose("usage")
      setRemarks("")
      fetchTransactions(false)
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to record stock out"
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const outToday = transactions.filter((t) => {
    const d = t.createdAt ? new Date(t.createdAt) : null
    if (!d) return false
    const today = new Date()
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  }).length
  const outMonth = transactions.filter((t) => {
    const d = t.createdAt ? new Date(t.createdAt) : null
    if (!d) return false
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const filteredTx = transactions.filter((t) => {
    const txDate = t.createdAt ? new Date(t.createdAt) : null
    if (dateFrom && txDate) {
      const from = new Date(dateFrom + "T00:00:00.000Z")
      if (txDate < from) return false
    }
    if (dateTo && txDate) {
      const to = new Date(dateTo + "T23:59:59.999Z")
      if (txDate > to) return false
    }
    if (search.trim()) {
      const s = search.toLowerCase()
      const by = (t.createdBy?.name ?? "").toLowerCase()
      const office = (t.issuedToOffice ?? "").toLowerCase()
      const person = (t.issuedToPerson ?? "").toLowerCase()
      const itemNames = (t.items ?? []).map((i) => (i.itemId?.name ?? "").toLowerCase()).join(" ")
      if (!by.includes(s) && !office.includes(s) && !person.includes(s) && !itemNames.includes(s)) return false
    }
    return true
  })

  const totalFiltered = filteredTx.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const paginatedTx = filteredTx.slice((page - 1) * pageSize, page * pageSize)
  const startRow = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1
  const endRow = Math.min(page * pageSize, totalFiltered)

  useEffect(() => {
    setPage(1)
  }, [search, dateFrom, dateTo])

  return (
    <div className="mx-auto flex min-w-0 w-full max-w-[1400px] flex-col gap-6">
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
                <BreadcrumbPage>Stock Out</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="mt-2 truncate text-xl font-semibold tracking-tight text-zinc-900">
            Stock Out
          </h1>
          <p className="text-sm text-muted-foreground">
            View supply release history. Record new releases on the Issuance page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchTransactions(true)} disabled={txLoading}>
            <RefreshCw className="size-4" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button asChild>
            <Link to="/issuance">Record stock out (Issuance)</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/stock/in">Stock In</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/items">View inventory</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="@container/main grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Today Released</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{outToday}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>This Month</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{outMonth}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Stock Out</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{transactions.length}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record stock out</CardTitle>
            <CardDescription>
              Record supply reduction with reason
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1 grid gap-2">
                  <Label className="text-xs">Item</Label>
                  <Select
                    value={line.itemId}
                    onValueChange={(v) => setLine(idx, "itemId", v)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {supplies.map((item) => (
                        <SelectItem key={item._id} value={item._id}>
                          {item.name}
                        </SelectItem>
                      ))}
                      {supplies.length === 0 && !suppliesLoading && (
                        <SelectItem value="_" disabled>No supplies</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20 grid gap-2">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    className="h-8"
                    value={line.qty}
                    onChange={(e) => setLine(idx, "qty", e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeLine(idx)}
                  disabled={lines.length <= 1}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="w-full h-8" onClick={addLine}>
              <Plus className="size-3" />
              Add line
            </Button>

            <div className="grid gap-2">
              <Label htmlFor="purpose-so" className="text-xs">Reason *</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger id="purpose-so" className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usage">Usage</SelectItem>
                  <SelectItem value="missing">Missing</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="disposal">Disposal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="remarks-so" className="text-xs">Notes (optional)</Label>
              <Input
                id="remarks-so"
                className="h-8"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Additional details"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                className="flex-1 h-8" 
                onClick={handleSubmit} 
                disabled={submitting || lines.some((line) => !line.itemId || line.qty < 1)}
              >
                {submitting ? "Recording…" : "Record Stock Out"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <section className="lg:col-span-2 min-w-0 overflow-hidden rounded-xl border bg-white">
          <div className="flex flex-col gap-3 border-b px-4 py-3 lg:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative max-w-sm flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search records..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="date-from-so" className="text-muted-foreground text-xs whitespace-nowrap">From</Label>
                <Input
                  id="date-from-so"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[140px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="date-to-so" className="text-muted-foreground text-xs whitespace-nowrap">To</Label>
                <Input
                  id="date-to-so"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[140px]"
                />
              </div>
            </div>
          </div>
          <div className="w-full min-w-0 overflow-x-auto px-4 lg:px-6">
            <div className="inline-block min-w-full rounded-lg border">
              <Table className="w-max min-w-full table-auto">
                <TableHeader className="bg-muted sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="px-3 whitespace-nowrap">Date</TableHead>
                    <TableHead className="px-3 whitespace-nowrap">Items</TableHead>
                    <TableHead className="px-3 whitespace-nowrap">Department</TableHead>
                    <TableHead className="px-3 whitespace-nowrap">Released By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filteredTx.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                        No stock-out records match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTx.map((tx) => (
                      <TableRow key={tx._id}>
                        <TableCell className="px-3 tabular-nums">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell className="px-3 text-sm">
                          {(tx.items ?? []).map((i) => `${i.qty}× ${i.itemId?.name ?? "—"}`).join(", ")}
                        </TableCell>
                        <TableCell className="px-3">{tx.issuedToOffice ?? "—"}</TableCell>
                        <TableCell className="px-3">{tx.createdBy?.name ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          {filteredTx.length > 0 && (
            <div className="flex flex-col gap-3 border-t px-4 py-3 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>Showing {startRow}–{endRow} of {totalFiltered}</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>per page</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft className="size-4" /> Previous
                </Button>
                <span className="min-w-[90px] text-center text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </section>
      </section>
    </div>
  )
}
