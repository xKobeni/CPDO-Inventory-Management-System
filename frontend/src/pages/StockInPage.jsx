import { useState, useEffect, useCallback } from "react"
import { Search, Plus, Trash2, Package } from "lucide-react"
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
import { itemsService, transactionsService } from "@/services"
import { getErrorMessage } from "@/utils/api"

const STOCK_IN_MODE_SUPPLY = "supply"
const STOCK_IN_MODE_ASSET = "asset"

export default function StockInPage() {
  const [mode, setMode] = useState(STOCK_IN_MODE_SUPPLY)
  const [supplies, setSupplies] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [txLoading, setTxLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")

  const [lines, setLines] = useState([{ itemId: "", qty: 1 }])
  const [supplier, setSupplier] = useState("")
  const [referenceNo, setReferenceNo] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchSupplies = useCallback(async () => {
    try {
      const data = await itemsService.listItems({ type: "SUPPLY", archived: "false" })
      setSupplies(data)
    } catch (err) {
      setError(getErrorMessage(err))
      setSupplies([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true)
    try {
      const data = await transactionsService.listTransactions({ type: "STOCK_IN" })
      setTransactions(data)
    } catch {
      setTransactions([])
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

  const addLine = () => setLines((prev) => [...prev, { itemId: "", qty: 1 }])
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx))
  const setLine = (idx, field, value) => {
    setLines((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: field === "qty" ? (parseInt(value, 10) || 0) : value }
      return next
    })
  }

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
        supplier: supplier.trim() || undefined,
        referenceNo: referenceNo.trim() || undefined,
      })
      toast.success("Stock In recorded.")
      setLines([{ itemId: "", qty: 1 }])
      setSupplier("")
      setReferenceNo("")
      fetchTransactions()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const filteredTx = transactions.filter((t) => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    const by = t.createdBy?.name ?? ""
    const sup = (t.supplier ?? "").toLowerCase()
    const ref = (t.referenceNo ?? "").toLowerCase()
    const itemNames = (t.items ?? []).map((i) => (i.itemId?.name ?? "").toLowerCase()).join(" ")
    return by.includes(s) || sup.includes(s) || ref.includes(s) || itemNames.includes(s)
  })

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
          <Button asChild>
            <Link to="/stock/out">Stock Out</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/items">View inventory</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}

      <section className="@container/main grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-4" />
                New Stock Entry
              </CardTitle>
              <div className="flex rounded-md border border-input bg-muted/30 p-0.5">
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
            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1 grid gap-2">
                  <Label>Item</Label>
                  <Select
                    value={line.itemId}
                    onValueChange={(v) => setLine(idx, "itemId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supply" />
                    </SelectTrigger>
                    <SelectContent>
                      {supplies.map((item) => (
                        <SelectItem key={item._id} value={item._id}>
                          {item.name}
                        </SelectItem>
                      ))}
                      {supplies.length === 0 && !loading && (
                        <SelectItem value="_" disabled>No supplies</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
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
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="size-4" />
              Add line
            </Button>
            <div className="space-y-2">
              <Label htmlFor="supplier-in">Supplier (optional)</Label>
              <Input
                id="supplier-in"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Supplier"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ref-in">Reference No. (optional)</Label>
              <Input
                id="ref-in"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Reference"
              />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={submitting || loading}>
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

        <section className="lg:col-span-2 min-w-0 overflow-hidden rounded-xl border bg-white">
          <div className="flex flex-col gap-3 border-b px-4 py-3 lg:px-6 md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search records..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full min-w-0 overflow-x-auto px-4 lg:px-6">
            <div className="inline-block min-w-full rounded-lg border">
              <Table className="w-max min-w-full table-auto">
                <TableHeader className="bg-muted sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="px-3 whitespace-nowrap">Date</TableHead>
                    <TableHead className="px-3 whitespace-nowrap">Items</TableHead>
                    <TableHead className="px-3 whitespace-nowrap">Supplier</TableHead>
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
                        No stock-in records yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTx.map((tx) => (
                      <TableRow key={tx._id}>
                        <TableCell className="px-3 tabular-nums">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell className="px-3 text-sm">
                          {(tx.items ?? []).map((i) => `${i.qty}× ${i.itemId?.name ?? "—"}`).join(", ")}
                        </TableCell>
                        <TableCell className="px-3">{tx.supplier ?? "—"}</TableCell>
                        <TableCell className="px-3">{tx.createdBy?.name ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>
      </section>
    </div>
  )
}
