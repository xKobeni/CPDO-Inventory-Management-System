import React, { useState, useEffect, useId, useCallback, useMemo } from "react"
import { useParams, useLocation, useBlocker, Link } from "react-router-dom"
import { Search, RefreshCw, Plus, ChevronLeft, ChevronRight } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { usePeople } from "@/contexts/PeopleContext"
import { itemsService } from "@/services"
import { getErrorMessage } from "@/utils/api"
import { toast } from "sonner"
import { FloatingHelpButton } from "@/components/HelpButton"
import { categoryItemsTutorialSteps } from "@/constants/tutorialSteps"

const UNIT_OPTIONS = ["pcs", "boxes", "units", "sets"]

const STATUS_OPTIONS = [
  { value: "IN_STOCK", label: "In Stock" },
  { value: "DEPLOYED", label: "Deployed" },
  { value: "FOR_REPAIR", label: "For Repair" },
  { value: "DISPOSED", label: "Disposed" },
  { value: "LOST", label: "Lost" },
]
const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  ...STATUS_OPTIONS,
  { value: "LOW_STOCK", label: "Low stock" },
]
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
const CONDITION_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" },
  { value: "DAMAGED", label: "Damaged" },
]

// Consistent placeholder for optional/empty text fields
function displayNA(value) {
  if (value == null) return "N/A"
  const s = typeof value === "string" ? value.trim() : String(value)
  return s === "" ? "N/A" : s
}

 
const defaultAccountablePerson = () => ({ name: "", position: "", office: "CPDC" })

function getEmptyForm(isSupply, categoryName = "General") {
  const base = {
    itemType: isSupply ? "SUPPLY" : "ASSET",
    name: "",
    category: categoryName,
    unit: "pc",
    dateAcquired: "",
    unitCost: "",
    remarks: "",
    accountablePerson: defaultAccountablePerson(),
    transferredTo: "",
  }
  if (isSupply) {
    return {
      ...base,
      quantityOnHand: "",
      reorderLevel: "",
      serialNumber: "",
    }
  }
  return {
    ...base,
    unit: "pcs",
    quantityOnHand: "1",
    propertyNumber: "",
    serialNumber: "",
    brand: "",
    model: "",
    division: "",
    status: "DEPLOYED",
    condition: "GOOD",
  }
}

function formToItem(form, isSupply, newId) {
  const acc = form.accountablePerson || defaultAccountablePerson()
  const dateAcquired = form.dateAcquired ? new Date(form.dateAcquired).toISOString() : null
  const unitCost = Number(form.unitCost) || 0
  if (isSupply) {
    const qty = parseInt(form.quantityOnHand, 10) || 0
    const reorder = parseInt(form.reorderLevel, 10) || 0
    return {
      id: newId,
      itemType: "SUPPLY",
      name: form.name.trim(),
      category: form.category?.trim() || "General",
      unit: form.unit || "pc",
      dateAcquired,
      unitCost,
      remarks: (form.remarks || "").trim(),
      quantityOnHand: qty,
      reorderLevel: reorder,
      status: qty <= reorder && reorder > 0 ? "Low Stock" : "IN_STOCK",
      condition: "GOOD",
      accountablePerson: { ...acc },
      division: "",
      propertyNumber: null,
      serialNumber: form.serialNumber?.trim() || null,
    }
  }
  return {
    id: newId,
    itemType: "ASSET",
    name: form.name.trim(),
    category: form.category?.trim() || "General",
    unit: form.unit || "pc",
    dateAcquired,
    unitCost,
    remarks: (form.remarks || "").trim(),
    propertyNumber: (form.propertyNumber || "").trim() || null,
    serialNumber: (form.serialNumber || "").trim() || null,
    brand: (form.brand || "").trim(),
    model: (form.model || "").trim(),
    division: (form.division || "").trim(),
    status: form.status || "IN_STOCK",
    condition: form.condition || "GOOD",
    accountablePerson: { ...acc },
    quantityOnHand: 1,
    reorderLevel: 0,
  }
}

function itemToForm(item, isSupply) {
  const acc = item.accountablePerson || defaultAccountablePerson()
  const dateAcquired = item.dateAcquired
    ? (typeof item.dateAcquired === "string" ? item.dateAcquired : new Date(item.dateAcquired).toISOString()).slice(0, 10)
    : ""
  const base = {
    itemType: item.itemType || (isSupply ? "SUPPLY" : "ASSET"),
    name: item.name ?? "",
    category: item.category ?? "General",
    unit: item.unit ?? "pc",
    dateAcquired,
    unitCost: item.unitCost != null ? String(item.unitCost) : "",
    remarks: item.remarks ?? "",
    accountablePerson: { ...acc },
    transferredTo: item.transferredTo ?? "",
  }
  if (isSupply) {
    return {
      ...base,
      quantityOnHand: item.quantityOnHand != null && item.quantityOnHand !== "" ? String(item.quantityOnHand) : "0",
      reorderLevel: item.reorderLevel != null && item.reorderLevel !== "" ? String(item.reorderLevel) : "0",
      serialNumber: item.serialNumber ?? "",
    }
  }
  return {
    ...base,
    quantityOnHand: item.quantityOnHand != null && item.quantityOnHand !== "" ? String(item.quantityOnHand) : "1",
    propertyNumber: item.propertyNumber ?? "",
    serialNumber: item.serialNumber ?? "",
    brand: item.brand ?? "",
    model: item.model ?? "",
    division: item.division ?? "",
    status: item.status ?? "IN_STOCK",
    condition: item.condition ?? "GOOD",
  }
}

// Column config for Customize Columns (toggleable data columns; drag, actions always shown)
const SUPPLY_COLUMNS = [
  { id: "propertyNo", label: "Property No." },
  { id: "name", label: "Name" },
  { id: "category", label: "Category" },
  { id: "quantity", label: "On-Hand Qty" },
  { id: "reorderLevel", label: "Reorder Level" },
  { id: "unit", label: "Unit" },
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
  { id: "quantity", label: "Quantity" },
  { id: "details", label: "Details" },
  { id: "status", label: "Status" },
  { id: "condition", label: "Condition" },
  { id: "accountability", label: "Accountability" },
  { id: "remarks", label: "Remarks" },
]
const SUPPLY_COL_ORDER = ["drag", "propertyNo", "name", "category", "quantity", "reorderLevel", "unit", "serialNo", "status", "condition", "accountablePerson", "dateAcquired", "actions"]
const ASSET_COL_ORDER = ["drag", "name", "category", "propertyNo", "serialNo", "quantity", "details", "status", "condition", "accountability", "remarks", "actions"]
const FIXED_COLUMNS = new Set(["drag", "actions", "name", "quantity"])
const isColVisible = (id, visibility) => FIXED_COLUMNS.has(id) || visibility[id] === true

