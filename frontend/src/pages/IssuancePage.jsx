import { useState, useEffect, useCallback, useMemo } from "react"
import { ClipboardList, Search, Plus, Trash2, Filter } from "lucide-react"
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
import { itemsService, transactionsService } from "@/services"
import { getErrorMessage } from "@/utils/api"

const ISSUE_MODE_SUPPLY = "supply"
const ISSUE_MODE_ASSET = "asset"

export default function IssuancePage() {
  const [issueMode, setIssueMode] = useState(ISSUE_MODE_SUPPLY)
  const [supplies, setSupplies] = useState([])
  const [assets, setAssets] = useState([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [txLoading, setTxLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")
  const [filterAccountable, setFilterAccountable] = useState("")
  const [filterItem, setFilterItem] = useState("")
  const [deletingTxId, setDeletingTxId] = useState(null)

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
      const data = await transactionsService.listTransactions({ type: "ISSUANCE,ASSET_ASSIGN" })
      setTransactions(data)
    } catch {
      setTransactions([])
    } finally {
      setTxLoading(false)
    }
  }, [])

  const fetchAssets = useCallback(async () => {
    setAssetsLoading(true)
    try {
      const data = await itemsService.listItems({ type: "ASSET", archived: "false" })
      setAssets(data)
    } catch (err) {
      setError(getErrorMessage(err))
      setAssets([])
    } finally {
      setAssetsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSupplies()
  }, [fetchSupplies])

  useEffect(() => {
    if (issueMode === ISSUE_MODE_ASSET) fetchAssets()
  }, [issueMode, fetchAssets])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const toggleAssetSelection = (id) => {
    const sid = String(id)
    setSelectedAssetIds((prev) => {
      const next = new Set(prev)
      if (next.has(sid)) next.delete(sid)
      else next.add(sid)
      return next
    })
  }

  const selectAllAssets = () => {
    if (selectedAssetIds.size >= assets.length) setSelectedAssetIds(new Set())
    else setSelectedAssetIds(new Set(assets.map((a) => String(a._id ?? a.id))))
  }

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
    if (!issuedToOffice.trim()) {
      toast.error("Issued to Division is required.")
      return
    }
    setSubmitting(true)
    try {
      await transactionsService.createIssuance({
        items,
        issuedToOffice: issuedToOffice.trim(),
        issuedToPerson: issuedToPerson.trim() || undefined,
        purpose: remarks.trim() || undefined,
        accountablePerson: {
          name: issuedToPerson.trim() || "",
          position: "",
          office: issuedToOffice.trim() || "CPDC",
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
      fetchAssets()
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
  }, [flattenedRows, filterAccountable, filterItem, search])

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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="size-4" />
                New Issuance
              </CardTitle>
              <div className="flex rounded-md border border-input bg-muted/30 p-0.5">
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
            </div>
            <CardDescription>
              {issueMode === ISSUE_MODE_SUPPLY ? "Issue supplies to division/person" : "Assign assets to accountable person"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {issueMode === ISSUE_MODE_SUPPLY ? (
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
                <div className="space-y-2">
                  <Label htmlFor="office-issue">Issued to Division *</Label>
                  <Input
                    id="office-issue"
                    value={issuedToOffice}
                    onChange={(e) => setIssuedToOffice(e.target.value)}
                    placeholder="e.g. ICT Division"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="person-issue">Issued to Person (optional)</Label>
                  <Input
                    id="person-issue"
                    value={issuedToPerson}
                    onChange={(e) => setIssuedToPerson(e.target.value)}
                    placeholder="Employee name"
                  />
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
                <Button className="w-full" onClick={handleSubmit} disabled={submitting || loading}>
                  {submitting ? "Submitting…" : "Issue Items"}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Select assets to assign</Label>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllAssets}>
                      {selectedAssetIds.size >= assets.length ? "Clear all" : "Select all"}
                    </Button>
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-2">
                    {assetsLoading ? (
                      <p className="text-sm text-muted-foreground py-2">Loading assets…</p>
                    ) : assets.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No assets in inventory.</p>
                    ) : (
                      assets.map((a) => {
                        const id = String(a._id ?? a.id)
                        const isSelected = selectedAssetIds.has(id)
                        return (
                          <label
                            key={id}
                            className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-muted/50"
                          >
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleAssetSelection(id)} />
                            <span className="text-sm truncate">
                              {a.propertyNumber ? `${a.propertyNumber} – ` : ""}{a.name ?? "—"}
                            </span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asset-acc-name">Accountable person *</Label>
                  <Input
                    id="asset-acc-name"
                    value={assetAccName}
                    onChange={(e) => setAssetAccName(e.target.value)}
                    placeholder="e.g. Jella Mae Dimaculangan"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="asset-acc-position">Position</Label>
                    <Input
                      id="asset-acc-position"
                      value={assetAccPosition}
                      onChange={(e) => setAssetAccPosition(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asset-acc-office">Division</Label>
                    <Input
                      id="asset-acc-office"
                      value={assetAccOffice}
                      onChange={(e) => setAssetAccOffice(e.target.value)}
                      placeholder="e.g. ICT Division"
                    />
                  </div>
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
                <Button
                  className="w-full"
                  onClick={handleSubmitAsset}
                  disabled={submitting || assetsLoading || selectedAssetIds.size === 0}
                >
                  {submitting ? "Assigning…" : `Assign ${selectedAssetIds.size > 0 ? selectedAssetIds.size : ""} asset(s)`}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <section className="lg:col-span-2 min-w-0 overflow-hidden rounded-xl border bg-white">
          <div className="flex flex-col gap-3 border-b px-4 py-3 lg:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative max-w-sm flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search issued items..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
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
              {(filterAccountable || filterItem) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterAccountable("")
                    setFilterItem("")
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
          <div className="w-full min-w-0 overflow-x-auto px-4 lg:px-6">
            <div className="inline-block min-w-full rounded-lg border">
              <Table className="w-max min-w-full table-auto">
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
                        No issuance or assignment records yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row, idx) => {
                      const isFirstOfTx = idx === 0 || filteredRows[idx - 1].txId !== row.txId
                      const isIssuance = row.txType === "ISSUANCE"
                      const accName = row.item?.accountablePerson?.name ?? row.accountablePerson?.name ?? row.issuedToPerson ?? "—"
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
                              : "—"}
                          </TableCell>
                          <TableCell className="px-3">
                            {row.qty > 0 ? `${row.qty}× ` : ""}{row.item?.name ?? "—"}
                          </TableCell>
                          <TableCell className="px-3 text-right tabular-nums">
                            {row.item?.unitCost != null && Number(row.item.unitCost) > 0
                              ? `₱${Number(row.item.unitCost).toLocaleString()}`
                              : "—"}
                          </TableCell>
                          <TableCell className="px-3 text-muted-foreground">{row.item?.propertyNumber ?? "—"}</TableCell>
                          <TableCell className="px-3">{accName}</TableCell>
                          <TableCell className="px-3 text-muted-foreground">{row.item?.transferredTo ?? "—"}</TableCell>
                          <TableCell className="px-3 text-muted-foreground max-w-[200px] truncate" title={row.purpose ?? ""}>
                            {row.purpose ?? "—"}
                          </TableCell>
                          <TableCell className="px-3">
                            {isFirstOfTx ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveTransaction(row.txId, row.txType)}
                                disabled={deletingTxId === row.txId}
                                title={isIssuance ? "Remove issuance (return stock)" : "Remove assignment (asset returns to pool)"}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      )
                    })
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
