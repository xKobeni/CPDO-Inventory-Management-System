import React, { useState, useEffect, useId } from "react"
import { useParams, Link } from "react-router-dom"
import { Search, RefreshCw, Plus } from "lucide-react"
import { IconDotsVertical, IconGripVertical, IconCircleCheckFilled, IconAlertCircle, IconLayoutColumns, IconChevronDown } from "@tabler/icons-react"
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
  DropdownMenuCheckboxItem,
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer"
import { Separator } from "@/components/ui/separator"

import { useIsMobile } from "@/hooks/use-mobile"
import { useCategories } from "@/contexts/CategoriesContext"

const UNIT_OPTIONS = ["pcs", "boxes", "units", "sets"]

// Column config for Customize Columns (toggleable data columns; drag, actions always shown)
const SUPPLY_COLUMNS = [
  { id: "propertyNo", label: "Property No." },
  { id: "name", label: "Name" },
  { id: "category", label: "Category" },
  { id: "serialNo", label: "Serial No." },
  { id: "status", label: "Status" },
  { id: "condition", label: "Condition" },
  { id: "accountablePerson", label: "Accountable Person" },
  { id: "dateAcquired", label: "Date Acquired" },
]
const ASSET_COLUMNS = [
  { id: "name", label: "Name" },
  { id: "category", label: "Category" },
  { id: "propertyNo", label: "Property No." },
  { id: "serialNo", label: "Serial No." },
  { id: "details", label: "Details" },
  { id: "status", label: "Status" },
  { id: "condition", label: "Condition" },
  { id: "accountability", label: "Accountability" },
  { id: "remarks", label: "Remarks" },
]
const SUPPLY_COL_ORDER = ["drag", "propertyNo", "name", "category", "serialNo", "status", "condition", "accountablePerson", "dateAcquired", "actions"]
const ASSET_COL_ORDER = ["drag", "name", "category", "propertyNo", "serialNo", "details", "status", "condition", "accountability", "remarks", "actions"]
const FIXED_COLUMNS = new Set(["drag", "actions"])
const isColVisible = (id, visibility) => FIXED_COLUMNS.has(id) || visibility[id] === true

// Column width mappings (in rem or auto).
const COLUMN_WIDTHS = {
  drag: "2.5rem",
  actions: "3rem",
  propertyNo: "6rem",
  name: "auto",
  category: "6rem",
  serialNo: "6rem",
  status: "7rem",
  condition: "6rem",
  accountablePerson: "8rem",
  dateAcquired: "6.5rem",
  details: "12rem",
  accountability: "12rem",
  remarks: "7rem",
}

// Column alignment: "text-left" (default), "text-center", "text-right"
const COLUMN_ALIGNMENT = {
  propertyNo: "text-left",
  name: "text-left",
  category: "text-left",
  serialNo: "text-left",
  status: "text-center",
  condition: "text-center",
  accountablePerson: "text-left",
  dateAcquired: "text-right tabular-nums",
  details: "text-left",
  accountability: "text-left",
  remarks: "text-left",
}
const getColAlignment = (id) => COLUMN_ALIGNMENT[id] || "text-left"

const STATUS_LABELS = {
  IN_STOCK: "In Stock",
  DEPLOYED: "Deployed",
  FOR_REPAIR: "For Repair",
  DISPOSED: "Disposed",
  LOST: "Lost",
}
const CONDITION_LABELS = { NEW: "New", GOOD: "Good", FAIR: "Fair", POOR: "Poor", DAMAGED: "Damaged" }

function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] ?? status
  const ok = status === "IN_STOCK" || status === "DEPLOYED"
  return (
    <Badge variant="outline" className="text-muted-foreground gap-1 px-1.5">
      {ok ? (
        <IconCircleCheckFilled className="size-3.5 fill-green-500 dark:fill-green-400" />
      ) : (
        <IconAlertCircle className="size-3.5 text-amber-600" />
      )}
      {label}
    </Badge>
  )
}

