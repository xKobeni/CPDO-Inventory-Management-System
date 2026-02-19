import { ArrowDownToLine } from "lucide-react"
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

export default function StockInPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900">
            Stock In
          </h1>
          <p className="text-sm text-muted-foreground">
            Record and track incoming inventory items.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/stock/out">Stock Out</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/items">View inventory</Link>
          </Button>
        </div>
      </div>

      <section className="@container/main grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Today Entries</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">12</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>This Month</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">87</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Stock In</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">1,245</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Stock Entry</CardTitle>
            <CardDescription>Record incoming items to inventory</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-in">Item Name</Label>
              <Input id="item-in" placeholder="Item Name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qty-in">Quantity</Label>
              <Input id="qty-in" type="number" placeholder="Quantity" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-in">Supplier</Label>
              <Input id="supplier-in" placeholder="Supplier" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-in">Date</Label>
              <Input id="date-in" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks-in">Remarks (Optional)</Label>
              <Textarea id="remarks-in" placeholder="Remarks (Optional)" />
            </div>
            <Button className="w-full">Save Stock In</Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 overflow-hidden rounded-xl border bg-white">
          <div className="border-b px-4 py-3 lg:px-6">
            <h2 className="text-sm font-semibold text-zinc-900">Recent Stock In Records</h2>
            <p className="text-xs text-muted-foreground">Latest incoming entries</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Recorded By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">#001</TableCell>
                  <TableCell>Dell Monitor</TableCell>
                  <TableCell>10</TableCell>
                  <TableCell>Tech Supplies Co.</TableCell>
                  <TableCell>Feb 18, 2026</TableCell>
                  <TableCell>Admin</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">#002</TableCell>
                  <TableCell>Office Chair</TableCell>
                  <TableCell>5</TableCell>
                  <TableCell>Furniture Hub</TableCell>
                  <TableCell>Feb 17, 2026</TableCell>
                  <TableCell>Admin</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">#003</TableCell>
                  <TableCell>Printer Ink</TableCell>
                  <TableCell>25</TableCell>
                  <TableCell>Supply Depot</TableCell>
                  <TableCell>Feb 16, 2026</TableCell>
                  <TableCell>Staff</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </section>
    </div>
  )
}
