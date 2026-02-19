import { useParams, Link } from "react-router-dom"
import { Search, RefreshCw, Plus, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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

// Sample items per category (in real app, fetch from API)
const SAMPLE_ITEMS = {
  printer: [
    { id: "P001", name: "HP LaserJet Pro", quantity: 12, unit: "pcs", status: "In Stock", reorderLevel: 5 },
    { id: "P002", name: "Canon PIXMA Inkjet", quantity: 8, unit: "pcs", status: "In Stock", reorderLevel: 5 },
    { id: "P003", name: "Epson EcoTank", quantity: 2, unit: "pcs", status: "Low Stock", reorderLevel: 5 },
  ],
  drugs: [
    { id: "D001", name: "Paracetamol 500mg", quantity: 500, unit: "boxes", status: "In Stock", reorderLevel: 100 },
    { id: "D002", name: "Ibuprofen 200mg", quantity: 85, unit: "boxes", status: "Low Stock", reorderLevel: 100 },
  ],
  "furniture-fixtures": [
    { id: "F001", name: "Office Chair", quantity: 25, unit: "pcs", status: "In Stock", reorderLevel: 10 },
    { id: "F002", name: "Conference Table", quantity: 5, unit: "pcs", status: "In Stock", reorderLevel: 2 },
    { id: "F003", name: "Filing Cabinet", quantity: 3, unit: "pcs", status: "Low Stock", reorderLevel: 5 },
  ],
  "ict-equipment": [
    { id: "I001", name: "Dell OptiPlex Desktop", quantity: 15, unit: "pcs", status: "In Stock", reorderLevel: 5 },
    { id: "I002", name: "Dell Monitor 24\"", quantity: 8, unit: "pcs", status: "In Stock", reorderLevel: 5 },
    { id: "I003", name: "Laptop - Dell Inspiron", quantity: 6, unit: "pcs", status: "In Stock", reorderLevel: 3 },
  ],
  "laboratory-equipment": [
    { id: "L001", name: "Centrifuge Machine", quantity: 2, unit: "pcs", status: "In Stock", reorderLevel: 1 },
    { id: "L002", name: "Microscope", quantity: 4, unit: "pcs", status: "In Stock", reorderLevel: 2 },
  ],
  "medical-supplies": [
    { id: "M001", name: "Surgical Gloves", quantity: 200, unit: "boxes", status: "In Stock", reorderLevel: 50 },
    { id: "M002", name: "Face Masks", quantity: 150, unit: "boxes", status: "In Stock", reorderLevel: 50 },
    { id: "M003", name: "Bandages", quantity: 35, unit: "boxes", status: "Low Stock", reorderLevel: 30 },
  ],
  "motor-vehicles": [
    { id: "V001", name: "Toyota Hilux", quantity: 2, unit: "pcs", status: "In Stock", reorderLevel: 1 },
    { id: "V002", name: "Honda City", quantity: 1, unit: "pcs", status: "In Stock", reorderLevel: 1 },
  ],
  "office-equipment": [
    { id: "O001", name: "Laptop Stand", quantity: 20, unit: "pcs", status: "In Stock", reorderLevel: 5 },
    { id: "O002", name: "Wireless Keyboard", quantity: 12, unit: "pcs", status: "In Stock", reorderLevel: 5 },
    { id: "O003", name: "Webcam HD", quantity: 1, unit: "pcs", status: "Low Stock", reorderLevel: 3 },
  ],
}

export default function CategoryItemsPage() {
  const { categorySlug } = useParams()
  const { getCategoryBySlug } = useCategories()
  const category = getCategoryBySlug(categorySlug)
  const items = category ? (SAMPLE_ITEMS[categorySlug] ?? []) : []

  if (!category) {
    return (
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <p className="font-medium">Category not found</p>
          <p className="text-sm mt-1">The category &quot;{categorySlug}&quot; does not exist.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/items">Back to categories</Link>
          </Button>
        </div>
      </div>
    )
  }

  const inStockCount = items.filter((i) => i.status === "In Stock").length
  const lowStockCount = items.filter((i) => i.status === "Low Stock").length

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
                <BreadcrumbPage>{category.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="mt-2 truncate text-xl font-semibold tracking-tight text-zinc-900">
            {category.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage items in this category.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="icon">
            <RefreshCw className="size-4" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button>
            <Plus className="size-4" />
            Add Item
          </Button>
          <Button asChild variant="outline">
            <Link to="/items">All categories</Link>
          </Button>
        </div>
      </div>

      <section className="@container/main grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total Items</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{items.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>In Stock</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums text-green-600">{inStockCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Low Stock</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums text-amber-600">{lowStockCount}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:px-6 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search items..."
              className="pl-9"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No items in this category yet. Add an item to get started.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          item.status === "In Stock"
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.reorderLevel}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        View
                        <ChevronRight className="ml-1 size-4" />
                      </Button>
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