// Column width mappings (in rem or auto).
const COLUMN_WIDTHS = {
  drag: "2.5rem",
  actions: "3rem",
  propertyNo: "6rem",
  name: "auto",
  category: "6rem",
  quantity: "5rem",
  reorderLevel: "5rem",
  unit: "4rem",
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
  quantity: "text-right tabular-nums",
  reorderLevel: "text-right tabular-nums",
  unit: "text-left",
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

function SortableRowSupply({ item, selectedIds, toggleRow, openEdit, onArchive, onRestore, onDelete, onMove, onCopy, columnVisibility, onRowClick }) {
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
          <TableCell key={id} className={`px-3 py-2 font-medium ${getColAlignment(id)}`}>{displayNA(item.propertyNumber)}</TableCell>
        )
      case "name":
        return (
          <TableCell key={id} className={`px-3 py-2 truncate ${getColAlignment(id)}`}>{item.name}</TableCell>
        )
      case "category":
        return (
          <TableCell key={id} className={`px-3 py-2 truncate ${getColAlignment(id)}`}>{displayNA(item.category)}</TableCell>
        )
      case "quantity":
        return (
          <TableCell key={id} className={`px-3 py-2 ${getColAlignment(id)}`}>
            {(Number(item.quantityOnHand) || (item.itemType === "ASSET" ? 1 : 0)).toLocaleString()}
          </TableCell>
        )
      case "reorderLevel":
        return (
          <TableCell key={id} className={`px-3 py-2 ${getColAlignment(id)}`}>
            {item.itemType === "SUPPLY" && item.reorderLevel
              ? (Number(item.reorderLevel) || 0).toLocaleString()
              : "—"}
          </TableCell>
        )
      case "unit":
        return (
          <TableCell key={id} className={`px-3 py-2 ${getColAlignment(id)}`}>{item.unit?.trim() || "pc"}</TableCell>
        )
      case "serialNo":
        return (
          <TableCell key={id} className={`px-3 py-2 ${getColAlignment(id)}`}>{displayNA(item.serialNumber)}</TableCell>
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
            {displayNA(item.accountablePerson?.name)}
          </TableCell>
        )
      case "dateAcquired":
        return (
          <TableCell key={id} className={`px-3 py-2 ${getColAlignment(id)}`}>
            {item.dateAcquired ? new Date(item.dateAcquired).toLocaleDateString() : "N/A"}
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
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => openEdit(item)}>Edit</DropdownMenuItem>
                {!item.isArchived && (
                  <DropdownMenuItem onClick={() => onMove?.(item)}>Move to category</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {item.isArchived ? (
                  <>
                    <DropdownMenuItem onClick={() => onRestore?.(item)}>Restore</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => onDelete?.(item)}>Delete Permanently</DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem variant="destructive" onClick={() => onArchive?.(item)}>Archive</DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onCopy?.(item)}>Copy</DropdownMenuItem>
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

function SortableRowAsset({ item, selectedIds, toggleRow, openEdit, onArchive, onRestore, onDelete, onMove, onCopy, columnVisibility, onRowClick }) {
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
          <TableCell key={id} className={`px-3 py-2 truncate ${getColAlignment(id)}`}>{displayNA(item.category)}</TableCell>
        )
      case "propertyNo":
        return (
          <TableCell key={id} className={`px-3 py-2 ${getColAlignment(id)}`}>{displayNA(item.propertyNumber)}</TableCell>
        )
      case "serialNo":
        return (
          <TableCell key={id} className={`px-3 py-2 ${getColAlignment(id)}`}>{displayNA(item.serialNumber)}</TableCell>
        )
      case "quantity":
        return (
          <TableCell key={id} className={`px-3 py-2 ${getColAlignment(id)}`}>
            {(Number(item.quantityOnHand) || 1).toLocaleString()}
          </TableCell>
        )
      case "details":
        return (
          <TableCell key={id} className={`px-3 py-2 ${getColAlignment(id)}`}>
            <span className="text-muted-foreground text-sm">
              {[item.brand, item.model].filter(Boolean).join(" · ") || "N/A"}
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
            {displayNA(item.accountablePerson?.name)}
          </TableCell>
        )
      case "remarks":
        return (
          <TableCell key={id} className={`px-3 py-2 truncate ${getColAlignment(id)}`} title={item.remarks ?? ""}>
            {displayNA(item.remarks)}
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
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => openEdit(item)}>Edit</DropdownMenuItem>
                {!item.isArchived && (
                  <DropdownMenuItem onClick={() => onMove?.(item)}>Move to category</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {item.isArchived ? (
                  <>
                    <DropdownMenuItem onClick={() => onRestore?.(item)}>Restore</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => onDelete?.(item)}>Delete Permanently</DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem variant="destructive" onClick={() => onArchive?.(item)}>Archive</DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onCopy?.(item)}>Copy</DropdownMenuItem>
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
    division: extra.division ?? "",
    accountablePerson: extra.accountablePerson ?? {},
    dateAcquired: extra.dateAcquired ?? null,
    ...extra,
  }
}

// Helper to build asset item (Identification, Details, Accountability, etc.)
function assetItem(id, name, category, extra = {}) {
  return {
    id,
    name,
    category: category ?? "General",
    propertyNumber: extra.propertyNumber ?? id,
    serialNumber: extra.serialNumber ?? null,
    brand: extra.brand ?? "",
    model: extra.model ?? "",
    unitCost: extra.unitCost ?? 0,
    dateAcquired: extra.dateAcquired ?? null,
    division: extra.division ?? "",
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
    assetItem("P001", "HP LaserJet Pro", "Printer", { propertyNumber: "PROP-P001", serialNumber: "SN-HP001", brand: "HP", model: "LaserJet Pro", unitCost: 12000, division: "IT Office", accountablePerson: _acc("Juan Dela Cruz", "IT Officer") }),
    assetItem("P002", "Canon PIXMA Inkjet", "Printer", { propertyNumber: "PROP-P002", brand: "Canon", model: "PIXMA", unitCost: 8500 }),
    assetItem("P003", "Epson EcoTank", "Printer", { propertyNumber: "PROP-P003", status: "FOR_REPAIR", condition: "FAIR" }),
  ],
  drugs: [
    supplyItem("D001", "Paracetamol 500mg", "Drugs", { serialNumber: "DRG-001", status: "IN_STOCK", division: "Pharmacy", dateAcquired: "2024-01-15" }),
    supplyItem("D002", "Ibuprofen 200mg", "Drugs", { serialNumber: "DRG-002", status: "IN_STOCK", division: "Pharmacy", accountablePerson: _acc("Maria Santos") }),
  ],
  "furniture-fixtures": [
    assetItem("F001", "Office Chair", "Furniture & Fixtures", { propertyNumber: "PROP-F001", brand: "Office Pro", unitCost: 4500, division: "Admin" }),
    assetItem("F002", "Conference Table", "Furniture & Fixtures", { propertyNumber: "PROP-F002", unitCost: 25000 }),
    assetItem("F003", "Filing Cabinet", "Furniture & Fixtures", { propertyNumber: "PROP-F003", condition: "FAIR", remarks: "Needs repair" }),
  ],
  "ict-equipment": [
    assetItem("I001", "Dell OptiPlex Desktop", "ICT Equipment", { propertyNumber: "PROP-I001", serialNumber: "DL-OP001", brand: "Dell", model: "OptiPlex", unitCost: 35000, division: "IT Room" }),
    assetItem("I002", "Dell Monitor 24\"", "ICT Equipment", { propertyNumber: "PROP-I002", brand: "Dell", unitCost: 12000 }),
    assetItem("I003", "Laptop - Dell Inspiron", "ICT Equipment", { propertyNumber: "PROP-I003", status: "DEPLOYED", accountablePerson: _acc("Ana Reyes", "Staff") }),
  ],
  "laboratory-equipment": [
    assetItem("L001", "Centrifuge Machine", "Laboratory Equipment", { propertyNumber: "PROP-L001", brand: "Eppendorf", unitCost: 180000 }),
    assetItem("L002", "Microscope", "Laboratory Equipment", { propertyNumber: "PROP-L002", division: "Lab 1" }),
  ],
  "medical-supplies": [
    supplyItem("M001", "Surgical Gloves", "Medical Supplies", { propertyNumber: "M-SG-001", status: "IN_STOCK", division: "Storage A", dateAcquired: "2024-06-01" }),
    supplyItem("M002", "Face Masks", "Medical Supplies", { status: "IN_STOCK", division: "Storage A" }),
    supplyItem("M003", "Bandages", "Medical Supplies", { status: "IN_STOCK", condition: "GOOD", accountablePerson: _acc("Nurse Cruz") }),
  ],
  "motor-vehicles": [
    assetItem("V001", "Toyota Hilux", "Motor Vehicles", { propertyNumber: "PROP-V001", serialNumber: "CHASSIS-XXX", brand: "Toyota", model: "Hilux", unitCost: 1200000, status: "DEPLOYED", accountablePerson: _acc("Driver Lopez", "Driver") }),
    assetItem("V002", "Honda City", "Motor Vehicles", { propertyNumber: "PROP-V002", brand: "Honda", model: "City", unitCost: 850000 }),
  ],
  "office-equipment": [
    assetItem("O001", "Laptop Stand", "Office Equipment", { propertyNumber: "PROP-O001", unitCost: 1200 }),
    assetItem("O002", "Wireless Keyboard", "Office Equipment", { propertyNumber: "PROP-O002", brand: "Logitech", unitCost: 2500 }),
    assetItem("O003", "Webcam HD", "Office Equipment", { propertyNumber: "PROP-O003", status: "FOR_REPAIR", remarks: "USB port damaged" }),
  ],
}

function formToApiPayload(form, isSupply) {
  const acc = form.accountablePerson || defaultAccountablePerson()
  const dateAcquired = form.dateAcquired ? new Date(form.dateAcquired).toISOString() : null
  const unitCost = Number(form.unitCost) || 0
  const base = {
    itemType: isSupply ? "SUPPLY" : "ASSET",
    name: (form.name || "").trim(),
    category: (form.category || "General").trim(),
    unit: form.unit || "pc",
    dateAcquired,
    unitCost,
    remarks: (form.remarks || "").trim(),
    accountablePerson: { ...acc },
    transferredTo: (form.transferredTo || "").trim(),
  }
  if (isSupply) {
    return {
      ...base,
      quantityOnHand: parseInt(form.quantityOnHand, 10) || 0,
      reorderLevel: parseInt(form.reorderLevel, 10) || 0,
      serialNumber: (form.serialNumber || "").trim() || null,
    }
  }
  return {
    ...base,
    quantityOnHand: parseInt(form.quantityOnHand, 10) || 1,
    propertyNumber: (form.propertyNumber || "").trim() || null,
    serialNumber: (form.serialNumber || "").trim() || null,
    brand: (form.brand || "").trim(),
    model: (form.model || "").trim(),
    division: (form.division || "").trim(),
    status: form.status || "IN_STOCK",
    condition: form.condition || "GOOD",
  }
}

// Build update payload with protected fields excluded
function formToUpdatePayload(form, isSupply) {
  const dateAcquired = form.dateAcquired ? new Date(form.dateAcquired).toISOString() : null
  const unitCost = Number(form.unitCost) || 0
  const base = {
    name: (form.name || "").trim(),
    category: (form.category || "General").trim(),
    unit: form.unit || "pc",
    dateAcquired,
    unitCost,
    remarks: (form.remarks || "").trim(),
  }
  if (isSupply) {
    return {
      ...base,
      quantityOnHand: parseInt(form.quantityOnHand, 10) || 0,
      reorderLevel: parseInt(form.reorderLevel, 10) || 0,
      serialNumber: (form.serialNumber || "").trim() || null,
    }
  }
  return {
    ...base,
    quantityOnHand: parseInt(form.quantityOnHand, 10) || 1,
    propertyNumber: (form.propertyNumber || "").trim() || null,
    serialNumber: (form.serialNumber || "").trim() || null,
    brand: (form.brand || "").trim(),
    model: (form.model || "").trim(),
    division: (form.division || "").trim(),
    condition: form.condition || "GOOD",
  }
}

export default function CategoryItemsPage() {
  const { categorySlug } = useParams()
  const location = useLocation()
  const { getCategoryBySlug, refreshCategories, categories } = useCategories()
  const { peopleOptions } = usePeople()
  const categoryFromApi = getCategoryBySlug(categorySlug)
  const navState = location.state
  const category = categoryFromApi ?? (categorySlug ? {
    name: (navState?.newCategory && typeof navState.newCategory === "string")
      ? navState.newCategory.trim()
      : (categorySlug || "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    slug: categorySlug,
    itemType: (navState?.itemType === "ASSET" || navState?.itemType === "SUPPLY") ? navState.itemType : "SUPPLY",
    icon: null,
  } : null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(() => getEmptyForm(true, "General"))
  const [submitting, setSubmitting] = useState(false)
  const [supplyColumnVisibility, setSupplyColumnVisibility] = useState(() =>
    Object.fromEntries(SUPPLY_COLUMNS.map((c) => [c.id, true]))
  )
  const [assetColumnVisibility, setAssetColumnVisibility] = useState(() => {
    const defaultHidden = new Set(["serialNo", "accountability", "category"])
    return Object.fromEntries(
      ASSET_COLUMNS.map((c) => [c.id, !defaultHidden.has(c.id)])
    )
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerItem, setDrawerItem] = useState(null)
  const [tableSearch, setTableSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [archiveFilter, setArchiveFilter] = useState("active") // "active" | "archived"
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const [itemToMove, setItemToMove] = useState(null)
  const [moveTarget, setMoveTarget] = useState("")
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false)
  const [itemToCopy, setItemToCopy] = useState(null)
  const [copyForm, setCopyForm] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const dndId = useId()
  const isMobile = useIsMobile()

  const personByName = useMemo(() => {
    const map = new Map()
    ;(peopleOptions || []).forEach((p) => {
      if (p?.name) map.set(String(p.name), p)
    })
    return map
  }, [peopleOptions])

  const isEmptyNewCategory = !!(category && items.length === 0 && navState?.newCategory)
  const blocker = useBlocker(isEmptyNewCategory)

  useEffect(() => {
    if (!isEmptyNewCategory) return
    const handleBeforeUnload = (e) => {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isEmptyNewCategory])

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


  const loadItems = useCallback(async (fromRefresh = false) => {
    if (!category?.name) {
      setItems([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await itemsService.listItems({
        category: category.name,
        archived: archiveFilter === "archived" ? "true" : "false",
      })
      setItems(data.map((i) => ({ ...i, id: i._id?.toString() ?? i.id ?? i._id })))
      if (fromRefresh) toast.success("Items refreshed.")
    } catch (err) {
      setError(getErrorMessage(err))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [category?.name, archiveFilter])

  useEffect(() => {
    loadItems()
    setSelectedIds(new Set())
  }, [loadItems])

  const filteredItems = useMemo(() => {
    let list = items
    const q = (tableSearch || "").trim().toLowerCase()
    if (q) {
      list = list.filter(
        (i) =>
          (i.name && i.name.toLowerCase().includes(q)) ||
          (i.propertyNumber && i.propertyNumber.toString().toLowerCase().includes(q)) ||
          (i.serialNumber && i.serialNumber.toString().toLowerCase().includes(q)) ||
          (i.category && i.category.toLowerCase().includes(q)) ||
          (i.division && i.division.toLowerCase().includes(q))
      )
    }
    if (statusFilter === "LOW_STOCK") {
      list = list.filter(
        (i) => i.itemType === "SUPPLY" && Number(i.reorderLevel) > 0 && Number(i.quantityOnHand) <= Number(i.reorderLevel)
      )
    } else if (statusFilter) {
      list = list.filter((i) => i.status === statusFilter)
    }
    return list
  }, [items, tableSearch, statusFilter])

  const totalFiltered = filteredItems.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const paginatedItems = useMemo(
    () => filteredItems.slice((page - 1) * pageSize, page * pageSize),
    [filteredItems, page, pageSize]
  )
  const startRow = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1
  const endRow = Math.min(page * pageSize, totalFiltered)

  useEffect(() => {
    setPage(1)
  }, [tableSearch, statusFilter])

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    const allFilteredSelected = filteredItems.length > 0 && filteredItems.every((i) => selectedIds.has(i.id))
    if (allFilteredSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredItems.map((i) => i.id)))
  }
  const isAllSelected = filteredItems.length > 0 && filteredItems.every((i) => selectedIds.has(i.id))
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
        const oldIndex = prev.findIndex((i) => String(i.id) === String(active.id))
        const newIndex = prev.findIndex((i) => String(i.id) === String(over.id))
        if (oldIndex === -1 || newIndex === -1) return prev
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  const openAdd = () => {
    if (category) setForm(getEmptyForm(category.itemType === "SUPPLY", category.name))
    setAddOpen(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setForm(itemToForm(item, item.itemType === "SUPPLY"))
    setEditOpen(true)
  }

  const handleAdd = async () => {
    if (!category) return
    const itemName = (form.name || "").trim()
    if (!itemName) {
      toast.error("Item name is required. Enter a name to save the item and create the category.")
      return
    }
    const isSupply = category.itemType === "SUPPLY"
    const payload = formToApiPayload(form, isSupply)
    setSubmitting(true)
    try {
      const created = await itemsService.createItem(payload)
      setItems((prev) => [...prev, { ...created, id: created._id?.toString() ?? created._id }])
      setAddOpen(false)
      setForm(getEmptyForm(isSupply, category.name))
      refreshCategories?.()
      toast.success("Item added. Category is now saved.")
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editingItem || !category) return
    const isSupply = category.itemType === "SUPPLY"
    
    // Build ONLY the editable fields - never include protected fields
    const dateAcquired = form.dateAcquired ? new Date(form.dateAcquired).toISOString() : null
    const unitCost = Number(form.unitCost) || 0
    
    let payload = {
      name: (form.name || "").trim(),
      category: (form.category || "General").trim(),
      unit: form.unit || "pc",
      dateAcquired,
      unitCost,
      remarks: (form.remarks || "").trim(),
    }
    
    if (isSupply) {
      payload = {
        ...payload,
        quantityOnHand: parseInt(form.quantityOnHand, 10) || 0,
        reorderLevel: parseInt(form.reorderLevel, 10) || 0,
        serialNumber: (form.serialNumber || "").trim() || null,
        status: form.status || "IN_STOCK",
        condition: form.condition || "GOOD",
      }
    } else {
      payload = {
        ...payload,
        propertyNumber: (form.propertyNumber || "").trim() || null,
        serialNumber: (form.serialNumber || "").trim() || null,
        brand: (form.brand || "").trim(),
        model: (form.model || "").trim(),
        division: (form.division || "").trim(),
        status: form.status || "IN_STOCK",
        condition: form.condition || "GOOD",
      }
    }
    
    // FINAL SAFEGUARD: Remove any protected fields that shouldn't exist
    const protectedFields = ["accountablePerson", "transferredTo", "assignedDate", "returnedDate", "itemType"]
    protectedFields.forEach(field => delete payload[field])
    
    const id = editingItem.id ?? editingItem._id
    setSubmitting(true)
    try {
      const updated = await itemsService.updateItem(id, payload)
      setItems((prev) =>
        prev.map((i) => (String(i.id) === String(id) ? { ...updated, id: updated._id?.toString() ?? updated._id } : i))
      )
      setEditOpen(false)
      setEditingItem(null)
      setForm(getEmptyForm(isSupply, category.name))
      toast.success("Item updated.")
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleArchive = async (item) => {
    const id = item.id ?? item._id
    setSubmitting(true)
    try {
      await itemsService.archiveItem(id)
      setItems((prev) => prev.filter((i) => String(i.id) !== String(id)))
      toast.success("Item archived successfully.")
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRestore = async (item) => {
    const id = item.id ?? item._id
    setSubmitting(true)
    try {
      await itemsService.restoreItem(id)
      setItems((prev) => prev.filter((i) => String(i.id) !== String(id)))
      toast.success("Item restored successfully.")
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (item) => {
    setItemToDelete(item)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    const id = itemToDelete.id ?? itemToDelete._id
    setSubmitting(true)
    try {
      await itemsService.deleteItem(id)
      setItems((prev) => prev.filter((i) => String(i.id) !== String(id)))
      toast.success("Item permanently deleted.")
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
    }
  }

  const openMove = (item) => {
    setItemToMove(item)
    setMoveTarget("")
    setMoveOpen(true)
  }

  const openCopyConfirm = (item) => {
    const isSupply = item.itemType === "SUPPLY"
    const base = itemToForm(item, isSupply)
    setCopyForm({
      ...base,
      name: `${item.name} (Copy)`,
      serialNumber: "",
      // propertyNumber and accountablePerson kept pre-filled from source
      transferredTo: "",
    })
    setItemToCopy(item)
    setCopyConfirmOpen(true)
  }

  const handleConfirmCopy = async () => {
    if (!itemToCopy || !copyForm) return
    const id = itemToCopy.id ?? itemToCopy._id
    const isSupply = itemToCopy.itemType === "SUPPLY"
    const payload = formToApiPayload(copyForm, isSupply)
    setSubmitting(true)
    try {
      const created = await itemsService.copyItem(id, payload)
      setItems((prev) => [...prev, { ...created, id: created._id?.toString() ?? created._id }])
      toast.success(`"${copyForm.name}" copied successfully.`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
      setCopyConfirmOpen(false)
      setItemToCopy(null)
      setCopyForm(null)
    }
  }

  const confirmMove = async () => {
    if (!itemToMove || !moveTarget) return
    const id = itemToMove.id ?? itemToMove._id
    setSubmitting(true)
    try {
      await itemsService.updateItem(id, { category: moveTarget })
      setItems((prev) => prev.filter((i) => String(i.id) !== String(id)))
      refreshCategories?.()
      toast.success(`"${itemToMove.name}" moved to ${moveTarget}.`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
      setMoveOpen(false)
      setItemToMove(null)
      setMoveTarget("")
    }
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
  // Normalize status string to consistent token like IN_STOCK, LOW_STOCK, DEPLOYED, etc.
  const normalizeStatus = (s) => (s || "").toString().trim().toUpperCase().replace(/\s+/g, "_")
  const statuses = items.map((it) => normalizeStatus(it.status))
  // Supply summary counts
  const inStockCount = statuses.filter((st) => st === "IN_STOCK").length
  const lowStockCount = statuses.filter((st) => st === "LOW_STOCK").length
  const otherCount = Math.max(0, items.length - inStockCount - lowStockCount)
  // Asset summary counts
  const deployedCount = statuses.filter((st) => st === "DEPLOYED").length
  const assetInStockCount = statuses.filter((st) => st === "IN_STOCK").length
  const forRepairCount = statuses.filter((st) => st === "FOR_REPAIR").length
  const disposedCount = statuses.filter((st) => st === "DISPOSED").length
  const lostCount = statuses.filter((st) => st === "LOST").length

  // Total asset/supply value: for supplies multiply unitCost * quantityOnHand when available,
  // for assets sum unitCost (or unitCost * quantityOnHand if quantity provided).
  const totalValue = items.reduce((acc, it) => {
    const cost = Number(it.unitCost) || 0
    const qty = (it.itemType === "SUPPLY") ? (Number(it.quantityOnHand) || 0) : (Number(it.quantityOnHand) || 1)
    return acc + cost * qty
  }, 0)
  const formattedTotalValue = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(totalValue)

  return (
    <>
    <div className="mx-auto flex min-w-0 w-full max-w-[1400px] flex-col gap-6">
      {/* Floating Help Button for Tutorial */}
      <FloatingHelpButton steps={categoryItemsTutorialSteps} pageId="categoryItems" />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between" data-tutorial="category-header">
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
          <Button onClick={openAdd} data-tutorial="add-item-btn">
            <Plus className="size-4" />
            Add Item
          </Button>
          <Button variant="outline" size="icon" onClick={() => loadItems(true)} disabled={loading} data-tutorial="refresh-items-btn">
            <RefreshCw className="size-4" />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}

      <section className="@container/main grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2" data-tutorial="value-card">
          <Card>
            <CardHeader>
              <CardDescription>Total Asset Value</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">{formattedTotalValue}</CardTitle>
              <div className="mt-1 text-sm text-muted-foreground">Total items: <span className="font-medium tabular-nums">{items.length}</span></div>
            </CardHeader>
          </Card>
        </div>
        <div className="sm:col-span-1" data-tutorial="summary-card">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{items.length} items</div>
                <div className="text-sm text-muted-foreground">Summary</div>
              </div>

              <div className="mt-3">
                <div className="w-full h-3 rounded-full bg-muted-foreground/20 overflow-hidden flex">
                  {items.length > 0 ? (
                    isSupply ? (
                      <>
                        <div className="h-3 bg-green-500" style={{ width: `${(inStockCount / items.length) * 100}%` }} />
                        <div className="h-3 bg-amber-500" style={{ width: `${(lowStockCount / items.length) * 100}%` }} />
                        <div className="h-3 bg-zinc-400" style={{ width: `${(otherCount / items.length) * 100}%` }} />
                      </>
                    ) : (
                      <>
                        <div className="h-3 bg-green-500" style={{ width: `${(deployedCount / items.length) * 100}%` }} />
                        <div className="h-3 bg-blue-400" style={{ width: `${(assetInStockCount / items.length) * 100}%` }} />
                        <div className="h-3 bg-amber-500" style={{ width: `${(forRepairCount / items.length) * 100}%` }} />
                        <div className="h-3 bg-zinc-400" style={{ width: `${(disposedCount / items.length) * 100}%` }} />
                        <div className="h-3 bg-red-500" style={{ width: `${(lostCount / items.length) * 100}%` }} />
                      </>
                    )
                  ) : (
                    <div className="h-3 w-full bg-zinc-200" />
                  )}
                </div>

                {isSupply ? (
                  <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                      <span>In stock: {inStockCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      <span>Low stock: {lowStockCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-zinc-400 inline-block" />
                      <span>Other: {otherCount}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                      <span>Deployed: {deployedCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                      <span>In stock: {assetInStockCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      <span>For repair: {forRepairCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-zinc-400 inline-block" />
                      <span>Disposed: {disposedCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                      <span>Lost: {lostCount}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-xl border bg-white" data-tutorial="items-table">
        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative max-w-sm flex-1 min-w-[200px]" data-tutorial="items-search">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, property no., serial no., division…"
                className="pl-9"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter || "_"} onValueChange={(v) => setStatusFilter(v === "_" ? "" : v)}>
              <SelectTrigger className="w-[160px]" data-tutorial="status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {(isSupply ? STATUS_FILTER_OPTIONS : STATUS_FILTER_OPTIONS.filter((o) => o.value !== "LOW_STOCK")).map((o) => (
                  <SelectItem key={o.value || "all"} value={o.value || "_"}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={archiveFilter} onValueChange={setArchiveFilter}>
              <SelectTrigger className="w-[140px]" data-tutorial="archive-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active items</SelectItem>
                <SelectItem value="archived">Archived items</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-tutorial="customize-columns-btn">
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
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
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
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={colOrder.filter((id) => isColVisible(id, columnVisibility)).length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={colOrder.filter((id) => isColVisible(id, columnVisibility)).length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {items.length === 0
                          ? "No items in this category yet. Add an item to get started."
                          : "No items match your filters. Try changing search or status."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    <SortableContext items={paginatedItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                      {paginatedItems.map((item) =>
                        isSupply ? (
                          <SortableRowSupply
                            key={item.id}
                            item={item}
                            selectedIds={selectedIds}
                            toggleRow={toggleRow}
                            openEdit={openEdit}
                            onArchive={handleArchive}
                            onRestore={handleRestore}
                            onDelete={handleDelete}
                            onMove={openMove}
                            onCopy={openCopyConfirm}
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
                            onArchive={handleArchive}
                            onRestore={handleRestore}
                            onDelete={handleDelete}
                            onMove={openMove}
                            onCopy={openCopyConfirm}
                            columnVisibility={columnVisibility}
                            onRowClick={openDrawer}
                          />
                        )
                      )}
                    </SortableContext>
                  )}
                </TableBody>
              </Table>
            </div>
          </DndContext>
          {(items.length > 0 || totalFiltered > 0) && (
            <div className="flex flex-col gap-3 border-t px-4 py-3 lg:px-6 sm:flex-row sm:items-center sm:justify-between" data-tutorial="pagination">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  {selectedIds.size > 0 && (
                    <span className="mr-2">{selectedIds.size} of {totalFiltered} selected</span>
                  )}
                  Showing {startRow}–{endRow} of {totalFiltered}
                </span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v))
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">per page</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <span className="min-w-[100px] text-center text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Add Item Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>
              {items.length === 0 && navState?.newCategory
                ? `This category will be saved to the database when you add the first item. Add a new ${isSupply ? "supply" : "asset"} item below (item name is required).`
                : `Add a new ${isSupply ? "supply" : "asset"} item to ${category?.name}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              {/* Ledger-style: Date acquired, Item, Amount, Property number */}
              <div>
                <h4 className="mb-3 text-sm font-medium text-zinc-900">Inventory record</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="add-dateAcquired">Date acquired</Label>
                    <Input
                      id="add-dateAcquired"
                      type="date"
                      value={form.dateAcquired}
                      onChange={(e) => setForm((f) => ({ ...f, dateAcquired: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-unitCost">Amount (₱)</Label>
                    <Input
                      id="add-unitCost"
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.unitCost}
                      onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="add-name">Item <span className="text-destructive">*</span></Label>
                    <Input
                      id="add-name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Paper Shredder, Printer 3-in-1, Desktop Computer"
                      required
                    />
                  </div>
                  {!isSupply && (
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="add-propertyNo">Property number</Label>
                      <Input
                        id="add-propertyNo"
                        value={form.propertyNumber}
                        onChange={(e) => setForm((f) => ({ ...f, propertyNumber: e.target.value }))}
                        placeholder="e.g. 2025-26-014 or CPDC-001 to 004"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Accountable person & Transferred to */}
              <Separator />
              <div>
                <h4 className="mb-3 text-sm font-medium text-zinc-900">Accountability</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="add-acc-name">Accountable person</Label>
                    <Select
                      value={form.accountablePerson?.name?.trim() ? form.accountablePerson.name : "_"}
                      onValueChange={(v) => {
                        const next = v === "_" ? "" : v
                        const p = next ? personByName.get(next) : null
                        setForm((f) => ({
                              ...f,
                              accountablePerson: {
                                ...(f.accountablePerson || defaultAccountablePerson()),
                                name: next,
                                position: p?.position ?? (f.accountablePerson?.position ?? ""),
                                office: p?.office ?? (f.accountablePerson?.office ?? "CPDC"),
                              },
                              division: p?.office ?? (f.division || ""),
                            }))
                      }}
                    >
                      <SelectTrigger id="add-acc-name">
                        <SelectValue placeholder="Select person" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_">N/A</SelectItem>
                        {peopleOptions.map((p) => (
                          <SelectItem key={p.id} value={p.name}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-transferredTo">Transferred to (optional)</Label>
                    <Select
                      value={form.transferredTo?.trim() ? form.transferredTo : "_"}
                      onValueChange={(v) => {
                        const next = v === "_" ? "" : v
                        const p = next ? personByName.get(next) : null
                        setForm((f) => ({
                          ...f,
                          transferredTo: next || undefined,
                          division: p?.office ?? (f.division || ""),
                        }))
                      }}
                    >
                      <SelectTrigger id="add-transferredTo">
                        <SelectValue placeholder="Select person" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_">None</SelectItem>
                        {peopleOptions.map((p) => (
                          <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Details: category, unit, serial + type-specific */}
              <Separator />
              <div>
                <h4 className="mb-3 text-sm font-medium text-zinc-900">Details</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="add-category">Category</Label>
                    <Input
                      id="add-category"
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      placeholder="General"
                      disabled
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
                  <div className="space-y-2">
                    <Label htmlFor="add-serial">Serial no. (optional)</Label>
                    <Input
                      id="add-serial"
                      value={form.serialNumber ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                  {isSupply ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="add-quantity">Quantity on hand</Label>
                        <Input
                          id="add-quantity"
                          type="number"
                          min={0}
                          value={form.quantityOnHand}
                          onChange={(e) => setForm((f) => ({ ...f, quantityOnHand: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-reorder">Reorder level</Label>
                        <Input
                          id="add-reorder"
                          type="number"
                          min={0}
                          value={form.reorderLevel}
                          onChange={(e) => setForm((f) => ({ ...f, reorderLevel: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-status">Status</Label>
                        <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                          <SelectTrigger id="add-status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-condition">Condition</Label>
                        <Select value={form.condition} onValueChange={(v) => setForm((f) => ({ ...f, condition: v }))}>
                          <SelectTrigger id="add-condition">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITION_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="add-quantity">Quantity</Label>
                        <Input
                          id="add-quantity"
                          type="number"
                          min={1}
                          value={form.quantityOnHand}
                          onChange={(e) => setForm((f) => ({ ...f, quantityOnHand: e.target.value }))}
                          placeholder="1"
                          readOnly
                          className="bg-muted cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-brand">Brand</Label>
                        <Input
                          id="add-brand"
                          value={form.brand}
                          onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                          placeholder="e.g. HP"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-model">Model</Label>
                        <Input
                          id="add-model"
                          value={form.model}
                          onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                          placeholder="e.g. LaserJet Pro"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="add-division">Division</Label>
                        <Input
                          id="add-division"
                          value={form.division}
                          onChange={(e) => setForm((f) => ({ ...f, division: e.target.value }))}
                          placeholder="e.g. Admin, IT, Finance"
                          readOnly={(form.accountablePerson?.name?.trim() || form.transferredTo?.trim()) ? true : false}
                          className={(form.accountablePerson?.name?.trim() || form.transferredTo?.trim()) ? "bg-muted cursor-not-allowed" : ""}
                        />
                        {(form.accountablePerson?.name?.trim() || form.transferredTo?.trim()) && (
                          <p className="text-xs text-muted-foreground">Auto-filled from selected person — edit manually if needed</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-status">Status</Label>
                        <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                          <SelectTrigger id="add-status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-condition">Condition</Label>
                        <Select value={form.condition} onValueChange={(v) => setForm((f) => ({ ...f, condition: v }))}>
                          <SelectTrigger id="add-condition">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITION_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Separator />
              <div>
                <h4 className="mb-3 text-sm font-medium text-zinc-900">Remarks</h4>
                <Textarea
                  id="add-remarks"
                  value={form.remarks}
                  onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                  placeholder="e.g. place in New City Hall Bldg., Admin Use, -do- 12 pcs."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t bg-muted/30 px-6 py-4">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleAdd} disabled={submitting || !form.name.trim() || (!isSupply && !form.propertyNumber?.trim())}>
              {submitting ? "Adding…" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Update the item details for {form.name || "this item"}.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              {/* Ledger-style: Date acquired, Item, Amount, Property number */}
              <div>
                <h4 className="mb-3 text-sm font-medium text-zinc-900">Inventory record</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-dateAcquired">Date acquired</Label>
                    <Input
                      id="edit-dateAcquired"
                      type="date"
                      value={form.dateAcquired}
                      onChange={(e) => setForm((f) => ({ ...f, dateAcquired: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-unitCost">Amount (₱)</Label>
                    <Input
                      id="edit-unitCost"
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.unitCost}
                      onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="edit-name">Item</Label>
                    <Input
                      id="edit-name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Paper Shredder, Printer 3-in-1, Desktop Computer"
                    />
                  </div>
                  {!isSupply && (
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="edit-propertyNo">Property number</Label>
                      <Input
                        id="edit-propertyNo"
                        value={form.propertyNumber}
                        onChange={(e) => setForm((f) => ({ ...f, propertyNumber: e.target.value }))}
                        placeholder="e.g. 2025-26-014 or CPDC-001 to 004"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Accountable person & Transferred to — read-only, managed via Assign/Transfer/Return */}
              <Separator />
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-medium text-zinc-900">Accountability</h4>
                  <span className="text-xs text-muted-foreground">Use Assign / Transfer / Return to change</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Accountable person</Label>
                    <Input
                      value={form.accountablePerson?.name?.trim() || "N/A"}
                      disabled
                      className="bg-muted/50 text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Transferred to</Label>
                    <Input
                      value={form.transferredTo?.trim() || "None"}
                      disabled
                      className="bg-muted/50 text-muted-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Details */}
              <Separator />
              <div>
                <h4 className="mb-3 text-sm font-medium text-zinc-900">Details</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <Input
                      id="edit-category"
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      placeholder="General"
                      disabled
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
                  <div className="space-y-2">
                    <Label htmlFor="edit-serial">Serial no. (optional)</Label>
                    <Input
                      id="edit-serial"
                      value={form.serialNumber ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                  {isSupply ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="edit-quantity">Quantity on hand</Label>
                        <Input
                          id="edit-quantity"
                          type="number"
                          min={0}
                          value={form.quantityOnHand}
                          onChange={(e) => setForm((f) => ({ ...f, quantityOnHand: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-reorder">Reorder level</Label>
                        <Input
                          id="edit-reorder"
                          type="number"
                          min={0}
                          value={form.reorderLevel}
                          onChange={(e) => setForm((f) => ({ ...f, reorderLevel: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-status">Status</Label>
                        <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                          <SelectTrigger id="edit-status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-condition">Condition</Label>
                        <Select value={form.condition} onValueChange={(v) => setForm((f) => ({ ...f, condition: v }))}>
                          <SelectTrigger id="edit-condition">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITION_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="edit-quantity">Quantity</Label>
                        <Input
                          id="edit-quantity"
                          type="number"
                          min={1}
                          value={form.quantityOnHand}
                          onChange={(e) => setForm((f) => ({ ...f, quantityOnHand: e.target.value }))}
                          placeholder="1"
                          readOnly
                          className="bg-muted cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-brand">Brand</Label>
                        <Input
                          id="edit-brand"
                          value={form.brand}
                          onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                          placeholder="e.g. HP"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-model">Model</Label>
                        <Input
                          id="edit-model"
                          value={form.model}
                          onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                          placeholder="e.g. LaserJet Pro"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="edit-division">Division</Label>
                        <Input
                          id="edit-division"
                          value={form.division}
                          onChange={(e) => setForm((f) => ({ ...f, division: e.target.value }))}
                          placeholder="e.g. Admin, IT, Finance"
                          readOnly={(form.accountablePerson?.name?.trim() || form.transferredTo?.trim()) ? true : false}
                          className={(form.accountablePerson?.name?.trim() || form.transferredTo?.trim()) ? "bg-muted cursor-not-allowed" : ""}
                        />
                        {(form.accountablePerson?.name?.trim() || form.transferredTo?.trim()) && (
                          <p className="text-xs text-muted-foreground">Auto-filled from selected person — edit manually if needed</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-status">Status</Label>
                        <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                          <SelectTrigger id="edit-status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-condition">Condition</Label>
                        <Select value={form.condition} onValueChange={(v) => setForm((f) => ({ ...f, condition: v }))}>
                          <SelectTrigger id="edit-condition">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITION_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Separator />
              <div>
                <h4 className="mb-3 text-sm font-medium text-zinc-900">Remarks</h4>
                <Textarea
                  id="edit-remarks"
                  value={form.remarks}
                  onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                  placeholder="e.g. place in New City Hall Bldg., Admin Use, -do- 12 pcs."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t bg-muted/30 px-6 py-4">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting || !form.name.trim() || (!isSupply && !form.propertyNumber?.trim())}>
              {submitting ? "Saving…" : "Save Changes"}
            </Button>
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
                      {CONDITION_LABELS[drawerItem.condition] ?? drawerItem.condition ?? "N/A"} condition
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
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{displayNA(drawerItem.propertyNumber)}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium">Name</Label>
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Quantity on hand</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm tabular-nums">{(Number(drawerItem.quantityOnHand) || 0).toLocaleString()}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Unit</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.unit?.trim() || "pc"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Category</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{displayNA(drawerItem.category)}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Serial No.</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{displayNA(drawerItem.serialNumber)}</p>
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
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{CONDITION_LABELS[drawerItem.condition] ?? drawerItem.condition ?? "N/A"}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium">Division</Label>
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{displayNA(drawerItem.division)}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium">Accountable Person</Label>
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{displayNA(drawerItem.accountablePerson?.name)}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium">Transferred to</Label>
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{displayNA(drawerItem.transferredTo)}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium">Date Acquired</Label>
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.dateAcquired ? new Date(drawerItem.dateAcquired).toLocaleDateString() : "N/A"}</p>
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
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{displayNA(drawerItem.category)}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Property No.</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{displayNA(drawerItem.propertyNumber)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Quantity</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm tabular-nums">{Number(drawerItem.quantityOnHand) || 1}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Unit Cost</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.unitCost != null && drawerItem.unitCost > 0 ? `₱${Number(drawerItem.unitCost).toLocaleString()}` : "N/A"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Serial No.</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{displayNA(drawerItem.serialNumber)}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Brand</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{displayNA(drawerItem.brand)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Model</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{displayNA(drawerItem.model)}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium">Unit Cost</Label>
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.unitCost != null && drawerItem.unitCost > 0 ? `₱${Number(drawerItem.unitCost).toLocaleString()}` : "N/A"}</p>
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
                          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{CONDITION_LABELS[drawerItem.condition] ?? drawerItem.condition ?? "N/A"}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium">Date Acquired</Label>
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{drawerItem.dateAcquired ? new Date(drawerItem.dateAcquired).toLocaleDateString() : "N/A"}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium">Accountability</Label>
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                          {drawerItem.accountablePerson?.name
                            ? [drawerItem.accountablePerson.name, drawerItem.accountablePerson.position, drawerItem.accountablePerson.office].filter(Boolean).join(" · ")
                            : "N/A"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium">Transferred to</Label>
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{displayNA(drawerItem.transferredTo)}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium">Remarks</Label>
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{displayNA(drawerItem.remarks)}</p>
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

      {/* Move to category dialog */}
      <Dialog open={moveOpen} onOpenChange={(o) => { if (!o) { setMoveOpen(false); setItemToMove(null); setMoveTarget("") } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Move to category</DialogTitle>
            <DialogDescription>
              Select a destination category for &quot;{itemToMove?.name}&quot;. The item will be removed from the current category.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={moveTarget} onValueChange={setMoveTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Select category…" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((c) => c.name !== category?.name && c.itemType === category?.itemType)
                  .map((c) => (
                    <SelectItem key={c.slug} value={c.name}>{c.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMoveOpen(false); setItemToMove(null); setMoveTarget("") }}>
              Cancel
            </Button>
            <Button onClick={confirmMove} disabled={!moveTarget || submitting}>
              {submitting ? "Moving…" : "Move"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Item Dialog — editable pre-filled form */}
      <Dialog open={copyConfirmOpen} onOpenChange={(o) => { if (!o) { setCopyConfirmOpen(false); setItemToCopy(null); setCopyForm(null) } }}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>Copy Item</DialogTitle>
            <DialogDescription>
              Review and edit the details for the new copy before saving.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {copyForm && (
              <div className="space-y-6">
                {/* Inventory record */}
                <div>
                  <h4 className="mb-3 text-sm font-medium text-zinc-900">Inventory record</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="copy-dateAcquired">Date acquired</Label>
                      <Input
                        id="copy-dateAcquired"
                        type="date"
                        value={copyForm.dateAcquired}
                        onChange={(e) => setCopyForm((f) => ({ ...f, dateAcquired: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="copy-unitCost">Amount (₱)</Label>
                      <Input
                        id="copy-unitCost"
                        type="number"
                        min={0}
                        step={0.01}
                        value={copyForm.unitCost}
                        onChange={(e) => setCopyForm((f) => ({ ...f, unitCost: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="copy-name">Item name <span className="text-destructive">*</span></Label>
                      <Input
                        id="copy-name"
                        value={copyForm.name}
                        onChange={(e) => setCopyForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Item name"
                      />
                    </div>
                    {itemToCopy?.itemType !== "SUPPLY" && (
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="copy-propertyNo">Property number</Label>
                        <Input
                          id="copy-propertyNo"
                          value={copyForm.propertyNumber ?? ""}
                          onChange={(e) => setCopyForm((f) => ({ ...f, propertyNumber: e.target.value }))}
                          placeholder="e.g. 2025-26-014"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Accountability */}
                <Separator />
                <div>
                  <h4 className="mb-3 text-sm font-medium text-zinc-900">Accountability</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="copy-acc-name">Accountable person</Label>
                      <Select
                        value={copyForm.accountablePerson?.name?.trim() ? copyForm.accountablePerson.name : "_"}
                        onValueChange={(v) => {
                          const next = v === "_" ? "" : v
                          const p = next ? personByName.get(next) : null
                          setCopyForm((f) => ({
                            ...f,
                            accountablePerson: {
                              ...(f.accountablePerson || defaultAccountablePerson()),
                              name: next,
                              position: p?.position ?? (f.accountablePerson?.position ?? ""),
                              office: p?.office ?? (f.accountablePerson?.office ?? "CPDC"),
                            },
                          }))
                        }}
                      >
                        <SelectTrigger id="copy-acc-name"><SelectValue placeholder="Select person" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_">N/A</SelectItem>
                          {peopleOptions.map((p) => (
                            <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="copy-transferredTo">Transferred to (optional)</Label>
                      <Select
                        value={copyForm.transferredTo?.trim() ? copyForm.transferredTo : "_"}
                        onValueChange={(v) => {
                          const next = v === "_" ? "" : v
                          setCopyForm((f) => ({ ...f, transferredTo: next || "" }))
                        }}
                      >
                        <SelectTrigger id="copy-transferredTo"><SelectValue placeholder="Select person" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_">None</SelectItem>
                          {peopleOptions.map((p) => (
                            <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <Separator />
                <div>
                  <h4 className="mb-3 text-sm font-medium text-zinc-900">Details</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="copy-unit">Unit</Label>
                      <Select value={copyForm.unit} onValueChange={(v) => setCopyForm((f) => ({ ...f, unit: v }))}>
                        <SelectTrigger id="copy-unit"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {UNIT_OPTIONS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="copy-serial">Serial no. (optional)</Label>
                      <Input
                        id="copy-serial"
                        value={copyForm.serialNumber ?? ""}
                        onChange={(e) => setCopyForm((f) => ({ ...f, serialNumber: e.target.value }))}
                        placeholder="Cleared — enter new serial if needed"
                      />
                    </div>
                    {itemToCopy?.itemType === "SUPPLY" ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="copy-qty">Quantity on hand</Label>
                          <Input id="copy-qty" type="number" min={0}
                            value={copyForm.quantityOnHand}
                            onChange={(e) => setCopyForm((f) => ({ ...f, quantityOnHand: e.target.value }))}
                            placeholder="0" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="copy-reorder">Reorder level</Label>
                          <Input id="copy-reorder" type="number" min={0}
                            value={copyForm.reorderLevel}
                            onChange={(e) => setCopyForm((f) => ({ ...f, reorderLevel: e.target.value }))}
                            placeholder="0" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="copy-brand">Brand</Label>
                          <Input id="copy-brand" value={copyForm.brand ?? ""}
                            onChange={(e) => setCopyForm((f) => ({ ...f, brand: e.target.value }))}
                            placeholder="e.g. HP" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="copy-model">Model</Label>
                          <Input id="copy-model" value={copyForm.model ?? ""}
                            onChange={(e) => setCopyForm((f) => ({ ...f, model: e.target.value }))}
                            placeholder="e.g. LaserJet Pro" />
                        </div>
                      </>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="copy-status">Status</Label>
                      <Select value={copyForm.status} onValueChange={(v) => setCopyForm((f) => ({ ...f, status: v }))}>
                        <SelectTrigger id="copy-status"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="copy-condition">Condition</Label>
                      <Select value={copyForm.condition} onValueChange={(v) => setCopyForm((f) => ({ ...f, condition: v }))}>
                        <SelectTrigger id="copy-condition"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                <Separator />
                <div>
                  <h4 className="mb-3 text-sm font-medium text-zinc-900">Remarks</h4>
                  <Textarea
                    id="copy-remarks"
                    value={copyForm.remarks ?? ""}
                    onChange={(e) => setCopyForm((f) => ({ ...f, remarks: e.target.value }))}
                    placeholder="Optional remarks"
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t bg-muted/30 px-6 py-4">
            <Button variant="outline" onClick={() => { setCopyConfirmOpen(false); setItemToCopy(null); setCopyForm(null) }} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCopy} disabled={submitting || !copyForm?.name?.trim()}>
              {submitting ? "Copying…" : "Create Copy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{itemToDelete?.name}" from the database. This action cannot be undone.
              {itemToDelete && (
                <span className="block mt-2 text-red-600 font-medium">
                  Warning: Only delete items with no transaction history.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteConfirmOpen(false); setItemToDelete(null); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={submitting} className="bg-red-600 hover:bg-red-700">
              {submitting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {blocker.state === "blocked" ? (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) blocker.reset()
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave without saving category?</AlertDialogTitle>
              <AlertDialogDescription>
                This category has no items yet. If you leave now, the category will not be saved to the database. You can add an item first to create the category, or leave anyway.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => blocker.reset()}>Stay</AlertDialogCancel>
              <AlertDialogAction onClick={() => blocker.proceed()}>Leave anyway</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  )
}
