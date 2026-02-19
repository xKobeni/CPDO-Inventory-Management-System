import { Search, RefreshCw, Download } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function AuditLogsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900">
            Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground">
            Track system activities and user actions. (Admin Only)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="icon">
            <RefreshCw className="size-4" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button variant="outline" size="icon">
            <Download className="size-4" />
            <span className="sr-only">Download</span>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>

      <section className="@container/main grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total Logs</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">1,245</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Today Activities</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">18</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active Users Today</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">7</CardTitle>
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
            />
          </div>
          <div className="flex gap-2">
            <Select>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
                <SelectItem value="stock-in">Stock In</SelectItem>
                <SelectItem value="stock-out">Stock Out</SelectItem>
                <SelectItem value="issuance">Issuance</SelectItem>
                <SelectItem value="users">User Management</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="today">
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Today" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Log ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <LogRow
                id="#9001"
                user="Juan Dela Cruz"
                action="Added new inventory item"
                module="Inventory"
                date="Feb 18, 2026 - 10:32 AM"
                ip="192.168.1.12"
              />
              <LogRow
                id="#9002"
                user="Maria Santos"
                action="Issued Laptop to Engineering"
                module="Issuance"
                date="Feb 18, 2026 - 09:15 AM"
                ip="192.168.1.15"
              />
              <LogRow
                id="#9003"
                user="Admin"
                action="Updated user role"
                module="User Management"
                date="Feb 17, 2026 - 03:44 PM"
                ip="192.168.1.10"
              />
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground lg:px-6">
          <p>Showing 3 of 1,245 logs</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function LogRow({ id, user, action, module, date, ip }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{id}</TableCell>
      <TableCell>{user}</TableCell>
      <TableCell>{action}</TableCell>
      <TableCell>
        <Badge variant="secondary">{module}</Badge>
      </TableCell>
      <TableCell>{date}</TableCell>
      <TableCell>{ip}</TableCell>
    </TableRow>
  )
}
