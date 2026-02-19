import { ArrowUpFromLine, AlertCircle } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function StockOutPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900">
            Stock Out
          </h1>
          <p className="text-sm text-muted-foreground">
            Record and monitor outgoing inventory items.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/stock/in">Stock In</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/items">View inventory</Link>
          </Button>
        </div>
      </div>

      <section className="@container/main grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Today Released</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">8</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>This Month</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">54</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Stock Out</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">980</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Stock Out Entry</CardTitle>
            <CardDescription>Record released items from inventory</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-out">Item Name</Label>
              <Input id="item-out" placeholder="Item Name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qty-out">Quantity</Label>
              <Input id="qty-out" type="number" placeholder="Quantity" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-out">Requested By / Department</Label>
              <Input id="dept-out" placeholder="Requested By / Department" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-out">Date</Label>
              <Input id="date-out" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks-out">Purpose / Remarks</Label>
              <Textarea id="remarks-out" placeholder="Purpose / Remarks" />
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>Ensure available stock is sufficient before releasing items.</span>
            </div>
            <Button className="w-full">Save Stock Out</Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 overflow-hidden rounded-xl border bg-white">
          <div className="border-b px-4 py-3 lg:px-6">
            <h2 className="text-sm font-semibold text-zinc-900">Recent Stock Out Records</h2>
            <p className="text-xs text-muted-foreground">Latest released items</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Released By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">#101</TableCell>
                  <TableCell>Dell Monitor</TableCell>
                  <TableCell>2</TableCell>
                  <TableCell>Planning Dept.</TableCell>
                  <TableCell>Feb 18, 2026</TableCell>
                  <TableCell>Admin</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">#102</TableCell>
                  <TableCell>Office Chair</TableCell>
                  <TableCell>1</TableCell>
                  <TableCell>Engineering</TableCell>
                  <TableCell>Feb 17, 2026</TableCell>
                  <TableCell>Staff</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">#103</TableCell>
                  <TableCell>Printer Ink</TableCell>
                  <TableCell>5</TableCell>
                  <TableCell>Admin Office</TableCell>
                  <TableCell>Feb 16, 2026</TableCell>
                  <TableCell>Admin</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </section>
    </div>
  )
}