function SortableRowSupply({ item, selectedIds, toggleRow, openEdit, columnVisibility, onRowClick }) {
  const { attributes, listeners, transform, transition, setNodeRef, isDragging } = useSortable({ id: item.id })
  const nodeRef = React.useRef(null)
  React.useLayoutEffect(() => {
    setNodeRef(nodeRef.current)
    return () => setNodeRef(null)
  }, [])

  const renderCell = (id) => {
    switch (id) {
      case "drag":
        return (
          <TableCell key={id} className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
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
        )
      case "propertyNo":
        return (
          <TableCell key={id} className={`px-3 py-2 font-medium ${getColAlignment(id)}`}>{item.propertyNumber ?? "—"}</TableCell>
        )
      case "name":
        return (
          <TableCell key={id} className={`px-3 py-2 truncate ${getColAlignment(id)}`}>{item.name}</TableCell>
        )
      case "category":
        return (
          <TableCell key={id} className={`px-3 py-2 truncate ${getColAlignment(id)}`}>{item.category ?? "—"}</TableCell>
        )
      case "serialNo":
        return (
          <TableCell key={id} className={`px-3 py-2 ${getColAlignment(id)}`}>{item.serialNumber ?? "—"}</TableCell>
        )
      case "status":
        return (
          <TableCell key={id} className={`px-3 py-2 ${getColAlignment(id)}`}>
            <StatusBadge status={item.status} />
          </TableCell>
        )
      case "condition":
        return (
          <TableCell key={id} className={`px-3 py-2 ${getColAlignment(id)}`}>
            <Badge variant="outline" className="text-muted-foreground px-1.5">
              {CONDITION_LABELS[item.condition] ?? item.condition ?? "—"}
            </Badge>
          </TableCell>
        )
      case "accountablePerson":
        return (
          <TableCell key={id} className={`px-3 py-2 truncate ${getColAlignment(id)}`}>
            {item.accountablePerson?.name ?? "—"}
          </TableCell>
        )
      case "dateAcquired":
        return (
          <TableCell key={id} className={`px-3 py-2 ${getColAlignment(id)}`}>
            {item.dateAcquired ? new Date(item.dateAcquired).toLocaleDateString() : "—"}
          </TableCell>
        )
      case "actions":
        return (
          <TableCell key={id} className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-muted-foreground flex size-8" size="icon">
                  <IconDotsVertical />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem>View</DropdownMenuItem>
                <DropdownMenuItem>Assign</DropdownMenuItem>
                <DropdownMenuItem>Transfer</DropdownMenuItem>
                <DropdownMenuItem>Return</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openEdit(item)}>Edit</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        )
      default:
        return null
    }
  }

  return (
    <TableRow
      ref={nodeRef}
      role="button"
      tabIndex={0}
      onClick={() => onRowClick?.(item)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRowClick?.(item) } }}
      data-state={selectedIds.has(item.id) ? "selected" : undefined}
      data-dragging={isDragging}
      className="relative z-0 cursor-pointer data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 data-[dragging=true]:bg-muted/50 hover:bg-muted/50"
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {SUPPLY_COL_ORDER.filter((id) => isColVisible(id, columnVisibility)).map((id) => renderCell(id))}
    </TableRow>
  )
}

