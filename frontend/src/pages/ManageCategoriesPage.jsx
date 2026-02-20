import { useState } from "react"
import { Link } from "react-router-dom"
import { Search, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import { useCategories } from "@/contexts/CategoriesContext"

export default function ManageCategoriesPage() {
  const { categories, loading, error, refreshCategories } = useCategories()
  const [search, setSearch] = useState("")

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.slug && c.slug.toLowerCase().includes(search.toLowerCase()))
  )

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
                <BreadcrumbPage>Manage Categories</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="mt-2 truncate text-xl font-semibold tracking-tight text-zinc-900">
            Manage Categories
          </h1>
          <p className="text-sm text-muted-foreground">
            Categories are derived from your inventory. To add a category, add an item and set its category name on any category page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="icon" onClick={refreshCategories} disabled={loading}>
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

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:px-6 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="overflow-auto px-4 lg:px-6">
          <div className="overflow-hidden rounded-lg border">
            <Table className="table-fixed w-full">
              <colgroup>
                <col style={{ width: "4rem" }} />
                <col style={{ width: "auto" }} />
                <col style={{ width: "auto" }} />
                <col style={{ width: "7rem" }} />
                <col style={{ width: "8rem" }} />
                <col style={{ width: "8rem" }} />
              </colgroup>
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead className="px-3">#</TableHead>
                  <TableHead className="px-3">Name</TableHead>
                  <TableHead className="px-3">Slug</TableHead>
                  <TableHead className="px-3">Type</TableHead>
                  <TableHead className="px-3">Icon</TableHead>
                  <TableHead className="px-3 text-right">Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No categories yet. Add an item with a category name to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((cat, idx) => (
                    <TableRow key={cat.id}>
                      <TableCell className="px-3 py-2 font-medium">{idx + 1}</TableCell>
                      <TableCell className="px-3 py-2">{cat.name}</TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">{cat.slug}</TableCell>
                      <TableCell className="px-3 py-2">
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-700">
                          {(cat.itemType || "SUPPLY") === "ASSET" ? "Asset" : "Supply"}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-2">{cat.iconName}</TableCell>
                      <TableCell className="px-3 py-2 text-right tabular-nums">{cat.count ?? 0}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>
    </div>
  )
}
