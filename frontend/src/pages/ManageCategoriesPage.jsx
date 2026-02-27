import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Search, RefreshCw, Plus, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCategories, slugFromName } from "@/contexts/CategoriesContext"
import { toast } from "sonner"
import { FloatingHelpButton } from "@/components/HelpButton"
import { manageCategoriesTutorialSteps } from "@/constants/tutorialSteps"

export default function ManageCategoriesPage() {
  const { categories, loading, error, refreshCategories, setIconOverride, ICON_MAP, ICON_OPTIONS } = useCategories()
  const [search, setSearch] = useState("")
  const navigate = useNavigate()

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [addForm, setAddForm] = useState({ name: "", itemType: "SUPPLY", iconName: "Box" })
  const [editIcon, setEditIcon] = useState("Box")

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.slug && c.slug.toLowerCase().includes(search.toLowerCase()))
  )

  const openAdd = () => {
    setAddForm({ name: "", itemType: "SUPPLY", iconName: "Box" })
    setAddOpen(true)
  }

  const handleAddSubmit = () => {
    const name = (addForm.name || "").trim()
    if (!name) {
      toast.error("Please enter a category name.")
      return
    }
    const slug = slugFromName(name) || "general"
    setAddOpen(false)
    navigate(`/items/category/${slug}`, { state: { newCategory: name, itemType: addForm.itemType } })
    toast.success("Add an item with this category to create it.")
  }

  const openEdit = (cat) => {
    setEditingCategory(cat)
    setEditIcon(cat.iconName || "Box")
    setEditOpen(true)
  }

  const handleEditSubmit = () => {
    if (!editingCategory) return
    setIconOverride(editingCategory.slug, editIcon)
    setEditOpen(false)
    setEditingCategory(null)
    toast.success("Category icon updated.")
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      {/* Floating Help Button for Tutorial */}
      <FloatingHelpButton steps={manageCategoriesTutorialSteps} pageId="manageCategories" />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between" data-tutorial="manage-header">
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
                <BreadcrumbLink asChild>
                  <Link to="/items">Inventories</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Manage Categories</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="mt-2 truncate text-xl font-semibold tracking-tight text-zinc-900">
            Manage Categories
          </h1>
          <p className="text-sm text-muted-foreground">
            Categories are derived from your inventory. Add a category below, then add an item in that category to create it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openAdd} data-tutorial="add-category-btn">
            <Plus className="size-4" />
            Add Category
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refreshCategories()?.then(() => toast.success("Categories refreshed."))?.catch(() => {})}
            disabled={loading}
            data-tutorial="refresh-categories-btn"
          >
            <RefreshCw className="size-4" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button asChild variant="outline">
            <Link to="/items">Back to categories</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}

      <section className="min-w-0 overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:px-6 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-sm flex-1" data-tutorial="categories-search">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-full min-w-0 overflow-x-auto px-4 lg:px-6" data-tutorial="categories-table">
          <div className="inline-block min-w-full rounded-lg border">
            <Table className="w-full table-auto">
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead className="px-3 whitespace-nowrap">#</TableHead>
                  <TableHead className="px-3 whitespace-nowrap">Name</TableHead>
                  <TableHead className="px-3 whitespace-nowrap">Slug</TableHead>
                  <TableHead className="px-3 whitespace-nowrap">Type</TableHead>
                  <TableHead className="px-3 whitespace-nowrap">Icon</TableHead>
                  <TableHead className="px-3 text-right whitespace-nowrap">Items</TableHead>
                  <TableHead className="px-3 w-12 whitespace-nowrap" data-tutorial="category-actions">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No categories yet. Add a category above, then add an item in that category to create it.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((cat, idx) => (
                    <TableRow
                      key={cat.id}
                      className="cursor-default transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="px-3 py-2 font-medium">{idx + 1}</TableCell>
                      <TableCell className="px-3 py-2">
                        <Link
                          to={`/items/category/${cat.slug}`}
                          className="font-medium text-zinc-900 hover:underline"
                        >
                          {cat.name}
                        </Link>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">{cat.slug}</TableCell>
                      <TableCell className="px-3 py-2">
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-700">
                          {(cat.itemType || "SUPPLY") === "ASSET" ? "Asset" : "Supply"}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-2">{cat.iconName}</TableCell>
                      <TableCell className="px-3 py-2 text-right tabular-nums">{cat.count ?? 0}</TableCell>
                      <TableCell className="px-3 py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-zinc-900"
                          onClick={() => openEdit(cat)}
                          aria-label={`Edit ${cat.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* Add Category Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>
              Enter a name and type. You will be taken to the category page to add the first item—the category is created when the first item is saved.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="add-name">Category name</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Office Supplies"
              />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={addForm.itemType}
                onValueChange={(v) => setAddForm((p) => ({ ...p, itemType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPPLY">Supply</SelectItem>
                  <SelectItem value="ASSET">Asset/Property</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Icon</Label>
              <Select
                value={addForm.iconName}
                onValueChange={(v) => setAddForm((p) => ({ ...p, iconName: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSubmit}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => !open && setEditOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Category name and type are determined by the items in this category. You can change the display icon.
            </DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={editingCategory.name} readOnly className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label>Slug</Label>
                <Input value={editingCategory.slug} readOnly className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label>Icon</Label>
                <Select value={editIcon} onValueChange={setEditIcon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((key) => (
                      <SelectItem key={key} value={key}>
                        {key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
