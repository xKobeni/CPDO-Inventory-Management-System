import { Search, RefreshCw } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useCategories } from "@/contexts/CategoriesContext"

export default function ItemsPage() {
  const { getCategoriesWithIcons } = useCategories()
  const categories = getCategoriesWithIcons()

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
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
                <BreadcrumbPage>Inventories</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="mt-2 truncate text-xl font-semibold tracking-tight text-zinc-900">
            Inventory Categories
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse and manage your inventory items by category. Click on any category to view its items.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="icon">
            <RefreshCw className="size-4" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button asChild>
            <Link to="/items/manage-categories">Manage Categories</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-col gap-4 border-b px-4 py-3 lg:px-6 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search categories..."
              className="pl-9"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:p-6">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <Link
                key={category.slug}
                to={`/items/category/${category.slug}`}
                className="block"
              >
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-col items-center justify-center gap-3">
                    <div className="grid size-12 place-items-center rounded-lg bg-zinc-100 text-zinc-600">
                      <Icon className="size-6" />
                    </div>
                    <CardTitle className="text-center text-base font-medium">
                      {category.name}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
