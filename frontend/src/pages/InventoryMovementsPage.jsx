import { useState, useEffect, useCallback, useMemo } from "react"
import { Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { FloatingHelpButton } from "@/components/HelpButton"
import { inventoryMovementsTutorialSteps } from "@/constants/tutorialSteps"
import { itemsService, transactionsService } from "@/services"
import { getErrorMessage } from "@/utils/api"

const PAGE_SIZE_OPTIONS = [10, 25, 50]
const TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "STOCK_IN", label: "Stock In" },
  { value: "ISSUANCE", label: "Stock Out" },
  { value: "ADJUSTMENT", label: "Adjustment" },
]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function lastMonthStr() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

function formatQty(value) {
  return Number(value || 0).toLocaleString()
}

export default function InventoryMovementsPage() {
  const [transactions, setTransactions] = useState([])
  const [itemsById, setItemsById] = useState(new Map())
  const [txLoading, setTxLoading] = useState(true)
  const [itemsLoading, setItemsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState(lastMonthStr())
  const [dateTo, setDateTo] = useState(todayStr())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchTransactions = useCallback(async (showToast = false) => {
    setTxLoading(true)
    setError(null)
    try {
      const data = await transactionsService.listTransactions({ type: "STOCK_IN,ISSUANCE,ADJUSTMENT" })
      setTransactions(Array.isArray(data) ? data : [])
      if (showToast) toast.success("List refreshed.")
    } catch (err) {
      const msg = getErrorMessage(err)
      setError(msg)
      setTransactions([])
      toast.error(msg)
    } finally {
      setTxLoading(false)
    }
  }, [])

  const fetchSupplies = useCallback(async () => {
    setItemsLoading(true)
    try {
      const data = await itemsService.listItems({ type: "SUPPLY", archived: "false" })
      const map = new Map()
      ;(data || []).forEach((item) => {
        const id = String(item._id ?? item.id)
        if (!id) return
        map.set(id, item)
      })
      setItemsById(map)
    } catch (err) {
      setItemsById(new Map())
      toast.error(getErrorMessage(err))
    } finally {
      setItemsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    fetchSupplies()
  }, [fetchSupplies])

  const rows = useMemo(() => {
    const out = []
    const list = Array.isArray(transactions) ? transactions : []
    list.forEach((tx) => {
      const items = Array.isArray(tx.items) ? tx.items : []
      items.forEach((line, idx) => {
        const item = line?.itemId || {}
        const itemType = item?.itemType || ""
        if (itemType && itemType !== "SUPPLY") return
        const qty = Number(line?.qty) || 0
        if (!qty) return
        const type = String(tx?.type || "")
        let delta = 0
        if (type === "STOCK_IN") delta = qty
        if (type === "ISSUANCE") delta = -qty
        if (type === "ADJUSTMENT") {
          // Parse delta from purpose: "Manual quantity adjustment: 10 → 15 (+5)"
          const match = (tx?.purpose || "").match(/\(([+-]?\d+)\)$/)
          delta = match ? parseInt(match[1], 10) : 0
        }
        if (!delta) return
        const itemId = String(item?._id ?? item?.id ?? "")
        const currentQty = itemId ? Number(itemsById.get(itemId)?.quantityOnHand ?? 0) : 0
        out.push({
          key: `${tx._id || "tx"}-${item._id || item.id || idx}`,
          tx,
          item,
          itemId,
          qty,
          delta,
          type,
          currentQty,
        })
      })
    })
    return out
  }, [transactions, itemsById])

  const rowsWithBalance = useMemo(() => {
    if (!rows.length) return []
    const byItem = new Map()
    rows.forEach((row) => {
      if (!row.itemId) return
      if (!byItem.has(row.itemId)) byItem.set(row.itemId, [])
      byItem.get(row.itemId).push(row)
    })

    const out = []
    byItem.forEach((list, itemId) => {
      list.sort((a, b) => new Date(b.tx?.createdAt || 0) - new Date(a.tx?.createdAt || 0))
      let running = Number(itemsById.get(itemId)?.quantityOnHand ?? 0)
      list.forEach((row) => {
        const balanceAfter = running
        const balanceBefore = running - row.delta
        out.push({ ...row, balanceAfter, balanceBefore })
        running = balanceBefore
      })
    })
    return out
  }, [rows, itemsById])

  const filteredRows = rowsWithBalance.filter((row) => {
    const txDate = row.tx?.createdAt ? new Date(row.tx.createdAt) : null
    if (dateFrom && txDate) {
      const from = new Date(dateFrom + "T00:00:00.000Z")
      if (txDate < from) return false
    }
    if (dateTo && txDate) {
      const to = new Date(dateTo + "T23:59:59.999Z")
      if (txDate > to) return false
    }
    if (typeFilter !== "all" && row.type !== typeFilter) return false
    if (search.trim()) {
      const s = search.toLowerCase()
      const itemName = (row.item?.name ?? "").toLowerCase()
      const itemCat = (row.item?.category ?? "").toLowerCase()
      const itemUnit = (row.item?.unit ?? "").toLowerCase()
      const itemProp = (row.item?.propertyNumber ?? "").toLowerCase()
      const by = (row.tx?.createdBy?.name ?? "").toLowerCase()
      const sup = (row.tx?.supplier ?? "").toLowerCase()
      const ref = (row.tx?.referenceNo ?? "").toLowerCase()
      const office = (row.tx?.issuedToOffice ?? "").toLowerCase()
      const person = (row.tx?.issuedToPerson ?? "").toLowerCase()
      if (!itemName.includes(s) && !itemCat.includes(s) && !itemUnit.includes(s) && !itemProp.includes(s)
        && !by.includes(s) && !sup.includes(s) && !ref.includes(s) && !office.includes(s) && !person.includes(s)) {
        return false
      }
    }
    return true
  })

  const totalInQty = filteredRows.reduce((sum, row) => sum + (row.delta > 0 ? row.qty : 0), 0)
  const totalOutQty = filteredRows.reduce((sum, row) => sum + (row.delta < 0 ? Math.abs(row.delta) : 0), 0)
  const netQty = totalInQty - totalOutQty

  const totalFiltered = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)
  const startRow = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1
  const endRow = Math.min(page * pageSize, totalFiltered)

  useEffect(() => {
    setPage(1)
  }, [search, typeFilter, dateFrom, dateTo, pageSize])

  return (
    <div className="mx-auto flex min-w-0 w-full max-w-[1400px] flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between" data-tutorial="movements-header">
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
                <BreadcrumbPage>Inventory Movements</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="mt-2 truncate text-xl font-semibold tracking-tight text-zinc-900">
            Inventory Movements
          </h1>
          <p className="text-sm text-muted-foreground">
            Track quantity changes for supplies across stock in and stock out.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" data-tutorial="action-buttons">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => fetchTransactions(true)} 
            disabled={txLoading}
            data-tutorial="refresh-movements-btn"
          >
            <RefreshCw className="size-4" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button asChild>
            <Link to="/stock/in">Stock In</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/issuance">Stock Out</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="@container/main grid grid-cols-1 gap-4 sm:grid-cols-3" data-tutorial="summary-cards">
        <Card>
          <CardHeader>
            <CardDescription>Total In</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">+{formatQty(totalInQty)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Out</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">-{formatQty(totalOutQty)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Net Change</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{netQty >= 0 ? "+" : ""}{formatQty(netQty)}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="min-w-0 overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-sm flex-1 min-w-[180px]" data-tutorial="search-input">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search items, references, people..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="min-w-[150px]" data-tutorial="type-filter">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2" data-tutorial="date-filters">
              <Label htmlFor="date-from-mv" className="text-muted-foreground text-xs whitespace-nowrap">From</Label>
              <Input
                id="date-from-mv"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[140px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="date-to-mv" className="text-muted-foreground text-xs whitespace-nowrap">To</Label>
              <Input
                id="date-to-mv"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[140px]"
              />
            </div>
            <div className="flex items-center gap-2" data-tutorial="page-size">
              <Label className="text-muted-foreground text-xs whitespace-nowrap">Rows</Label>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(parseInt(v, 10))}>
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="w-full min-w-0 overflow-x-auto px-4 lg:px-6">
          <div className="inline-block min-w-full rounded-lg border">
            <Table className="w-max min-w-full table-auto" data-tutorial="movements-table">
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead className="px-3 whitespace-nowrap">Date</TableHead>
                  <TableHead className="px-3 whitespace-nowrap">Item</TableHead>
                  <TableHead className="px-3 whitespace-nowrap">Type</TableHead>
                  <TableHead className="px-3 whitespace-nowrap">Qty Change</TableHead>
                  <TableHead className="px-3 whitespace-nowrap">Balance Before</TableHead>
                  <TableHead className="px-3 whitespace-nowrap">Balance After</TableHead>
                  <TableHead className="px-3 whitespace-nowrap">Remarks</TableHead>
                  <TableHead className="px-3 whitespace-nowrap">By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txLoading || itemsLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                      No movements match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row) => {
                    const isIn = row.delta > 0
                    const itemName = row.item?.name || "Unknown item"
                    const itemMeta = [row.item?.category, row.item?.unit].filter(Boolean).join(" • ") || "—"
                    const remarks = row.tx?.purpose || row.tx?.remarks || "—"
                    return (
                      <TableRow key={row.key}>
                        <TableCell className="px-3 whitespace-nowrap">
                          {row.tx?.createdAt ? new Date(row.tx.createdAt).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="px-3 min-w-[220px]">
                          <div className="flex flex-col">
                            <span className="font-medium text-zinc-900">{itemName}</span>
                            <span className="text-xs text-muted-foreground">{itemMeta}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 whitespace-nowrap">
                          <Badge variant={isIn ? "secondary" : "outline"}>
                            {row.type === "ADJUSTMENT" ? "Adjustment" : isIn ? "Stock In" : "Stock Out"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 whitespace-nowrap">
                          <span className={isIn ? "text-emerald-700 tabular-nums" : "text-rose-700 tabular-nums"}>
                            {isIn ? "+" : "-"}{formatQty(Math.abs(row.delta))}{row.item?.unit ? ` ${row.item.unit}` : ""}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 whitespace-nowrap">
                          <span className="tabular-nums">
                            {typeof row.balanceBefore === "number" ? formatQty(row.balanceBefore) : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 whitespace-nowrap">
                          <span className="tabular-nums">
                            {typeof row.balanceAfter === "number" ? formatQty(row.balanceAfter) : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 min-w-[200px]">
                          <span className="text-sm text-muted-foreground">{remarks}</span>
                        </TableCell>
                        <TableCell className="px-3 whitespace-nowrap">
                          {row.tx?.createdBy?.name || "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between" data-tutorial="pagination">
          <span>Showing {startRow}–{endRow} of {totalFiltered} movement entries</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="mr-1 size-4" />
              Prev
            </Button>
            <span className="text-xs">Page {page} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      </section>
      
      <FloatingHelpButton steps={inventoryMovementsTutorialSteps} pageId="inventoryMovements" />
    </div>
  )
}
