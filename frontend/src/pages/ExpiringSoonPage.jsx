import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Timer, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { itemsService } from "@/services"
import { getErrorMessage } from "@/utils/api"

function slugFromCategory(category) {
  if (!category || typeof category !== "string") return "general"
  return category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "general"
}

function DaysBadge({ date }) {
  const d = new Date(date)
  const now = new Date()
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  let cls = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
  let label
  if (diffDays < 0) {
    cls += " border-red-300 bg-red-50 text-red-700"
    label = `Expired (${d.toLocaleDateString()})`
  } else if (diffDays <= 7) {
    cls += " border-amber-300 bg-amber-50 text-amber-700"
    label = `${diffDays}d left`
  } else {
    cls += " border-zinc-200 bg-white text-zinc-600"
    label = `${diffDays}d left`
  }
  return <span className={cls}>{label}</span>
}

export default function ExpiringSoonPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")

  const categories = Array.from(
    new Set((items || []).map((item) => item.category || "Uncategorized"))
  ).sort((a, b) => a.localeCompare(b))

  const filteredItems = (items || []).filter((item) => {
    const name = (item.name || "").toLowerCase()
    const category = (item.category || "Uncategorized").toLowerCase()
    const matchesCategory = categoryFilter === "all"
      ? true
      : (item.category || "Uncategorized") === categoryFilter
    const q = search.trim().toLowerCase()
    const matchesSearch = q ? name.includes(q) || category.includes(q) : true
    return matchesCategory && matchesSearch
  })

  const totalQuantity = (items || []).reduce((sum, item) => {
    return sum + Number(item.quantityOnHand ?? item.quantity ?? 0)
  }, 0)

  const load = async (showToast = false) => {
    setLoading(true)
    setError(null)
    try {
      const data = await itemsService.listItems({ archived: "false" })
      const list = Array.isArray(data) ? data : []
      const now = new Date()
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const expiring = list.filter((item) => {
        if ((item.itemType || "SUPPLY") !== "SUPPLY") return false
        if (!item.expirationDate) return false
        const d = new Date(item.expirationDate)
        return d >= now && d <= thirtyDays
      })
      setItems(expiring)
      if (showToast) toast.success("List refreshed.")
    } catch (err) {
      setError(getErrorMessage(err))
      setItems([])
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

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
                <BreadcrumbLink asChild>
                  <Link to="/items">Inventories</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Expiring soon</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="mt-2 flex items-center gap-2 truncate text-xl font-semibold tracking-tight text-zinc-900">
            <Timer className="size-5 text-amber-600" />
            Expiring soon
          </h1>
          <p className="text-sm text-muted-foreground">
            Supplies expiring within the next 30 days. Plan usage or mark for disposal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="icon" onClick={() => load(true)} disabled={loading}>
            <RefreshCw className="size-4" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button asChild variant="outline">
            <Link to="/items">Back to categories</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Expiring items</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {items.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Categories affected</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {categories.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total on-hand qty</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {totalQuantity.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items or categories"
            className="max-w-sm"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredItems.length} of {items.length}
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-xl border bg-white">
        <div className="w-full min-w-0 overflow-x-auto">
          <Table className="w-full table-auto">
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="px-3">Item name</TableHead>
                <TableHead className="px-3">Category</TableHead>
                <TableHead className="px-3 text-right">Quantity</TableHead>
                <TableHead className="px-3">Unit</TableHead>
                <TableHead className="px-3">Expiration</TableHead>
                <TableHead className="px-3">Days left</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No expiring items match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item, i) => (
                  <TableRow key={item._id ?? item.id ?? i}>
                    <TableCell className="px-3 py-2 font-medium">
                      <Link
                        to={`/items/category/${slugFromCategory(item.category)}`}
                        className="text-zinc-900 hover:underline"
                      >
                        {item.name ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="px-3 py-2">{item.category ?? "—"}</TableCell>
                    <TableCell className="px-3 py-2 text-right tabular-nums">
                      {Number(item.quantityOnHand ?? item.quantity ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="px-3 py-2">{item.unit ?? "—"}</TableCell>
                    <TableCell className="px-3 py-2">
                      {item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      {item.expirationDate ? <DaysBadge date={item.expirationDate} /> : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