function SortableRowAsset({ item, selectedIds, toggleRow, openEdit, columnVisibility, onRowClick }) {
  const { attributes, listeners, transform, transition, setNodeRef, isDragging } = useSortable({ id: item.id })
  const nodeRef = React.useRef(null)
  React.useLayoutEffect(() => {
    setNodeRef(nodeRef.current)
    return () => setNodeRef(null)
  }, [])

  const acc = item.accountablePerson
  const accText = acc?.name
    ? [acc.name, acc.position, acc.office].filter(Boolean).join(" · ")
    : "—"

  const renderCell = (id) => {
    switch (id) {
      case "drag":
        return (
          <TableCell key={id} className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
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
        )
      case "name":
        return (
          <TableCell key={id} className={`px-3 py-2 truncate ${getColAlignment(id)}`}>{item.name}</TableCell>
        )
      case "category":
        return (
          <TableCell key={id} className={`px-3 py-2 truncate ${getColAlignment(id)}`}>{item.category ?? "—"}</TableCell>
        )
      case "propertyNo":
        return (
          <TableCell key={id} className={`px-3 py-2 ${getColAlignment(id)}`}>{item.propertyNumber ?? "—"}</TableCell>
        )
      case "serialNo":
        return (
          <TableCell key={id} className={`px-3 py-2 ${getColAlignment(id)}`}>{item.serialNumber ?? "—"}</TableCell>
        )
      case "details":
        return (
          <TableCell key={id} className={`px-3 py-2 ${getColAlignment(id)}`}>
            <span className="text-muted-foreground text-sm">
              {[item.brand, item.model].filter(Boolean).join(" · ") || "—"}
            </span>
            <br />
            <span className="text-xs text-muted-foreground">
              {item.unitCost != null && item.unitCost > 0 ? `₱${Number(item.unitCost).toLocaleString()}` : ""}
              {item.dateAcquired ? ` · ${new Date(item.dateAcquired).toLocaleDateString()}` : ""}
            </span>
          </TableCell>
        )
      case "status":
        return (
          <TableCell key={id} className={`px-3 py-2 ${getColAlignment(id)}`}>
            <StatusBadge status={item.status} />
          </TableCell>
        )
      case "condition":
        return (
          <TableCell key={id} className={`px-3 py-2 ${getColAlignment(id)}`}>
            <Badge variant="outline" className="text-muted-foreground px-1.5">
              {CONDITION_LABELS[item.condition] ?? item.condition ?? "—"}
            </Badge>
          </TableCell>
        )
      case "accountability":
        return (
          <TableCell key={id} className={`px-3 py-2 truncate ${getColAlignment(id)}`} title={acc?.name ?? undefined}>
            {item.accountablePerson?.name ?? "—"}
          </TableCell>
        )
      case "remarks":
        return (
          <TableCell key={id} className={`px-3 py-2 truncate ${getColAlignment(id)}`} title={item.remarks ?? ""}>
            {item.remarks ?? "—"}
          </TableCell>
        )
      case "actions":
        return (
          <TableCell key={id} className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-muted-foreground flex size-8" size="icon">
                  <IconDotsVertical />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem>View</DropdownMenuItem>
                <DropdownMenuItem>Assign</DropdownMenuItem>
                <DropdownMenuItem>Transfer</DropdownMenuItem>
                <DropdownMenuItem>Return</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openEdit(item)}>Edit</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        )
      default:
        return null
    }
  }

  return (
    <TableRow
      ref={nodeRef}
      role="button"
      tabIndex={0}
      onClick={() => onRowClick?.(item)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRowClick?.(item) } }}
      data-state={selectedIds.has(item.id) ? "selected" : undefined}
      data-dragging={isDragging}
      className="relative z-0 cursor-pointer data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 data-[dragging=true]:bg-muted/50 hover:bg-muted/50"
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {ASSET_COL_ORDER.filter((id) => isColVisible(id, columnVisibility)).map((id) => renderCell(id))}
    </TableRow>
  )
}

// Helper to build supply item (optional propertyNumber as primary id)
function supplyItem(id, name, category, extra = {}) {
  return {
    id,
    name,
    category: category ?? "General",
    propertyNumber: extra.propertyNumber ?? null,
    serialNumber: extra.serialNumber ?? null,
    status: extra.status ?? "IN_STOCK",
    condition: extra.condition ?? "GOOD",
    location: extra.location ?? "",
    accountablePerson: extra.accountablePerson ?? {},
    dateAcquired: extra.dateAcquired ?? null,
    ...extra,
  }
}

// Helper to build asset item (Identification, SKU, Details, Accountability, etc.)
function assetItem(id, name, category, extra = {}) {
  return {
    id,
    sku: extra.sku ?? id,
    name,
    category: category ?? "General",
    propertyNumber: extra.propertyNumber ?? id,
    serialNumber: extra.serialNumber ?? null,
    brand: extra.brand ?? "",
    model: extra.model ?? "",
    unitCost: extra.unitCost ?? 0,
    dateAcquired: extra.dateAcquired ?? null,
    location: extra.location ?? "",
    status: extra.status ?? "IN_STOCK",
    condition: extra.condition ?? "GOOD",
    accountablePerson: extra.accountablePerson ?? {},
    remarks: extra.remarks ?? "",
    ...extra,
  }
}

