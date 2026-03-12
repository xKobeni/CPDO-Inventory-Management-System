import { useState, useEffect, useCallback } from "react"
import { Search, Plus, Trash2, Package, RefreshCw, ChevronLeft, ChevronRight, TrendingUp, AlertCircle } from "lucide-react"
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
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/ui/combobox"
import { itemsService, transactionsService } from "@/services"
import { getErrorMessage } from "@/utils/api"
import { FloatingHelpButton } from "@/components/HelpButton"
import { stockInTutorialSteps } from "@/constants/tutorialSteps"

const STOCK_IN_MODE_SUPPLY = "supply"
const STOCK_IN_MODE_ASSET = "asset"
const PAGE_SIZE_OPTIONS = [10, 25, 50]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function lastMonthStr() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

export default function StockInPage() {
  const [mode, setMode] = useState(STOCK_IN_MODE_SUPPLY)
  const [supplies, setSupplies] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [txLoading, setTxLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState(lastMonthStr())
  const [dateTo, setDateTo] = useState(todayStr())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [lines, setLines] = useState([{ itemId: "", qty: 1, searchQuery: "" }])
  const [remarks, setRemarks] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchSupplies = useCallback(async () => {
    try {
      const data = await itemsService.listItems({ type: "SUPPLY", archived: "false" })
      setSupplies(data)
    } catch (err) {
      setError(getErrorMessage(err))
      setSupplies([])
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTransactions = useCallback(async (showToast = false) => {
    setTxLoading(true)
    try {
      const data = await transactionsService.listTransactions({ type: "STOCK_IN" })
      setTransactions(data)
      if (showToast) toast.success("List refreshed.")
    } catch (err) {
      setTransactions([])
      toast.error(getErrorMessage(err))
    } finally {
      setTxLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSupplies()
  }, [fetchSupplies])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const stockInToday = transactions.filter((t) => {
    const d = t.createdAt ? new Date(t.createdAt) : null
    if (!d) return false
    const today = new Date()
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  }).length
  const stockInMonth = transactions.filter((t) => {
    const d = t.createdAt ? new Date(t.createdAt) : null
    if (!d) return false
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const addLine = () => setLines((prev) => [...prev, { itemId: "", qty: 1, searchQuery: "" }])
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx))
  const setLine = (idx, field, value) => {
    setLines((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: field === "qty" ? (parseInt(value, 10) || 0) : value }
      // Reset search query when item changes
      if (field === "itemId" && value !== next[idx].itemId) {
        next[idx].searchQuery = ""
      }
      return next
    })
  }

  // Get supply item by ID
  const getSupplyItem = useCallback((itemId) => {
    return supplies.find((item) => item._id === itemId)
  }, [supplies])

  // Get filtered supplies for search
  const getFilteredSupplies = useCallback((query) => {
    if (!query.trim()) return supplies
    return supplies.filter((item) => 
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(query.toLowerCase())) ||
      (item.brand && item.brand.toLowerCase().includes(query.toLowerCase()))
    )
  }, [supplies])

  const handleSubmit = async () => {
    const items = lines
      .filter((l) => l.itemId && l.qty > 0)
      .map((l) => ({ itemId: l.itemId, qty: l.qty }))
    if (items.length === 0) {
      toast.error("Add at least one item with quantity.")
      return
    }
    setSubmitting(true)
    try {
      await transactionsService.createStockIn({
        items,
        referenceNo: remarks.trim() || undefined,
      })
      toast.success("Stock In recorded.")
      setLines([{ itemId: "", qty: 1, searchQuery: "" }])
      setRemarks("")
      fetchTransactions()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

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
      const ref = (t.referenceNo ?? "").toLowerCase() 
      const itemNames = (t.items ?? []).map((i) => (i.itemId?.name ?? "").toLowerCase()).join(" ")
      if (!by.includes(s) && !ref.includes(s) && !itemNames.includes(s)) return false
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
      {/* Floating Help Button for Tutorial */}
      <FloatingHelpButton steps={stockInTutorialSteps} pageId="stockIn" />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between" data-tutorial="stockin-header">
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
                <BreadcrumbPage>Stock In</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="mt-2 truncate text-xl font-semibold tracking-tight text-zinc-900">
            Stock In
          </h1>
          <p className="text-sm text-muted-foreground">
            Record and track incoming inventory items (supplies only).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchTransactions(true)} disabled={txLoading} data-tutorial="refresh-btn">
            <RefreshCw className="size-4" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button asChild data-tutorial="stockout-link">
            <Link to="/stock/out">Stock Out</Link>
          </Button>
          <Button asChild variant="outline" data-tutorial="view-inventory-btn">
            <Link to="/items">View inventory</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}

      <section className="@container/main grid grid-cols-1 gap-4 sm:grid-cols-3" data-tutorial="stats-cards">
        <Card>
          <CardHeader>
            <CardDescription>Today Entries</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{stockInToday}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>This Month</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{stockInMonth}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Stock In</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{transactions.length}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card data-tutorial="stockin-form">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-4" />
                New Stock Entry
              </CardTitle>
              <div className="flex rounded-md border border-input bg-muted/30 p-0.5" data-tutorial="mode-toggle">
                <Button
                  type="button"
                  variant={mode === STOCK_IN_MODE_SUPPLY ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setMode(STOCK_IN_MODE_SUPPLY)}
                >
                  Supplies
                </Button>
                <Button
                  type="button"
                  variant={mode === STOCK_IN_MODE_ASSET ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setMode(STOCK_IN_MODE_ASSET)}
                >
                  Asset
                </Button>
              </div>
            </div>
            <CardDescription>
              {mode === STOCK_IN_MODE_SUPPLY
                ? "Record incoming supply items"
                : "Add new assets via Inventories"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === STOCK_IN_MODE_SUPPLY ? (
              <>
            {lines.map((line, idx) => {
              const selectedItem = line.itemId ? getSupplyItem(line.itemId) : null
              const currentStock = selectedItem ? Number(selectedItem.quantityOnHand ?? selectedItem.quantity ?? 0) : 0
              const filteredItems = getFilteredSupplies(line.searchQuery)
              
              return (
                <div key={idx} className="space-y-2">
                  <div key={idx} className="flex gap-2 items-end">
                    <div className="flex-1 grid gap-2">
                      <Label>Item</Label>
                      <Combobox
                        value={line.itemId}
                        onValueChange={(value) => setLine(idx, "itemId", value)}
                      >
                        <ComboboxInput
                          placeholder="Search for an item..."
                          value={selectedItem ? selectedItem.name : line.searchQuery}
                          onValueChange={(value) => setLine(idx, "searchQuery", value)}
                        />
                        <ComboboxContent>
                          <ComboboxList>
                            <ComboboxEmpty>No items found</ComboboxEmpty>
                            {filteredItems.map((item) => (
                              <ComboboxItem key={item._id} value={item._id}>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="truncate">{item.name}</span>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 ml-2">
                                      <Package className="size-3" />
                                      <span className={`font-medium ${
                                        Number(item.quantityOnHand ?? item.quantity ?? 0) <= 0 ? 'text-red-500' : 
                                        Number(item.quantityOnHand ?? item.quantity ?? 0) <= 10 ? 'text-orange-500' : 'text-green-600'
                                      }`}>
                                        {Number(item.quantityOnHand ?? item.quantity ?? 0)}
                                      </span>
                                    </div>
                                  </div>
                                  {item.description && (
                                    <div className="text-xs text-muted-foreground truncate">
                                      {item.description}
                                    </div>
                                  )}
                                </div>
                              </ComboboxItem>
                            ))}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </div>
                    <div className="w-24 grid gap-2">
                      <Label>Qty</Label>
                      <Input
                        type="number"
                        min={1}
                        value={line.qty}
                        onChange={(e) => setLine(idx, "qty", e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(idx)}
                      disabled={lines.length <= 1}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  
                  {selectedItem && (
                    <div className="flex items-center justify-between text-xs px-2 py-1 bg-muted/30 rounded">
                      <div className="flex items-center gap-2">
                        <Package className="size-3" />
                        <span>Current stock:</span>
                        <span className={`font-medium ${
                          currentStock <= 0 ? 'text-red-500' : 
                          currentStock <= 10 ? 'text-orange-500' : 'text-green-600'
                        }`}>
                          {currentStock}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="size-3" />
                        <span>Adding stock</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            <Button type="button" variant="outline" size="sm" onClick={addLine} data-tutorial="add-line-btn">
              <Plus className="size-4" />
              Add line
            </Button>
            <div className="space-y-2">
              <Label htmlFor="remarks-in">Remarks (optional)</Label>
              <Input
                id="remarks-in"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Additional notes or reference"
              />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={submitting || loading} data-tutorial="submit-btn">
              {submitting ? "Saving…" : "Save Stock In"}
            </Button>
              </>
            ) : (
              <div className="rounded-lg border border-muted bg-muted/30 p-4 text-sm text-muted-foreground">
                <p className="mb-2">To add new assets to the inventory, go to Inventories, select a category, and use <strong>Add Item</strong> with type <strong>Asset</strong>.</p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/items">Go to Inventories</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <section className="lg:col-span-2 overflow-hidden rounded-xl border bg-white" data-tutorial="transactions-section">
          <div className="flex flex-col gap-3 border-b px-4 py-3 lg:px-6" data-tutorial="search-filter">
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
                <Label htmlFor="date-from-si" className="text-muted-foreground text-xs whitespace-nowrap">From</Label>
                <Input
                  id="date-from-si"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[140px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="date-to-si" className="text-muted-foreground text-xs whitespace-nowrap">To</Label>
                <Input
                  id="date-to-si"
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
                    <TableHead className="px-3 whitespace-nowrap">Items Added</TableHead>
                    <TableHead className="px-3 whitespace-nowrap">Remarks</TableHead>
                    <TableHead className="px-3 whitespace-nowrap">Recorded By</TableHead>
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
                        No stock-in records match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTx.map((tx) => (
                      <TableRow key={tx._id}>
                        <TableCell className="px-3 tabular-nums">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell className="px-3 text-sm">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="size-4 text-green-500 shrink-0" />
                            <span>{(tx.items ?? []).map((i) => `${i.qty}× ${i.itemId?.name ?? "N/A"}`).join(", ")}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3">{tx.referenceNo ?? "N/A"}</TableCell>
                        <TableCell className="px-3">{tx.createdBy?.name ?? "N/A"}</TableCell>
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
