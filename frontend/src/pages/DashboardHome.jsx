
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import {
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Boxes,
  AlertTriangle,
  Users,
  TrendingDown,
  FileText,
  Activity,
  Cpu,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts"

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
import { peopleService } from "@/services"
import { itemsService } from "@/services"
import { getErrorMessage } from "@/utils/api"
import { FloatingHelpButton } from "@/components/HelpButton"
import { dashboardTutorialSteps } from "@/constants/tutorialSteps"

const CHART_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"]

function StatCard({ title, value, description, icon: Icon, variant = "default", href }) {
  const isAlert = variant === "danger" || variant === "warning"
  const bg =
    variant === "danger"
      ? "bg-red-50 border-red-200"
      : variant === "warning"
        ? "bg-amber-50 border-amber-200"
        : "bg-white border-zinc-200"
  const iconBg =
    variant === "danger"
      ? "bg-red-100 text-red-700"
      : variant === "warning"
        ? "bg-amber-100 text-amber-700"
        : "bg-zinc-100 text-zinc-700"
  const valueColor =
    variant === "danger"
      ? "text-red-700"
      : variant === "warning"
        ? "text-amber-700"
        : "text-zinc-900"

  const content = (
    <Card className={`overflow-hidden border transition-shadow hover:shadow-md ${bg}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-zinc-600">
          {title}
        </CardTitle>
        <div className={`rounded-lg p-2 ${iconBg}`}>
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold tabular-nums ${valueColor}`}>
          {value ?? "—"}
        </p>
        {description && (
          <p className="mt-1 text-xs text-zinc-500">{description}</p>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link to={href} className="block focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 rounded-xl">
        {content}
      </Link>
    )
  }
  return content
}

function QuickAction({ to, title, description, icon }) {
  const Icon = icon
  return (
    <Card className="bg-white transition-shadow hover:shadow-md border-zinc-200">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="grid size-10 place-items-center rounded-xl bg-zinc-900 text-white">
          <Icon className="size-5" />
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

function TransactionsChart({ data }) {
  // Fill missing days with 0 for last 14 days
  const days = 14
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const map = new Map((data || []).map((d) => [d.date, d.count]))
  const chartData = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    chartData.push({ date: key, count: map.get(key) ?? 0 })
  }

  return (
    <Card className="bg-white border-zinc-200">
      <CardHeader>
        <CardTitle className="text-base">Transactions (last 14 days)</CardTitle>
        <CardDescription>Daily transaction count</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f172a" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => {
                  const d = new Date(v)
                  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                }}
                className="text-xs fill-zinc-500"
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={24} className="text-xs fill-zinc-500" />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }}
                labelFormatter={(v) => new Date(v).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                formatter={(value) => [value, "Transactions"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#0f172a"
                strokeWidth={2}
                fill="url(#fillCount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function SuppliesByCategoryChart({ data }) {
  if (!data?.length) return null
  const chartData = data.map((d) => ({ name: d.category || "Uncategorized", count: d.count }))
  return (
    <Card className="bg-white border-zinc-200">
      <CardHeader>
        <CardTitle className="text-base">Supplies by category</CardTitle>
        <CardDescription>Item count per category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }}
                formatter={(value) => [value, "Items"]}
              />
              <Bar dataKey="count" fill="oklch(0.21 0.006 285.885)" radius={[0, 4, 4, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function AssetsByStatusChart({ data }) {
  if (!data?.length) return null
  const chartData = data.map((d) => ({ name: formatStatus(d.status), value: d.count }))
  return (
    <Card className="bg-white border-zinc-200">
      <CardHeader>
        <CardTitle className="text-base">Assets by status</CardTitle>
        <CardDescription>Distribution by status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }}
                formatter={(value) => [value, "Assets"]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function InventoryByCategoryLineChart({ data }) {
  // data: [{ category, count }]
  const chartData = Array.isArray(data) ? data.map((d) => ({ category: d.category || "Uncategorized", count: d.count || d.value || 0 })) : []
  return (
    <Card className="bg-white border-zinc-200">
      <CardHeader>
        <CardTitle className="text-base">Total inventory per category</CardTitle>
        <CardDescription>Items per category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[240px] w-full">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip formatter={(v) => [v, "Items"]} />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No category data</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ValueByCategoryPieChart({ data }) {
  const chartData = Array.isArray(data) ? data.map((d) => ({ name: d.category || d.name || "Uncategorized", value: Number(d.value ?? d.count ?? 0) })) : []
  return (
    <Card className="bg-white border-zinc-200">
      <CardHeader>
        <CardTitle className="text-base">Value breakdown by category</CardTitle>
        <CardDescription>Monetary value distribution</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[240px] w-full">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name">
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v, "Value"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No value data</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function SupplyMovementsChart({ data }) {
  // Fill missing days with 0 for last 14 days
  const days = 14
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const map = new Map((data || []).map((d) => [d.date, { stockIn: d.stockIn || 0, stockOut: d.stockOut || 0 }]))
  const chartData = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const dayData = map.get(key) || { stockIn: 0, stockOut: 0 }
    chartData.push({ date: key, stockIn: dayData.stockIn, stockOut: dayData.stockOut })
  }

  return (
    <Card className="bg-white border-zinc-200">
      <CardHeader>
        <CardTitle className="text-base">Supply Movements (last 14 days)</CardTitle>
        <CardDescription>Daily stock in vs stock out transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => {
                  const d = new Date(v)
                  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                }}
                className="text-xs fill-zinc-500"
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8} 
                width={30} 
                className="text-xs fill-zinc-500"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }}
                labelFormatter={(v) => new Date(v).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              />
              <Legend 
                wrapperStyle={{ paddingTop: "10px" }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="stockIn"
                name="Stock In"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="stockOut"
                name="Stock Out"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: "#ef4444", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function formatStatus(s) {
  if (!s) return "—"
  return String(s)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
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
    return () => {
      cancelled = true
    }
  }, [])

  const kpis = summary?.kpis ?? {}
  const charts = summary?.charts ?? {}
  const recentActivity = summary?.previews?.recentActivity ?? []

  const [peopleCounts, setPeopleCounts] = useState({ total: null, active: null, inactive: null })
  const [peopleLoading, setPeopleLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setPeopleLoading(true)
    peopleService
      .listPeople()
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : []
        const total = list.length
        const active = list.filter((p) => p?.isActive !== false).length
        const inactive = total - active
        setPeopleCounts({ total, active, inactive })
      })
      .catch(() => {
        if (!cancelled) setPeopleCounts({ total: 0, active: 0, inactive: 0 })
      })
      .finally(() => {
        if (!cancelled) setPeopleLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 pb-8">
      {/* Floating Help Button for Tutorial */}
      <FloatingHelpButton steps={dashboardTutorialSteps} pageId="dashboard" />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between" data-tutorial="dashboard-header">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-zinc-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Overview of inventory, stock levels, and recent activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild data-tutorial="view-inventory-btn">
            <Link to="/items">View inventory</Link>
          </Button>
          <Button asChild variant="outline" data-tutorial="reports-btn">
            <Link to="/reports">Reports</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5" data-tutorial="kpi-cards">
        <div data-tutorial="total-items-card">
          <StatCard
            title="Total items"
            value={loading ? "…" : kpis.activeItems}
            description="Active supplies + assets"
            icon={Boxes}
          />
        </div>
        <div data-tutorial="supplies-card">
          <StatCard
            title="Supplies"
            value={loading ? "…" : kpis.totalSupplies}
            description="Consumable items"
            icon={Package}
          />
        </div>
        <div data-tutorial="assets-card">
          <StatCard
            title="Assets"
            value={loading ? "…" : kpis.totalAssets}
            description={`${kpis.deployedAssets ?? 0} deployed`}
            icon={Cpu}
          />
        </div>
        <div data-tutorial="out-of-stock-card">
          <StatCard
            title="Out of stock"
            value={loading ? "…" : kpis.outOfStockCount}
            description="Supplies with zero quantity"
            icon={AlertTriangle}
            variant="danger"
            href="/items/out-of-stock"
          />
        </div>
        <div data-tutorial="low-stock-card">
          <StatCard
            title="Low stock"
            value={loading ? "…" : kpis.lowStockCount}
            description="At or below reorder level"
            icon={TrendingDown}
            variant="warning"
            href="/items/low-stock"
          />
        </div>
      </section>

      {/* People + Transactions + Supply movements */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-tutorial="people-stats">
        <div className="space-y-4">
          <StatCard
            title="People — Total"
            value={peopleLoading ? "…" : peopleCounts.total}
            description="All registered people"
            icon={Users}
            href="/users"
          />
          <StatCard
            title="Transactions today"
            value={loading ? "…" : kpis.txToday}
            description="Recorded today"
            icon={Activity}
          />
          <StatCard
            title="This month"
            value={loading ? "…" : kpis.txThisMonth}
            description="Total this month"
            icon={FileText}
          />
        </div>
        <div>
          <SupplyMovementsChart data={charts?.supplyMovementsByDay || []} />
        </div>
      </section>

      {/* Charts + Quick actions */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12" data-tutorial="charts-section">
        <div className="space-y-6 lg:col-span-12">
          <TransactionsChart data={charts.transactionsByDay} />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <InventoryByCategoryLineChart data={charts?.allItemsByCategory || []} />
            <ValueByCategoryPieChart data={charts?.valueByCategory || []} />
          </div>
        </div>
      </section>

      {/* Recent activity */}
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white" data-tutorial="recent-activity">
        <div className="border-b border-zinc-200 px-4 py-4 lg:px-6">
          <h2 className="text-lg font-semibold text-zinc-900">Recent activity</h2>
          <p className="text-sm text-zinc-500">
            Transactions and audit logs {loading ? "(loading…)" : ""}
          </p>
        </div>
        {loading ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-500">Loading…</div>
        ) : recentActivity.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-500">No recent activity.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-200 hover:bg-transparent">
                  <TableHead className="font-medium">Type</TableHead>
                  <TableHead className="font-medium">Date</TableHead>
                  <TableHead className="font-medium">By</TableHead>
                  <TableHead className="font-medium">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((item, idx) => {
                  const isTransaction = item._itemType === "transaction"
                  return (
                    <TableRow key={`${item._itemType}-${item._id}-${idx}`} className="border-zinc-100">
                      <TableCell className="font-medium">
                        {isTransaction ? item.type : item.action}
                      </TableCell>
                      <TableCell className="tabular-nums text-zinc-600">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>
                        {isTransaction ? (item.createdBy?.name ?? "—") : (item.actorId?.name ?? "—")}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-500">
                        {isTransaction ? (
                          item.items?.length
                            ? item.items.map((i) => `${i.qty}× ${i.itemId?.name ?? i.itemId ?? "—"}`).join(", ")
                            : "—"
                        ) : (
                          <span className="text-xs">
                            {item.targetType} {item.targetId ? `(${item.targetId.slice(0, 8)}...)` : ""} — {item.meta ? JSON.stringify(item.meta).slice(0, 50) : ""}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
