import { ClipboardList } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function IssuancePage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900">
            Item Issuance
          </h1>
          <p className="text-sm text-muted-foreground">
            Assign and track issued inventory items.
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

      <section className="@container/main grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Active Issued Items</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">32</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Returned Items</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">18</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Overdue Returns</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums text-red-600">3</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4" />
              New Issuance
            </CardTitle>
            <CardDescription>Issue items to personnel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-issue">Item Name</Label>
              <Input id="item-issue" placeholder="Item Name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial-issue">Property / Serial Number</Label>
              <Input id="serial-issue" placeholder="Property / Serial Number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issued-to">Issued To (Employee Name)</Label>
              <Input id="issued-to" placeholder="Issued To (Employee Name)" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-issue">Department</Label>
              <Input id="dept-issue" placeholder="Department" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-issue">Date Issued</Label>
              <Input id="date-issue" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-date">Expected Return Date</Label>
              <Input id="return-date" type="date" placeholder="Expected Return Date" />
            </div>
            <Button className="w-full">Issue Item</Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 overflow-hidden rounded-xl border bg-white">
          <div className="border-b px-4 py-3 lg:px-6">
            <h2 className="text-sm font-semibold text-zinc-900">Active Issued Items</h2>
            <p className="text-xs text-muted-foreground">Items currently assigned to personnel</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Issued To</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date Issued</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">#201</TableCell>
                  <TableCell>Laptop - Dell Inspiron</TableCell>
                  <TableCell>Louis Marco Toque</TableCell>
                  <TableCell>Planning Dept.</TableCell>
                  <TableCell>Feb 16, 2026</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                      Active
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">#202</TableCell>
                  <TableCell>Office Chair</TableCell>
                  <TableCell>Adrian Perce</TableCell>
                  <TableCell>IT Department</TableCell>
                  <TableCell>Feb 18, 2026</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                      Pending Return
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">#203</TableCell>
                  <TableCell>Projector</TableCell>
                  <TableCell>Carlos Reyes</TableCell>
                  <TableCell>Admin Office</TableCell>
                  <TableCell>Jan 28, 2026</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                      Overdue
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </section>
    </div>
  )
}
