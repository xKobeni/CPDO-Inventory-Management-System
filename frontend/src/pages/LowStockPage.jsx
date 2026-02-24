import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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

export default function LowStockPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async (showToast = false) => {
    setLoading(true)
    setError(null)
    try {
      const data = await itemsService.getLowStock()
      setItems(Array.isArray(data) ? data : [])
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
                <BreadcrumbPage>Low stock</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="mt-2 flex items-center gap-2 truncate text-xl font-semibold tracking-tight text-zinc-900">
            <AlertTriangle className="size-5 text-amber-600" />
            Low stock
          </h1>
          <p className="text-sm text-muted-foreground">
            Supply items at or below reorder level. Restock these to avoid running out.
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

      <section className="min-w-0 overflow-hidden rounded-xl border bg-white">
        <div className="w-full min-w-0 overflow-x-auto">
          <Table className="w-full table-auto">
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="px-3">Item name</TableHead>
                <TableHead className="px-3">Category</TableHead>
                <TableHead className="px-3 text-right">Quantity</TableHead>
                <TableHead className="px-3 text-right">Reorder level</TableHead>
                <TableHead className="px-3">Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No low stock items. All supply quantities are above reorder level.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, i) => (
                  <TableRow key={item._id ?? item.id ?? i}>
                    <TableCell className="px-3 py-2 font-medium">
                      <Link
                        to={`/items/category/${(item.category || "general").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "general"}`}
                        className="text-zinc-900 hover:underline"
                      >
                        {item.name ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="px-3 py-2">{item.category ?? "—"}</TableCell>
                    <TableCell className="px-3 py-2 text-right tabular-nums">
                      {Number(item.quantityOnHand ?? item.quantity ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right tabular-nums">
                      {Number(item.reorderLevel ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="px-3 py-2">{item.unit ?? "—"}</TableCell>
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
