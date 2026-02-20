import { useState, useEffect, useCallback } from "react"
import { Search, RefreshCw, Download } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { dashboardService, exportService } from "@/services"
import { getErrorMessage } from "@/utils/api"

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")
  const [downloading, setDownloading] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await dashboardService.getSummary()
      setLogs(data?.previews?.recentAuditLogs ?? [])
    } catch (err) {
      setError(getErrorMessage(err))
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const blob = await exportService.downloadAuditXlsx()
      downloadBlob(blob, `audit_logs_${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success("Download started.")
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDownloading(false)
    }
  }

  const filtered = logs.filter((log) => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    const user = (log.actorId?.name ?? "").toLowerCase()
    const action = (log.action ?? "").toLowerCase()
    const target = (log.targetType ?? "").toLowerCase()
    return user.includes(s) || action.includes(s) || target.includes(s)
  })

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900">
            Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground">
            Recent system activities. Download full report as Excel. (Admin Only)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className="size-4" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button variant="outline" size="icon" onClick={handleDownload} disabled={downloading}>
            <Download className="size-4" />
            <span className="sr-only">Download</span>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}

      <section className="@container/main grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Recent (preview)</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{logs.length}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:px-6 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search logs..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No audit logs to show.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell>{log.actorId?.name ?? "—"}</TableCell>
                    <TableCell>{log.action ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{log.targetType ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground lg:px-6">
          <p>Showing {filtered.length} of {logs.length} recent logs</p>
        </div>
      </section>
    </div>
  )
}