// Build accountablePerson outside object literals to avoid JSX parse ambiguity with { name: "..." }
const _acc = (name, position, office) => ({ name, position, office: office ?? "CPDC" })
const SAMPLE_ITEMS = {
  printer: [
    assetItem("P001", "HP LaserJet Pro", "Printer", { sku: "PRN-001", propertyNumber: "PROP-P001", serialNumber: "SN-HP001", brand: "HP", model: "LaserJet Pro", unitCost: 12000, location: "IT Office", accountablePerson: _acc("Juan Dela Cruz", "IT Officer") }),
    assetItem("P002", "Canon PIXMA Inkjet", "Printer", { sku: "PRN-002", propertyNumber: "PROP-P002", brand: "Canon", model: "PIXMA", unitCost: 8500 }),
    assetItem("P003", "Epson EcoTank", "Printer", { sku: "PRN-003", propertyNumber: "PROP-P003", status: "FOR_REPAIR", condition: "FAIR" }),
  ],
  drugs: [
    supplyItem("D001", "Paracetamol 500mg", "Drugs", { serialNumber: "DRG-001", status: "IN_STOCK", location: "Pharmacy", dateAcquired: "2024-01-15" }),
    supplyItem("D002", "Ibuprofen 200mg", "Drugs", { serialNumber: "DRG-002", status: "IN_STOCK", location: "Pharmacy", accountablePerson: _acc("Maria Santos") }),
  ],
  "furniture-fixtures": [
    assetItem("F001", "Office Chair", "Furniture & Fixtures", { sku: "FUR-001", propertyNumber: "PROP-F001", brand: "Office Pro", unitCost: 4500, location: "Admin" }),
    assetItem("F002", "Conference Table", "Furniture & Fixtures", { sku: "FUR-002", propertyNumber: "PROP-F002", unitCost: 25000 }),
    assetItem("F003", "Filing Cabinet", "Furniture & Fixtures", { sku: "FUR-003", propertyNumber: "PROP-F003", condition: "FAIR", remarks: "Needs repair" }),
  ],
  "ict-equipment": [
    assetItem("I001", "Dell OptiPlex Desktop", "ICT Equipment", { sku: "ICT-001", propertyNumber: "PROP-I001", serialNumber: "DL-OP001", brand: "Dell", model: "OptiPlex", unitCost: 35000, location: "IT Room" }),
    assetItem("I002", "Dell Monitor 24\"", "ICT Equipment", { sku: "ICT-002", propertyNumber: "PROP-I002", brand: "Dell", unitCost: 12000 }),
    assetItem("I003", "Laptop - Dell Inspiron", "ICT Equipment", { sku: "ICT-003", propertyNumber: "PROP-I003", status: "DEPLOYED", accountablePerson: _acc("Ana Reyes", "Staff") }),
  ],
  "laboratory-equipment": [
    assetItem("L001", "Centrifuge Machine", "Laboratory Equipment", { sku: "LAB-001", propertyNumber: "PROP-L001", brand: "Eppendorf", unitCost: 180000 }),
    assetItem("L002", "Microscope", "Laboratory Equipment", { sku: "LAB-002", propertyNumber: "PROP-L002", location: "Lab 1" }),
  ],
  "medical-supplies": [
    supplyItem("M001", "Surgical Gloves", "Medical Supplies", { propertyNumber: "M-SG-001", status: "IN_STOCK", location: "Storage A", dateAcquired: "2024-06-01" }),
    supplyItem("M002", "Face Masks", "Medical Supplies", { status: "IN_STOCK", location: "Storage A" }),
    supplyItem("M003", "Bandages", "Medical Supplies", { status: "IN_STOCK", condition: "GOOD", accountablePerson: _acc("Nurse Cruz") }),
  ],
  "motor-vehicles": [
    assetItem("V001", "Toyota Hilux", "Motor Vehicles", { sku: "VH-001", propertyNumber: "PROP-V001", serialNumber: "CHASSIS-XXX", brand: "Toyota", model: "Hilux", unitCost: 1200000, status: "DEPLOYED", accountablePerson: _acc("Driver Lopez", "Driver") }),
    assetItem("V002", "Honda City", "Motor Vehicles", { sku: "VH-002", propertyNumber: "PROP-V002", brand: "Honda", model: "City", unitCost: 850000 }),
  ],
  "office-equipment": [
    assetItem("O001", "Laptop Stand", "Office Equipment", { sku: "OFF-001", propertyNumber: "PROP-O001", unitCost: 1200 }),
    assetItem("O002", "Wireless Keyboard", "Office Equipment", { sku: "OFF-002", propertyNumber: "PROP-O002", brand: "Logitech", unitCost: 2500 }),
    assetItem("O003", "Webcam HD", "Office Equipment", { sku: "OFF-003", propertyNumber: "PROP-O003", status: "FOR_REPAIR", remarks: "USB port damaged" }),
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
  const [supplyColumnVisibility, setSupplyColumnVisibility] = useState(() =>
    Object.fromEntries(SUPPLY_COLUMNS.map((c) => [c.id, true]))
  )
  const [assetColumnVisibility, setAssetColumnVisibility] = useState(() =>
    Object.fromEntries(ASSET_COLUMNS.map((c) => [c.id, true]))
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerItem, setDrawerItem] = useState(null)
  const dndId = useId()
  const isMobile = useIsMobile()

  const openDrawer = (item) => {
    setDrawerItem(item)
    setDrawerOpen(true)
  }
  const closeDrawer = () => {
    setDrawerOpen(false)
    setDrawerItem(null)
  }
  const openEditFromDrawer = () => {
    if (drawerItem) {
      closeDrawer()
      openEdit(drawerItem)
    }
  }

  useEffect(() => {
    if (SAMPLE_ITEMS[categorySlug]) {
      setItems(SAMPLE_ITEMS[categorySlug].map((i) => ({ ...i })))
    } else {
      setItems([])
    }
    setSelectedIds(new Set())
  }, [categorySlug])

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

  const isSupply = category.itemType === "SUPPLY"
  const columnVisibility = isSupply ? supplyColumnVisibility : assetColumnVisibility
  const setColumnVisibility = isSupply ? setSupplyColumnVisibility : setAssetColumnVisibility
  const colOrder = isSupply ? SUPPLY_COL_ORDER : ASSET_COL_ORDER
  const colConfig = isSupply ? SUPPLY_COLUMNS : ASSET_COLUMNS
  const inStockCount = items.filter((i) => (i.status === "IN_STOCK" || i.status === "In Stock")).length
  const lowStockCount = items.filter((i) => (i.status === "Low Stock" || (i.status && i.status !== "IN_STOCK" && i.status !== "DEPLOYED"))).length

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

      <section className="min-w-0 overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:px-6 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search items..."
              className="pl-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns className="size-4" />
                <span className="hidden lg:inline">Customize Columns</span>
                <span className="lg:hidden">Columns</span>
                <IconChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {colConfig.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={columnVisibility[col.id] !== false}
                  onCheckedChange={(checked) =>
                    setColumnVisibility((prev) => ({ ...prev, [col.id]: !!checked }))
                  }
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="w-full min-w-0 overflow-x-auto px-4 lg:px-6">
          <div className="inline-block min-w-full rounded-lg border">
            <Table className="w-max min-w-full table-auto">
              <colgroup>
                {colOrder
                  .filter((id) => isColVisible(id, columnVisibility))
                  .map((id) => {
                    const width = COLUMN_WIDTHS[id] || "auto"
                    return <col key={id} style={{ width }} />
                  })}
              </colgroup>
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  {colOrder
                    .filter((id) => isColVisible(id, columnVisibility))
                    .map((id) => {
                      if (id === "drag") return <TableHead key={id} className="px-3 w-10" />
                      if (id === "actions") return <TableHead key={id} className="px-3 w-12" />
                      const label = colConfig.find((c) => c.id === id)?.label ?? id
                      return (
                        <TableHead key={id} className={`px-3 whitespace-nowrap ${getColAlignment(id)}`}>
                          {label}
                        </TableHead>
                      )
                    })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={colOrder.filter((id) => isColVisible(id, columnVisibility)).length}
                      className="h-24 text-center text-muted-foreground"
                    >
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
                      {items.map((item) =>
                        isSupply ? (
                          <SortableRowSupply
                            key={item.id}
                            item={item}
                            selectedIds={selectedIds}
                            toggleRow={toggleRow}
                            openEdit={openEdit}
                            columnVisibility={columnVisibility}
                            onRowClick={openDrawer}
                          />
                        ) : (
                          <SortableRowAsset
                            key={item.id}
                            item={item}
                            selectedIds={selectedIds}
                            toggleRow={toggleRow}
                            openEdit={openEdit}
                            columnVisibility={columnVisibility}
                            onRowClick={openDrawer}
                          />
                        )
                      )}
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

      {/* Item detail drawer (opens on row click) */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction={isMobile ? "bottom" : "right"}>
        <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-md">
          <DrawerHeader className="gap-1 p-4 pb-2">
            <DrawerTitle className="text-lg font-semibold tracking-tight">
              {drawerItem?.name ?? "Item details"}
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              View item information. Use Edit below to update details.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
            {drawerItem && (
              <>
                {/* Summary / status block */}
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 leading-none font-medium">
                    <StatusBadge status={drawerItem.status} />
                    <span className="text-muted-foreground text-sm">
                      {CONDITION_LABELS[drawerItem.condition] ?? drawerItem.condition ?? "—"} condition
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {isSupply
                      ? "Supply item. View and manage this item below. Use Edit to change quantity, reorder level, or other details."
                      : "Asset item. View and manage this item below. Use Edit to update property details, accountability, or remarks."}
                  </p>
                </div>
                <Separator />
                {/* Form-style fields: label above value */}
                <div className="flex flex-col gap-4">
                  {isSupply ? (
                    <>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium">Property No.</Label>
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.propertyNumber ?? "—"}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium">Name</Label>
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Category</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.category ?? "—"}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Serial No.</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.serialNumber ?? "—"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Status</Label>
                          <div className="rounded-md border bg-muted/30 px-3 py-2">
                            <StatusBadge status={drawerItem.status} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Condition</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{CONDITION_LABELS[drawerItem.condition] ?? drawerItem.condition ?? "—"}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium">Location</Label>
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.location ?? "—"}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium">Accountable Person</Label>
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.accountablePerson?.name ?? "—"}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium">Date Acquired</Label>
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.dateAcquired ? new Date(drawerItem.dateAcquired).toLocaleDateString() : "—"}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium">Name</Label>
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Category</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.category ?? "—"}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Property No.</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.propertyNumber ?? "—"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Serial No.</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.serialNumber ?? "—"}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Unit Cost</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.unitCost != null && drawerItem.unitCost > 0 ? `₱${Number(drawerItem.unitCost).toLocaleString()}` : "—"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Brand</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.brand ?? "—"}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Model</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.model ?? "—"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Status</Label>
                          <div className="rounded-md border bg-muted/30 px-3 py-2">
                            <StatusBadge status={drawerItem.status} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Condition</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{CONDITION_LABELS[drawerItem.condition] ?? drawerItem.condition ?? "—"}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium">Date Acquired</Label>
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.dateAcquired ? new Date(drawerItem.dateAcquired).toLocaleDateString() : "—"}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium">Accountability</Label>
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                          {drawerItem.accountablePerson?.name
                            ? [drawerItem.accountablePerson.name, drawerItem.accountablePerson.position, drawerItem.accountablePerson.office].filter(Boolean).join(" · ")
                            : "—"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium">Remarks</Label>
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.remarks ?? "—"}</p>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          <Separator />
          <DrawerFooter className="flex flex-col gap-2 p-4">
            <Button onClick={openEditFromDrawer} className="w-full">Edit</Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">Done</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
