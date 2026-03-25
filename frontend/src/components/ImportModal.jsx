import { useState, useRef } from "react"
import {
  Upload,
  Download,
  FileSpreadsheet,
  X,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { importService } from "@/services"

const TEMPLATE_CSV =
  [
    "Item Type",
    "Category",
    "Name",
    "Unit",
    "Date Acquired",
    "Amount",
    "Property No.",
    "Serial No.",
    "Brand",
    "Model",
    "Qty On Hand",
    "Reorder Level",
    "Division",
    "Accountable Person Transferred To",
    "Accountable Position",
    "Accountable Office",
    "Status",
    "Condition",
    "Remarks",
  ].join(",") +
  "\n" +
  "SUPPLY,Office Supplies,Bond Paper,ream,2024-01-15,500,,,,,50,10,,,,CPDO,IN_STOCK,GOOD,\n" +
  "ASSET,IT Equipment,Laptop,pc,2024-03-01,45000,PN-2024-001,SN-ABC123,Dell,Latitude 5540,1,0,,Juan dela Cruz,IT Staff,CPDO,DEPLOYED,GOOD,For field work"

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "inventory-import-template.csv"
  a.click()
  URL.revokeObjectURL(url)
}

const COLUMN_GUIDE = [
  { label: "Category", required: true },
  { label: "Name", required: true },
  { label: "Item Type", required: false },
  { label: "Date Acquired", required: false },
  { label: "Amount", required: false },
  { label: "Property No.", required: false },
  { label: "Accountable Person Transferred To", required: false },
  { label: "Remarks", required: false },
]

export default function ImportModal({ open, onOpenChange, onSuccess }) {
  const [file, setFile] = useState(null)
  const [mode, setMode] = useState("upsert")
  const [status, setStatus] = useState("idle") // idle | loading | done
  const [result, setResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  function reset() {
    setFile(null)
    setMode("upsert")
    setStatus("idle")
    setResult(null)
  }

  function handleOpenChange(val) {
    if (!val) reset()
    onOpenChange(val)
  }

  function handleFile(f) {
    if (!f) return
    const ext = f.name.split(".").pop().toLowerCase()
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      toast.error("Please select an Excel (.xlsx, .xls) or CSV file.")
      return
    }
    setFile(f)
    setStatus("idle")
    setResult(null)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  async function handleImport() {
    if (!file) return
    setStatus("loading")
    try {
      const res = await importService.importItems(file, mode)
      setResult(res)
      setStatus("done")
      if (res.inserted > 0 || res.updated > 0) {
        toast.success(
          `Import complete: ${res.inserted} added, ${res.updated} updated.`
        )
        onSuccess?.()
      } else if (res.errors?.length === 0) {
        toast.info("Import complete. No new changes were made.")
      }
    } catch (err) {
      setStatus("idle")
      toast.error(
        err?.response?.data?.message ||
          "Import failed. Please check your file and try again."
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-zinc-600" />
            Import Inventory
          </DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file to bulk-import items. Items are placed
            in their category automatically based on the{" "}
            <strong>Category</strong> column.
          </DialogDescription>
        </DialogHeader>

        {status === "done" && result ? (
          <ResultView result={result} />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Drop zone */}
            <div
              className={[
                "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-colors",
                dragOver
                  ? "border-zinc-400 bg-zinc-50"
                  : file
                    ? "border-green-400 bg-green-50"
                    : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50",
              ].join(" ")}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />
              {file ? (
                <>
                  <CheckCircle className="size-8 text-green-500" />
                  <div className="text-center">
                    <p className="font-medium text-zinc-800">{file.name}</p>
                    <p className="text-sm text-zinc-500">
                      {(file.size / 1024).toFixed(1)} KB — ready to import
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-3 top-3 h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="size-8 text-zinc-400" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-zinc-700">
                      Click to upload or drag &amp; drop
                    </p>
                    <p className="text-xs text-zinc-500">
                      .xlsx, .xls, or .csv files
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Mode selector + template download */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-[220px] flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">
                  Import Mode
                </label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upsert">
                      Upsert — Add new &amp; update existing
                    </SelectItem>
                    <SelectItem value="createOnly">
                      Create Only — Skip items that already exist
                    </SelectItem>
                    <SelectItem value="updateOnly">
                      Update Only — Skip new items
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">
                  Need a template?
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="gap-1.5"
                >
                  <Download className="size-3.5" />
                  Download Template
                </Button>
              </div>
            </div>

            {/* Column guide */}
            <div className="rounded-lg border bg-zinc-50 px-4 py-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
                <Info className="size-3.5" />
                Expected columns (column order doesn&apos;t matter)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {COLUMN_GUIDE.map(({ label, required }) => (
                  <Badge
                    key={label}
                    variant={required ? "default" : "outline"}
                    className="text-xs"
                  >
                    {label}
                    {required && (
                      <span className="ml-0.5 text-[10px] opacity-75">*</span>
                    )}
                  </Badge>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                <span className="font-medium text-zinc-700">*</span> Required.
                Items without a <strong>Category</strong> default to
                &ldquo;General&rdquo;. Assets are matched by{" "}
                <strong>Property No.</strong>; supplies by Name + Category.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {status === "done" ? (
            <>
              <Button variant="outline" onClick={reset}>
                Import Another File
              </Button>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                disabled={!file || status === "loading"}
                onClick={handleImport}
                className="gap-2"
              >
                {status === "loading" ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Import
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ResultView({ result }) {
  const hasErrors = result.errors?.length > 0

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Rows" value={result.totalRows} color="zinc" />
        <StatCard label="Inserted" value={result.inserted} color="green" />
        <StatCard label="Updated" value={result.updated} color="blue" />
        <StatCard label="Skipped" value={result.skipped} color="amber" />
      </div>

      {hasErrors ? (
        <div className="max-h-52 overflow-y-auto rounded-lg border border-red-200 bg-red-50">
          <div className="sticky top-0 border-b border-red-200 bg-red-50 px-3 py-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
              <AlertCircle className="size-3.5" />
              {result.errors.length} row
              {result.errors.length !== 1 ? "s" : ""} had errors
            </p>
          </div>
          <ul className="divide-y divide-red-100">
            {result.errors.map((e, i) => (
              <li key={i} className="px-3 py-2 text-xs text-red-700">
                <span className="font-medium">Row {e.row}:</span> {e.message}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle className="size-4 shrink-0 text-green-600" />
          Import completed successfully with no errors.
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  const colorMap = {
    zinc: "bg-zinc-100 text-zinc-800",
    green: "bg-green-100 text-green-800",
    blue: "bg-blue-100 text-blue-800",
    amber: "bg-amber-100 text-amber-800",
  }
  return (
    <div className={`rounded-lg p-3 text-center ${colorMap[color]}`}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs font-medium">{label}</p>
    </div>
  )
}
