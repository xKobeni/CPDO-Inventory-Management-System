import { useState, useEffect, useId } from "react"
import { useParams, Link } from "react-router-dom"
import { Search, RefreshCw, Plus } from "lucide-react"
import { IconDotsVertical, IconGripVertical, IconCircleCheckFilled, IconAlertCircle } from "@tabler/icons-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

import { useCategories } from "@/contexts/CategoriesContext"

const UNIT_OPTIONS = ["pcs", "boxes", "units", "sets"]

function SortableRow({ item, selectedIds, toggleRow, openEdit }) {
  const { attributes, listeners, transform, transition, setNodeRef, isDragging } = useSortable({ id: item.id })
  return (
    <TableRow
      ref={setNodeRef}
      data-state={selectedIds.has(item.id) ? "selected" : undefined}
      data-dragging={isDragging}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 data-[dragging=true]:bg-muted/50"
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <TableCell className="px-3 py-2">
        <Button
          {...attributes}
          {...listeners}
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-7 shrink-0 hover:bg-transparent cursor-grab active:cursor-grabbing"
        >
          <IconGripVertical className="text-muted-foreground size-3" />
          <span className="sr-only">Drag to reorder</span>
        </Button>
      </TableCell>
      <TableCell className="w-12 px-2 py-1.5">
        <div className="flex items-center justify-center">
          <Checkbox
            checked={selectedIds.has(item.id)}
            onCheckedChange={() => toggleRow(item.id)}
            aria-label="Select row"
          />
        </div>
      </TableCell>
      <TableCell className="px-3 py-2 font-medium">{item.id}</TableCell>
      <TableCell className="px-3 py-2 truncate">{item.name}</TableCell>
      <TableCell className="px-3 py-2 text-right tabular-nums">{item.quantity}</TableCell>
      <TableCell className="px-3 py-2">
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {item.unit}
        </Badge>
      </TableCell>
      <TableCell className="px-3 py-2">
        <Badge variant="outline" className="text-muted-foreground gap-1 px-1.5">
          {item.status === "In Stock" ? (
            <IconCircleCheckFilled className="size-3.5 fill-green-500 dark:fill-green-400" />
          ) : (
            <IconAlertCircle className="size-3.5 text-amber-600" />
          )}
          {item.status}
        </Badge>
      </TableCell>
      <TableCell className="px-3 py-2 text-right tabular-nums">{item.reorderLevel}</TableCell>
      <TableCell className="px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-muted-foreground flex size-8" size="icon">
              <IconDotsVertical />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem onClick={() => openEdit(item)}>Edit</DropdownMenuItem>
            <DropdownMenuItem>View</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

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

const emptyForm = { id: "", name: "", quantity: "", unit: "pcs", reorderLevel: "", status: "In Stock" }

export default function CategoryItemsPage() {
  const { categorySlug } = useParams()
  const { getCategoryBySlug } = useCategories()
  const category = getCategoryBySlug(categorySlug)
  const [items, setItems] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const dndId = useId()

  useEffect(() => {
    if (category && SAMPLE_ITEMS[categorySlug]) {
      setItems(SAMPLE_ITEMS[categorySlug].map((i) => ({ ...i })))
    } else {
      setItems([])
    }
    setSelectedIds(new Set())
  }, [categorySlug, category])

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    if (selectedIds.size === items.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(items.map((i) => i.id)))
  }
  const isAllSelected = items.length > 0 && selectedIds.size === items.length
  const isSomeSelected = selectedIds.size > 0

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setItems((prev) => {
        const ids = prev.map((i) => i.id)
        const oldIndex = ids.indexOf(active.id)
        const newIndex = ids.indexOf(over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  const openAdd = () => {
    setForm(emptyForm)
    setAddOpen(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setForm({
      id: item.id,
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit,
      reorderLevel: String(item.reorderLevel),
      status: item.status,
    })
    setEditOpen(true)
  }

  const handleAdd = () => {
    const prefix = items[0]?.id?.charAt(0) ?? "I"
    const maxNum = items.reduce((m, i) => {
      const n = parseInt(String(i.id).replace(/\D/g, ""), 10)
      return isNaN(n) ? m : Math.max(m, n)
    }, 0)
    const newId = `${prefix}${String(maxNum + 1).padStart(3, "0")}`
    const qty = parseInt(form.quantity, 10)
    const reorder = parseInt(form.reorderLevel, 10)
    const status = qty <= reorder ? "Low Stock" : "In Stock"
    setItems((prev) => [
      ...prev,
      {
        id: newId,
        name: form.name.trim(),
        quantity: isNaN(qty) ? 0 : qty,
        unit: form.unit,
        status,
        reorderLevel: isNaN(reorder) ? 0 : reorder,
      },
    ])
    setAddOpen(false)
    setForm(emptyForm)
  }

  const handleEdit = () => {
    if (!editingItem) return
    const qty = parseInt(form.quantity, 10)
    const reorder = parseInt(form.reorderLevel, 10)
    const status = qty <= reorder ? "Low Stock" : "In Stock"
    setItems((prev) =>
      prev.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              name: form.name.trim(),
              quantity: isNaN(qty) ? i.quantity : qty,
              unit: form.unit,
              reorderLevel: isNaN(reorder) ? i.reorderLevel : reorder,
              status,
            }
          : i
      )
    )
    setEditOpen(false)
    setEditingItem(null)
    setForm(emptyForm)
  }

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
          <Button onClick={openAdd}>
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
        <div className="overflow-auto px-4 lg:px-6">
          <div className="overflow-hidden rounded-lg border">
            <Table className="table-fixed w-full">
              <colgroup>
                <col style={{ width: "2.5rem" }} />
                <col style={{ width: "3rem" }} />
                <col style={{ width: "5rem" }} />
                <col style={{ width: "auto" }} />
                <col style={{ width: "6rem" }} />
                <col style={{ width: "6rem" }} />
                <col style={{ width: "7rem" }} />
                <col style={{ width: "6rem" }} />
                <col style={{ width: "3rem" }} />
              </colgroup>
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead className="px-3" />
                  <TableHead className="px-3">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={isAllSelected || (isSomeSelected && "indeterminate")}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="px-3">ID</TableHead>
                  <TableHead className="px-3">Item Name</TableHead>
                  <TableHead className="px-3 text-right">Quantity</TableHead>
                  <TableHead className="px-3">Unit</TableHead>
                  <TableHead className="px-3">Status</TableHead>
                  <TableHead className="px-3 text-right">Reorder Level</TableHead>
                  <TableHead className="px-3" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No items in this category yet. Add an item to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  <DndContext
                    id={dndId}
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                      {items.map((item) => (
                        <SortableRow
                          key={item.id}
                          item={item}
                          selectedIds={selectedIds}
                          toggleRow={toggleRow}
                          openEdit={openEdit}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </TableBody>
            </Table>
          </div>
          {items.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3">
              <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
                {selectedIds.size} of {items.length} row(s) selected.
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Add Item Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>Add a new item to this category.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Item Name</Label>
              <Input
                id="add-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. HP LaserJet Pro"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-quantity">Quantity</Label>
                <Input
                  id="add-quantity"
                  type="number"
                  min={0}
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-unit">Unit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                  <SelectTrigger id="add-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-reorder">Reorder Level</Label>
              <Input
                id="add-reorder"
                type="number"
                min={0}
                value={form.reorderLevel}
                onChange={(e) => setForm((f) => ({ ...f, reorderLevel: e.target.value }))}
                placeholder="Min quantity before low stock"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.name.trim()}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Update the item details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-id">ID</Label>
              <Input id="edit-id" value={form.id} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Item Name</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. HP LaserJet Pro"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-quantity">Quantity</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  min={0}
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unit">Unit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                  <SelectTrigger id="edit-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-reorder">Reorder Level</Label>
              <Input
                id="edit-reorder"
                type="number"
                min={0}
                value={form.reorderLevel}
                onChange={(e) => setForm((f) => ({ ...f, reorderLevel: e.target.value }))}
                placeholder="Min quantity before low stock"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!form.name.trim()}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
