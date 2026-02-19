import { Link } from "react-router-dom"
import { Package, ArrowDownToLine, ArrowUpFromLine, ClipboardList } from "lucide-react"

import { SectionCards } from "@/components/section-cards"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import dashboardData from "@/app/dashboard/data.json"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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

      <section className="@container/main rounded-xl border bg-white py-2">
        <SectionCards />
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
            title="Issuance"
            description="Issue items to personnel"
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
          <p className="text-xs text-muted-foreground">Latest updates and entries (sample data for now).</p>
        </div>
        <DataTable data={dashboardData} />
      </section>
    </div>
  )
}