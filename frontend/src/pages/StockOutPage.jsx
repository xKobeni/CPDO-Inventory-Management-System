import { useState, useEffect, useCallback } from "react"
import { Search } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { transactionsService } from "@/services"

export default function StockOutPage() {
  const [transactions, setTransactions] = useState([])
  const [txLoading, setTxLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true)
    setError(null)
    try {
      const data = await transactionsService.listTransactions({ type: "ISSUANCE" })
      setTransactions(data)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load records.")
      setTransactions([])
    } finally {
      setTxLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const outToday = transactions.filter((t) => {
    const d = t.createdAt ? new Date(t.createdAt) : null
    if (!d) return false
    const today = new Date()
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  }).length
  const outMonth = transactions.filter((t) => {
    const d = t.createdAt ? new Date(t.createdAt) : null
    if (!d) return false
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const filteredTx = transactions.filter((t) => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    const by = (t.createdBy?.name ?? "").toLowerCase()
    const office = (t.issuedToOffice ?? "").toLowerCase()
    const person = (t.issuedToPerson ?? "").toLowerCase()
    const itemNames = (t.items ?? []).map((i) => (i.itemId?.name ?? "").toLowerCase()).join(" ")
    return by.includes(s) || office.includes(s) || person.includes(s) || itemNames.includes(s)
  })

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
                <BreadcrumbPage>Stock Out</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="mt-2 truncate text-xl font-semibold tracking-tight text-zinc-900">
            Stock Out
          </h1>
          <p className="text-sm text-muted-foreground">
            View supply release history. Record new releases on the Issuance page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/issuance">Record stock out (Issuance)</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/stock/in">Stock In</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/items">View inventory</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="@container/main grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Today Released</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{outToday}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>This Month</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{outMonth}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Stock Out</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{transactions.length}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record stock out</CardTitle>
            <CardDescription>
              Supply releases are recorded on the Issuance page. Use the button below to add a new issuance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/issuance">Go to Issuance</Link>
            </Button>
          </CardContent>
        </Card>

        <section className="lg:col-span-2 min-w-0 overflow-hidden rounded-xl border bg-white">
          <div className="flex flex-col gap-3 border-b px-4 py-3 lg:px-6 md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search records..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full min-w-0 overflow-x-auto px-4 lg:px-6">
            <div className="inline-block min-w-full rounded-lg border">
              <Table className="w-max min-w-full table-auto">
                <TableHeader className="bg-muted sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="px-3 whitespace-nowrap">Date</TableHead>
                    <TableHead className="px-3 whitespace-nowrap">Items</TableHead>
                    <TableHead className="px-3 whitespace-nowrap">Department</TableHead>
                    <TableHead className="px-3 whitespace-nowrap">Released By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filteredTx.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                        No stock-out records yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTx.map((tx) => (
                      <TableRow key={tx._id}>
                        <TableCell className="px-3 tabular-nums">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell className="px-3 text-sm">
                          {(tx.items ?? []).map((i) => `${i.qty}× ${i.itemId?.name ?? "—"}`).join(", ")}
                        </TableCell>
                        <TableCell className="px-3">{tx.issuedToOffice ?? "—"}</TableCell>
                        <TableCell className="px-3">{tx.createdBy?.name ?? "—"}</TableCell>
                      </TableRow>
                    ))
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
