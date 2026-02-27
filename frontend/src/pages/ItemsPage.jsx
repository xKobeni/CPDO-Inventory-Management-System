import { useState } from "react"
import { Search } from "lucide-react"
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
import { FloatingHelpButton } from "@/components/HelpButton"
import { itemsPageTutorialSteps } from "@/constants/tutorialSteps"

export default function ItemsPage() {
  const { getCategoriesWithIcons, loading, error } = useCategories()
  const allManagedCategories = getCategoriesWithIcons()

  const [filterType, setFilterType] = useState(null) // null, "SUPPLY", or "ASSET"
  const [searchQuery, setSearchQuery] = useState("")

  const displayedCategories = allManagedCategories
    .filter((cat) => {
      if (filterType === "SUPPLY") return (cat.itemType || "SUPPLY") === "SUPPLY"
      if (filterType === "ASSET") return (cat.itemType || "SUPPLY") === "ASSET"
      return true
    })
    .filter((cat) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        cat.name.toLowerCase().includes(q) ||
        (cat.slug && cat.slug.toLowerCase().includes(q))
      )
    })

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      {/* Floating Help Button for Tutorial */}
      <FloatingHelpButton steps={itemsPageTutorialSteps} pageId="items" />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between" data-tutorial="items-header">
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
          <Button asChild variant="outline" data-tutorial="low-stock-btn">
            <Link to="/items/low-stock">Low stock</Link>
          </Button>
          <Button asChild variant="outline" data-tutorial="out-of-stock-btn">
            <Link to="/items/out-of-stock">Out of stock</Link>
          </Button>
          <Button asChild data-tutorial="manage-categories-btn">
            <Link to="/items/manage-categories">Manage Categories</Link>
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

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-col gap-4 border-b px-4 py-3 lg:px-6 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-sm flex-1" data-tutorial="categories-search">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search categories..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2" data-tutorial="category-filters">
            <Button
              variant={filterType === null ? "default" : "outline"}
              onClick={() => setFilterType(null)}
            >
              All
            </Button>
            <Button
              variant={filterType === "SUPPLY" ? "default" : "outline"}
              onClick={() => setFilterType("SUPPLY")}
            >
              Supply
            </Button>
            <Button
              variant={filterType === "ASSET" ? "default" : "outline"}
              onClick={() => setFilterType("ASSET")}
            >
              Asset/Property
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:p-6" data-tutorial="category-grid">
          {loading ? (
            <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
              Loading categories…
            </div>
          ) : displayedCategories.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center gap-4 py-12">
              <p className="text-center text-sm text-muted-foreground">
                No categories yet{filterType ? ` for ${filterType === "SUPPLY" ? "Supply" : "Asset/Property"}` : ""}. Categories are created when you add items.
              </p>
              <Button asChild>
                <Link to="/items/category/general">Add your first item</Link>
              </Button>
            </div>
          ) : (
            displayedCategories.map((category) => {
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
                      {(category.itemType === "SUPPLY" || category.itemType === "ASSET") && (
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-700">
                          {category.itemType === "ASSET" ? "Asset" : "Supply"}
                        </span>
                      )}
                    </CardHeader>
                  </Card>
                </Link>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
