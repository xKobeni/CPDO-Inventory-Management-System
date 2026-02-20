import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Package, ArrowDownToLine, ArrowUpFromLine, ClipboardList } from "lucide-react"

import { SectionCards } from "@/components/section-cards"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { dashboardService } from "@/services"
import { getErrorMessage } from "@/utils/api"

function QuickAction({ to, title, description, icon }) {
  const Icon = icon
  return (
    <Card className="transition-shadow hover:shadow-sm">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="grid size-9 place-items-center rounded-lg bg-zinc-900 text-white">
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to={to}>Open</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function DashboardHome() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    dashboardService
      .getSummary()
      .then((data) => {
        if (!cancelled) setSummary(data)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const recentTransactions = summary?.previews?.recentTransactions ?? []

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of inventory activity, trends, and recent actions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/items">View inventory</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/reports">Open reports</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}

      <section className="@container/main rounded-xl border bg-white py-2">
        <SectionCards kpis={summary?.kpis} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <ChartAreaInteractive />
        </div>

        <div className="grid gap-4 lg:col-span-4">
          <QuickAction
            to="/stock/in"
            title="Stock In"
            description="Record incoming items"
            icon={ArrowDownToLine}
          />
          <QuickAction
            to="/stock/out"
            title="Stock Out"
            description="Record released items"
            icon={ArrowUpFromLine}
          />
          <QuickAction
            to="/issuance"
            title="Asset Assignment"
            description="Assign assets to personnel"
            icon={ClipboardList}
          />
          <QuickAction
            to="/items"
            title="Inventory"
            description="Browse and manage items"
            icon={Package}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b px-4 py-3 lg:px-6">
          <h2 className="text-sm font-semibold text-zinc-900">Recent activity</h2>
          <p className="text-xs text-muted-foreground">
            Latest transactions from the API{loading ? " (loading…)" : ""}.
          </p>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : recentTransactions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No recent transactions.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((tx) => (
                  <TableRow key={tx._id}>
                    <TableCell className="font-medium">{tx.type}</TableCell>
                    <TableCell className="tabular-nums">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>{tx.createdBy?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {tx.items?.length
                        ? tx.items.map((i) => `${i.qty}× ${i.itemId?.name ?? i.itemId ?? "—"}`).join(", ")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}