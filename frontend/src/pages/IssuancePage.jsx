import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react"
import { ClipboardList, Search, Plus, Trash2, Filter, RefreshCw, ChevronLeft, ChevronRight, MoreVertical } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer"
import { itemsService, transactionsService } from "@/services"
import { FixedSizeList as List } from "react-window"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
import { FloatingHelpButton } from "@/components/HelpButton"
import { issuanceTutorialSteps } from "@/constants/tutorialSteps"
import { useIsMobile } from "@/hooks/use-mobile"
import { getErrorMessage } from "@/utils/api"
import { usePeople } from "@/contexts/PeopleContext"

const AssetRow = memo(function AssetRow({ index, style, data }) {
  const a = data.assets[index]
  const id = String(a._id ?? a.id)
  const isSelected = data.selectedAssetIds.has(id)
  const assignedTo = a?.accountablePerson?.name?.trim()
  const disabled = Boolean(assignedTo)
  return (
    <div style={style} key={id} className="flex items-center gap-2 px-2 hover:bg-muted/50">
      <Checkbox checked={isSelected} disabled={disabled} onCheckedChange={() => { if (!disabled) data.toggleAssetSelection(id) }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{a.propertyNumber ? `${a.propertyNumber} – ` : ""}{a.name}</div>
        <div className="text-xs text-muted-foreground">
          {a.location ?? "N/A"}{assignedTo ? ` • Assigned to ${assignedTo}` : ""}
        </div>
      </div>
    </div>
  )
})

const ISSUE_MODE_SUPPLY = "supply"
const ISSUE_MODE_ASSET = "asset"
const PAGE_SIZE_OPTIONS = [10, 25, 50]
const FILTER_TYPE_ALL = "all"
const FILTER_TYPE_SUPPLY = "supply"
const FILTER_TYPE_ASSET = "asset"

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function lastMonthStr() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

export default function IssuancePage() {
  const { peopleOptions } = usePeople()
  const isMobile = useIsMobile()
  const [issueMode, setIssueMode] = useState(ISSUE_MODE_SUPPLY)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [supplies, setSupplies] = useState([])
  const [assets, setAssets] = useState([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [assetQuery, setAssetQuery] = useState("")
  const [assetCategoryFilter, setAssetCategoryFilter] = useState("")
  // status filter removed
  const [assetAssignedFilter, setAssetAssignedFilter] = useState("false") // Assigned = No (string because API uses string flags elsewhere)
  const [assetPage, setAssetPage] = useState(1)
  const [assetPageSize, setAssetPageSize] = useState(50)
  const [assetsHasMore, setAssetsHasMore] = useState(true)
  const assetsRef = useRef(new Map())
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [txLoading, setTxLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")
  const [filterAccountable, setFilterAccountable] = useState("")
  const [filterItem, setFilterItem] = useState("")
  const [filterType, setFilterType] = useState(FILTER_TYPE_ALL)
  const [dateFrom, setDateFrom] = useState(lastMonthStr())
  const [dateTo, setDateTo] = useState(todayStr())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [deletingTxId, setDeletingTxId] = useState(null)
  const [actionRow, setActionRow] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [transferName, setTransferName] = useState("")
  const [transferPosition, setTransferPosition] = useState("")
  const [transferOffice, setTransferOffice] = useState("CPDC")
  const [transferRemarks, setTransferRemarks] = useState("")

  const [lines, setLines] = useState([{ itemId: "", qty: 1 }])
  const [issuedToOffice, setIssuedToOffice] = useState("")
  const [issuedToPerson, setIssuedToPerson] = useState("")
  const [remarks, setRemarks] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [selectedAssetIds, setSelectedAssetIds] = useState(new Set())
  const [assetAccName, setAssetAccName] = useState("")
  const [assetAccPosition, setAssetAccPosition] = useState("")
  const [assetAccOffice, setAssetAccOffice] = useState("CPDC")
  const [assetRemarks, setAssetRemarks] = useState("")

  const personByName = useMemo(() => {
    const map = new Map()
    ;(peopleOptions || []).forEach((p) => {
      if (p?.name) map.set(String(p.name), p)
    })
    return map
  }, [peopleOptions])

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
      // include ASSET_TRANSFER so transfers show up in the ledger
      const data = await transactionsService.listTransactions({ type: "ISSUANCE,ASSET_ASSIGN,ASSET_TRANSFER" })
      setTransactions(data)
      if (showToast) toast.success("List refreshed.")
    } catch (err) {
      setTransactions([])
      toast.error(getErrorMessage(err))
    } finally {
      setTxLoading(false)
    }
  }, [])
  // fetchAssets implemented via ref to avoid identity-change loops that cause repeated fetches
  const fetchAssetsRef = useRef(null)
  const assetQueryRef = useRef("")
  const assetCategoryRef = useRef("")
  const assetAssignedRef = useRef("")
  const assetPageRef = useRef(assetPage)
  const assetPageSizeRef = useRef(assetPageSize)

  // keep refs in sync with state
  useEffect(() => { assetQueryRef.current = assetQuery }, [assetQuery])
  useEffect(() => { assetCategoryRef.current = assetCategoryFilter }, [assetCategoryFilter])
  useEffect(() => { assetAssignedRef.current = assetAssignedFilter }, [assetAssignedFilter])
  useEffect(() => { assetPageRef.current = assetPage }, [assetPage])
  useEffect(() => { assetPageSizeRef.current = assetPageSize }, [assetPageSize])

  fetchAssetsRef.current = async ({ reset = false } = {}) => {
    setAssetsLoading(true)
    try {
      const pageToLoad = reset ? 1 : assetPageRef.current
      const params = {
        type: "ASSET",
        archived: "false",
        q: assetQueryRef.current || undefined,
        category: assetCategoryRef.current || undefined,
        assigned: assetAssignedRef.current || undefined,
        page: pageToLoad,
        pageSize: assetPageSizeRef.current,
      }
      const data = await itemsService.listItems(params)
      if (reset) {
        setAssets(data || [])
        setAssetPage(2)
        assetPageRef.current = 2
        setAssetsHasMore((data || []).length >= assetPageSizeRef.current)
        assetsRef.current = new Map((data || []).map((a) => [String(a._id ?? a.id), a]))
      } else {
        setAssets((prev) => {
          const next = [...prev, ...(data || [])]
          ;(data || []).forEach((a) => assetsRef.current.set(String(a._id ?? a.id), a))
          return next
        })
        setAssetPage((p) => {
          const next = p + 1
          assetPageRef.current = next
          return next
        })
        setAssetsHasMore((data || []).length >= assetPageSizeRef.current)
      }
    } catch (err) {
      setError(getErrorMessage(err))
      if (reset) setAssets([])
      toast.error(getErrorMessage(err))
    } finally {
      setAssetsLoading(false)
    }
  }

  // Refetch assets when asset filters/search change or when user switches to Asset mode.
  useEffect(() => {
    if (issueMode !== ISSUE_MODE_ASSET) return
    const t = setTimeout(() => {
      // reset pagination when filters/search change
      setAssetPage(1)
          if (fetchAssetsRef.current) fetchAssetsRef.current({ reset: true })
    }, 300)
    return () => clearTimeout(t)
  }, [issueMode, assetQuery, assetCategoryFilter, assetAssignedFilter])

  useEffect(() => {
    fetchSupplies()
  }, [fetchSupplies])

  // asset fetching is handled by a dedicated effect that observes filters and issueMode

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const toggleAssetSelection = useCallback((id) => {
    const sid = String(id)
    setSelectedAssetIds((prev) => {
      const next = new Set(prev)
      if (next.has(sid)) next.delete(sid)
      else next.add(sid)
      return next
    })
  }, [])

  const selectAllAssets = useCallback(() => {
    setSelectedAssetIds((prev) => {
      if (prev.size >= assets.length) return new Set()
      // only select unassigned assets
      return new Set(assets.filter((a) => {
        const name = a?.accountablePerson?.name
        return !(name && String(name).trim())
      }).map((a) => String(a._id ?? a.id)))
    })
  }, [assets])

  // memoized category/location lists to avoid recalculating each render
  const assetCategories = useMemo(() => Array.from(new Set(assets.map((a) => a.category).filter(Boolean))), [assets])
  // location filter removed; assetLocations no longer needed

  const handleItemsRendered = useCallback(
    ({ visibleStopIndex }) => {
      if (assetsHasMore && visibleStopIndex >= assets.length - 6 && !assetsLoading) {
        if (fetchAssetsRef.current) fetchAssetsRef.current()
      }
    },
    [assetsHasMore, assets.length, assetsLoading]
  )

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
    // require a person for supply issuance
    if (!issuedToPerson || !issuedToPerson.trim()) {
      toast.error("Issued to Person is required.")
      return
    }

    // derive office from selected person if available, otherwise default to CPDC
    const office = (issuedToOffice && issuedToOffice.trim()) || (issuedToPerson ? (personByName.get(issuedToPerson)?.office || "CPDC") : "CPDC")
    setSubmitting(true)
    try {
      await transactionsService.createIssuance({
        items,
        issuedToOffice: office,
        issuedToPerson: issuedToPerson.trim() || undefined,
        purpose: remarks.trim() || undefined,
        accountablePerson: {
          name: issuedToPerson.trim() || "",
          // position/office are derived from the selected person if present
          position: "",
          office: office,
        },
      })
      toast.success("Issuance recorded.")
      setLines([{ itemId: "", qty: 1 }])
      setIssuedToOffice("")
      setIssuedToPerson("")
      setRemarks("")
      fetchTransactions()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitAsset = async () => {
    const ids = Array.from(selectedAssetIds)
    if (ids.length === 0) {
      toast.error("Select at least one asset.")
      return
    }
    if (!assetAccName.trim()) {
      toast.error("Accountable person is required.")
      return
    }
    setSubmitting(true)
    try {
      await transactionsService.createAssetAssign({
        items: ids.map((id) => ({ itemId: id, qty: 1 })),
        accountablePerson: {
          name: assetAccName.trim(),
          position: assetAccPosition.trim() || "",
          office: assetAccOffice.trim() || "CPDC",
        },
        remarks: assetRemarks.trim() || undefined,
      })
      toast.success(`${ids.length} asset(s) assigned.`)
      setSelectedAssetIds(new Set())
      setAssetAccName("")
      setAssetAccPosition("")
      setAssetAccOffice("CPDC")
      setAssetRemarks("")
      if (fetchAssetsRef.current) fetchAssetsRef.current({ reset: true })
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // Flatten each transaction's items into rows for the ledger-style table
  const flattenedRows = useMemo(
    () =>
      transactions.flatMap((tx) =>
        (tx.items ?? []).map((line) => ({
          _id: `${tx._id}-${line.itemId?._id ?? line.itemId}-${line.qty}`,
          txId: tx._id,
          txType: tx.type,
          createdAt: tx.createdAt,
          purpose: tx.purpose,
          issuedToOffice: tx.issuedToOffice,
          issuedToPerson: tx.issuedToPerson,
          accountablePerson: tx.accountablePerson,
          createdBy: tx.createdBy,
          qty: line.qty,
          itemId: typeof line.itemId === "object" && line.itemId != null ? (line.itemId._id ?? line.itemId.id) : line.itemId,
          item: line.itemId,
        }))
      ),
    [transactions]
  )

  const uniqueAccountables = useMemo(() => {
    const set = new Set()
    flattenedRows.forEach((row) => {
      const name = row.item?.accountablePerson?.name ?? row.accountablePerson?.name ?? row.issuedToPerson
      if (name && String(name).trim()) set.add(String(name).trim())
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [flattenedRows])

  const uniqueItems = useMemo(() => {
    const set = new Set()
    flattenedRows.forEach((row) => {
      const name = row.item?.name
      if (name && String(name).trim()) set.add(String(name).trim())
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [flattenedRows])

  const filteredRows = useMemo(() => {
    return flattenedRows.filter((row) => {
      if (filterType !== FILTER_TYPE_ALL) {
        const isSupply = row.txType === "ISSUANCE"
        if (filterType === FILTER_TYPE_SUPPLY && !isSupply) return false
        if (filterType === FILTER_TYPE_ASSET && isSupply) return false
      }
      if (dateFrom && row.createdAt) {
        const rowDate = new Date(row.createdAt)
        const from = new Date(dateFrom + "T00:00:00.000Z")
        if (rowDate < from) return false
      }
      if (dateTo && row.createdAt) {
        const rowDate = new Date(row.createdAt)
        const to = new Date(dateTo + "T23:59:59.999Z")
        if (rowDate > to) return false
      }
      if (filterAccountable) {
        const acc = (row.item?.accountablePerson?.name ?? row.accountablePerson?.name ?? row.issuedToPerson ?? "").trim()
        if (acc.toLowerCase() !== filterAccountable.toLowerCase()) return false
      }
      if (filterItem) {
        const itemName = (row.item?.name ?? "").trim()
        if (itemName.toLowerCase() !== filterItem.toLowerCase()) return false
      }
      if (search.trim()) {
        const s = search.toLowerCase()
        const itemName = (row.item?.name ?? "").toLowerCase()
        const office = (row.issuedToOffice ?? "").toLowerCase()
        const person = (row.issuedToPerson ?? "").toLowerCase()
        const by = (row.createdBy?.name ?? "").toLowerCase()
        const remarks = (row.purpose ?? "").toLowerCase()
        const acc = (row.item?.accountablePerson?.name ?? "").toLowerCase()
        const match =
          itemName.includes(s) ||
          office.includes(s) ||
          person.includes(s) ||
          by.includes(s) ||
          remarks.includes(s) ||
          acc.includes(s)
        if (!match) return false
      }
      return true
    })
  }, [flattenedRows, filterAccountable, filterItem, search, filterType, dateFrom, dateTo])

  const totalFiltered = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)
  const startRow = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1
  const endRow = Math.min(page * pageSize, totalFiltered)

  useEffect(() => {
    setPage(1)
  }, [search, filterAccountable, filterItem, filterType, dateFrom, dateTo])

  const handleRemoveTransaction = async (txId, txType) => {
    const isAsset = txType === "ASSET_ASSIGN"
    const msg = isAsset
      ? "Remove this asset assignment? The asset(s) will return to inventory (unassigned)."
      : "Remove this issuance? Stock will be returned to inventory."
    if (!window.confirm(msg)) return
    setDeletingTxId(txId)
    try {
      await transactionsService.deleteIssuance(txId)
      toast.success(isAsset ? "Asset assignment removed." : "Issuance removed.")
      fetchTransactions()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDeletingTxId(null)
    }
  }

  const handleRemoveLine = async (txId, txType, itemId) => {
    const isAsset = txType === "ASSET_ASSIGN"
    const msg = isAsset
      ? "Remove this assigned asset from the transaction? The asset will return to inventory (unassigned)."
      : "Remove this issued item line? Stock will be returned to inventory."
    if (!window.confirm(msg)) return
    const key = `${txId}:${itemId}`
    setDeletingTxId(key)
    try {
      await transactionsService.deleteIssuanceLine(txId, itemId)
      toast.success(isAsset ? "Line removed (asset unassigned)." : "Line removed (stock returned).")
      fetchTransactions()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDeletingTxId(null)
    }
  }

  // Confirmed delete (used by AlertDialog) - deletes the specific line stored in `actionRow`
  const confirmDelete = async () => {
    if (!actionRow) return
    const { txId, txType, itemId } = actionRow
    const isAsset = txType === "ASSET_ASSIGN"
    const key = `${txId}:${itemId}`
    setDeletingTxId(key)
    setDeleteDialogOpen(false)
    try {
      await transactionsService.deleteIssuanceLine(txId, itemId)
      toast.success(isAsset ? "Line removed (asset unassigned)." : "Line removed (stock returned).")
      fetchTransactions()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDeletingTxId(null)
      setActionRow(null)
    }
  }

  const performTransfer = async () => {
    if (!actionRow) return
    const itemId = actionRow.itemId
    setTransferDialogOpen(false)
    try {
      await itemsService.transferAsset(itemId, {
        txId: actionRow.txId,
        transferredTo: transferName.trim(),
        division: actionRow.item?.division ?? undefined,
        remarks: transferRemarks.trim() || undefined,
        office: transferOffice.trim() || undefined,
      })
      toast.success("Asset transferred.")
      fetchTransactions()
      if (fetchAssetsRef.current) fetchAssetsRef.current({ reset: true })
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setActionRow(null)
      setTransferName("")
      setTransferPosition("")
      setTransferOffice("CPDC")
      setTransferRemarks("")
    }
  }

  return (
    <div className="mx-auto flex min-w-0 w-full max-w-[1400px] flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between" data-tutorial="issuance-header">
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
                <BreadcrumbPage>Item Issuance</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="mt-2 truncate text-xl font-semibold tracking-tight text-zinc-900">
            Item Issuance
          </h1>
          <p className="text-sm text-muted-foreground">
            Issue supplies or assign assets to division/personnel.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => fetchTransactions(true)} 
            disabled={txLoading}
            data-tutorial="refresh-issuance-btn"
          >
            <RefreshCw className="size-4" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button onClick={() => setDrawerOpen(true)} data-tutorial="new-issuance-btn">New Issuance</Button>
          <Button asChild>
            <Link to="/items">View inventory</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/stock/in">Stock In</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left card removed — New Issuance is opened via header button */}

        {/* Issuance Drawer */}
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction={isMobile ? "bottom" : "right"}>
          <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-md h-full flex flex-col">
            <DrawerHeader>
              <div className="flex items-center justify-between">
                <DrawerTitle>New Issuance</DrawerTitle>
                <DrawerClose />
              </div>
              <DrawerDescription>
                {issueMode === ISSUE_MODE_SUPPLY ? "Issue supplies to division/person" : "Assign assets to accountable person"}
              </DrawerDescription>
            </DrawerHeader>

            <div className="p-4 space-y-4 overflow-auto flex-1">
              <div className="flex items-center gap-2" data-tutorial="issuance-mode-tabs">
                <Button
                  type="button"
                  variant={issueMode === ISSUE_MODE_SUPPLY ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setIssueMode(ISSUE_MODE_SUPPLY)}
                >
                  Supply
                </Button>
                <Button
                  type="button"
                  variant={issueMode === ISSUE_MODE_ASSET ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setIssueMode(ISSUE_MODE_ASSET)}
                >
                  Asset
                </Button>
              </div>

              {issueMode === ISSUE_MODE_SUPPLY ? (
                <>
                  <div data-tutorial="supply-item-selector">
                  {lines.map((line, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1 grid gap-2">
                        <Label>Item</Label>
                        <Select
                          value={line.itemId}
                          onValueChange={(v) => setLine(idx, "itemId", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select item" />
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
                  </div>

                  <div className="space-y-2" data-tutorial="issued-to-person">
                    <Label>Issued to Person *</Label>
                    <Select
                      value={issuedToPerson || ""}
                      onValueChange={(v) => {
                        const next = v || ""
                        setIssuedToPerson(next)
                        const p = next ? personByName.get(next) : null
                        if (p) setIssuedToOffice(p.office || "CPDC")
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select person" />
                      </SelectTrigger>
                      <SelectContent>
                        {peopleOptions.map((p) => (
                          <SelectItem key={p.id} value={p.name}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="remarks-issue">Remarks (optional)</Label>
                    <Input
                      id="remarks-issue"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Remarks"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                    <Button className="flex-1" onClick={() => { handleSubmit(); setDrawerOpen(false); }} disabled={submitting || loading}>
                      {submitting ? "Submitting…" : "Issue Items"}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Select assets to assign</Label>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { selectAllAssets() }}>
                          {selectedAssetIds.size >= assets.length ? "Clear all" : "Select all"}
                        </Button>
                      </div>
                    </div>

                    {/* Search & filters */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="🔎 Search assets..."
                          className="pl-9"
                          value={assetQuery}
                          onChange={(e) => setAssetQuery(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Select value={assetCategoryFilter || "_"} onValueChange={(v) => setAssetCategoryFilter(v === "_" ? "" : v)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_">All categories</SelectItem>
                            {assetCategories.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 sm:col-span-2">
                        <Select value={assetAssignedFilter || "_"} onValueChange={(v) => setAssetAssignedFilter(v === "_" ? "" : v)}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Assigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_">Either</SelectItem>
                            <SelectItem value="false">Unassigned (no accountable person)</SelectItem>
                            <SelectItem value="true">Assigned (has accountable person)</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setAssetQuery(""); setAssetCategoryFilter(""); setAssetAssignedFilter("false"); if (fetchAssetsRef.current) fetchAssetsRef.current({ reset: true }) }}>
                          Smart defaults
                        </Button>
                      </div>
                    </div>

                    {/* Selected list */}
                    {selectedAssetIds.size > 0 && (
                      <div className="rounded-md border p-2">
                        <div className="text-sm font-medium">Selected ({selectedAssetIds.size})</div>
                        <div className="mt-2 space-y-1">
                          {Array.from(selectedAssetIds).map((id) => {
                            const asset = assetsRef.current.get(id) || assets.find((a) => String(a._id ?? a.id) === id)
                            return (
                              <label key={id} className="flex items-center gap-2">
                                <Checkbox checked={true} onCheckedChange={() => toggleAssetSelection(id)} />
                                <span className="text-sm truncate">{asset ? `${asset.propertyNumber ? `${asset.propertyNumber} – ` : ""}${asset.name}` : id}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Available assets - virtualized + lazy load */}
                    <div className="h-56 rounded-md border">
                      {assetsLoading && assets.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">Loading assets…</div>
                      ) : assets.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">No assets match your filters.</div>
                      ) : (
                        <List
                          height={224}
                          itemCount={assets.length}
                          itemSize={48}
                          width="100%"
                          itemData={{ assets, selectedAssetIds, toggleAssetSelection }}
                          itemKey={(index) => {
                            const a = assets[index]
                            return String((a && (a._id ?? a.id)) || index)
                          }}
                          onItemsRendered={handleItemsRendered}
                        >
                          {AssetRow}
                        </List>
                      )}
                      {/* removed 'Loading more…' indicator to reduce UI noise */}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Accountable person *</Label>
                    <Select
                      value={assetAccName || "_"}
                      onValueChange={(v) => {
                        const next = v === "_" ? "" : v
                        setAssetAccName(next)
                        const p = next ? personByName.get(next) : null
                        if (p) {
                          setAssetAccPosition(p.position || "")
                          setAssetAccOffice(p.office || "CPDC")
                        }
                      }}
                    >
                      <SelectTrigger id="asset-acc-name">
                        <SelectValue placeholder="Select person" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_">Select…</SelectItem>
                        {peopleOptions.map((p) => (
                          <SelectItem key={p.id} value={p.name}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="asset-remarks">Remarks (optional)</Label>
                    <Input
                      id="asset-remarks"
                      value={assetRemarks}
                      onChange={(e) => setAssetRemarks(e.target.value)}
                      placeholder="Remarks"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                    <Button className="flex-1" onClick={() => { handleSubmitAsset(); setDrawerOpen(false); }} disabled={submitting || assetsLoading || selectedAssetIds.size === 0}>
                      {submitting ? "Assigning…" : `Assign ${selectedAssetIds.size > 0 ? selectedAssetIds.size : ""} asset(s)`}
                    </Button>
                  </div>
                </>
              )}
            </div>

            <DrawerFooter />
          </DrawerContent>
        </Drawer>

        <section className="lg:col-span-3 min-w-0 overflow-hidden rounded-xl border bg-white">
          <div className="flex flex-col gap-3 border-b px-4 py-3 lg:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative max-w-sm flex-1 min-w-[200px]" data-tutorial="search-issuance">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search issued items..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2" data-tutorial="issuance-filters">
                <Label htmlFor="date-from-iss" className="text-muted-foreground text-xs whitespace-nowrap">From</Label>
                <Input
                  id="date-from-iss"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[140px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="date-to-iss" className="text-muted-foreground text-xs whitespace-nowrap">To</Label>
                <Input
                  id="date-to-iss"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[140px]"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_TYPE_ALL}>All</SelectItem>
                  <SelectItem value={FILTER_TYPE_SUPPLY}>Supply</SelectItem>
                  <SelectItem value={FILTER_TYPE_ASSET}>Asset</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filterAccountable || "_"}
                onValueChange={(v) => setFilterAccountable(v === "_" ? "" : v)}
              >
                <SelectTrigger className="w-[200px]">
                  <Filter className="size-4 text-muted-foreground mr-1.5" />
                  <SelectValue placeholder="Accountable person" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">All accountable</SelectItem>
                  {uniqueAccountables.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterItem || "_"} onValueChange={(v) => setFilterItem(v === "_" ? "" : v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">All items</SelectItem>
                  {uniqueItems.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(filterAccountable || filterItem || filterType !== FILTER_TYPE_ALL) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterAccountable("")
                    setFilterItem("")
                    setFilterType(FILTER_TYPE_ALL)
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
          <div className="w-full min-w-0 overflow-x-auto px-4 lg:px-6">
            <div className="inline-block min-w-full rounded-lg border">
              <Table className="w-max min-w-full table-auto" data-tutorial="issuance-table">
                <TableHeader className="bg-muted sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="px-3 whitespace-nowrap">Type</TableHead>
                    <TableHead className="px-3 whitespace-nowrap">Date acquired</TableHead>
                    <TableHead className="px-3 whitespace-nowrap">Item</TableHead>
                    <TableHead className="px-3 whitespace-nowrap text-right">Amount</TableHead>
                    <TableHead className="px-3 whitespace-nowrap">Property no.</TableHead>
                    <TableHead className="px-3 whitespace-nowrap">Accountable person</TableHead>
                    <TableHead className="px-3 whitespace-nowrap">Transferred to</TableHead>
                    <TableHead className="px-3 whitespace-nowrap">Remarks</TableHead>
                    <TableHead className="px-3 w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                        No issuance or assignment records match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((row, idx) => {
                      const isIssuance = row.txType === "ISSUANCE"
                      const accName = row.item?.accountablePerson?.name ?? row.accountablePerson?.name ?? row.issuedToPerson ?? "N/A"
                      return (
                        <TableRow key={row._id}>
                          <TableCell className="px-3">
                            <span className={isIssuance ? "text-muted-foreground" : ""}>
                              {isIssuance ? "Supply" : "Asset"}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 tabular-nums text-muted-foreground">
                            {row.item?.dateAcquired
                              ? new Date(row.item.dateAcquired).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                          <TableCell className="px-3">
                            {row.qty > 0 ? `${row.qty}× ` : ""}{row.item?.name ?? "N/A"}
                          </TableCell>
                          <TableCell className="px-3 text-right tabular-nums">
                            {row.item?.unitCost != null && Number(row.item.unitCost) > 0
                              ? `₱${Number(row.item.unitCost).toLocaleString()}`
                              : "N/A"}
                          </TableCell>
                          <TableCell className="px-3 text-muted-foreground">{row.item?.propertyNumber ?? "N/A"}</TableCell>
                          <TableCell className="px-3">{accName}</TableCell>
                          <TableCell className="px-3 text-muted-foreground">{row.item?.transferredTo ?? "N/A"}</TableCell>
                          <TableCell className="px-3 text-muted-foreground max-w-[200px] truncate" title={row.purpose ?? ""}>
                            {row.purpose ?? "N/A"}
                          </TableCell>
                          <TableCell className="px-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => {
                                  // Edit - navigate to items page where user can edit the item
                                  // fallback: open items list
                                  window.location.href = `/items`;
                                }}>Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setActionRow(row)
                                  setTransferName(row.item?.accountablePerson?.name ?? "")
                                  setTransferPosition(row.item?.accountablePerson?.position ?? "")
                                  setTransferOffice(row.item?.accountablePerson?.office ?? "CPDC")
                                  setTransferRemarks("")
                                  setTransferDialogOpen(true)
                                }} disabled={row.txType === "ISSUANCE"}>{/* only assets can be transferred */}
                                  Transfer
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => {
                                  setActionRow(row)
                                  setDeleteDialogOpen(true)
                                }}>Remove</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>

              {/* Delete confirmation dialog */}
              <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(false); setActionRow(null) } }}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove record?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Removing this line will {actionRow?.txType === "ASSET_ASSIGN" ? "return the asset to inventory (unassigned)." : "return stock to inventory."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Transfer dialog for assets */}
              <Dialog open={transferDialogOpen} onOpenChange={(open) => { if (!open) setTransferDialogOpen(false) }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Transfer asset</DialogTitle>
                    <DialogDescription>Enter the recipient account/person for this asset.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 py-2">
                    <div className="space-y-1">
                      <Label>Transferred to</Label>
                      <Select value={transferName || "_"} onValueChange={(v) => {
                        const next = v === "_" ? "" : v
                        setTransferName(next)
                        const p = next ? personByName.get(next) : null
                        if (p) {
                          setTransferPosition(p.position || "")
                          setTransferOffice(p.office || "CPDC")
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select person" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_">Select…</SelectItem>
                          {peopleOptions.map((p) => (
                            <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Position (optional)</Label>
                      <Input value={transferPosition} onChange={(e) => setTransferPosition(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Office</Label>
                      <Input value={transferOffice} onChange={(e) => setTransferOffice(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Remarks (optional)</Label>
                      <Input value={transferRemarks} onChange={(e) => setTransferRemarks(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
                    <Button onClick={performTransfer} disabled={!transferName.trim()}>Transfer</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

            </div>
          </div>
          {filteredRows.length > 0 && (
            <div className="flex flex-col gap-3 border-t px-4 py-3 lg:px-6 sm:flex-row sm:items-center sm:justify-between" data-tutorial="issuance-pagination">
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
      
      <FloatingHelpButton steps={issuanceTutorialSteps} pageId="issuance" />
    </div>
  )
}
