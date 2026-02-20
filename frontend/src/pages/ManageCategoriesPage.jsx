import { useState } from "react"
import { Link } from "react-router-dom"
import { Search, Plus, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCategories } from "@/contexts/CategoriesContext"

function slugFromName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export default function ManageCategoriesPage() {
  const { categories, addCategory, updateCategory, deleteCategory, ICON_OPTIONS } = useCategories()
  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState({ name: "", slug: "", iconName: "Box", itemType: "SUPPLY" })

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    setForm({ name: "", slug: "", iconName: "Box", itemType: "SUPPLY" })
    setAddOpen(true)
  }

  const openEdit = (cat) => {
    setEditingId(cat.id)
    setForm({ name: cat.name, slug: cat.slug, iconName: cat.iconName, itemType: cat.itemType || "SUPPLY" })
    setEditOpen(true)
  }

  const openDelete = (cat) => {
    setDeleteId(cat.id)
    setDeleteOpen(true)
  }

  const handleAdd = () => {
    if (!form.name.trim()) return
    addCategory({
      name: form.name.trim(),
      slug: form.slug.trim() || slugFromName(form.name),
      iconName: form.iconName,
      itemType: form.itemType || "SUPPLY",
    })
    setAddOpen(false)
  }

  const handleEdit = () => {
    if (!editingId || !form.name.trim()) return
    updateCategory(editingId, {
      name: form.name.trim(),
      slug: form.slug.trim() || slugFromName(form.name),
      iconName: form.iconName,
      itemType: form.itemType || "SUPPLY",
    })
    setEditOpen(false)
    setEditingId(null)
  }

  const handleDelete = () => {
    if (deleteId) {
      deleteCategory(deleteId)
      setDeleteOpen(false)
      setDeleteId(null)
    }
  }

  const updateSlugFromName = () => {
    setForm((f) => ({ ...f, slug: slugFromName(f.name) }))
  }

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
            Add, edit, or remove inventory categories.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openAdd}>
            <Plus className="size-4" />
            Add Category
          </Button>
          <Button asChild variant="outline">
            <Link to="/items">Back to categories</Link>
          </Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:px-6 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-sm flex-1">
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
        <div className="overflow-auto px-4 lg:px-6">
          <div className="overflow-hidden rounded-lg border">
            <Table className="table-fixed w-full">
              <colgroup>
                <col style={{ width: "4rem" }} />
                <col style={{ width: "auto" }} />
                <col style={{ width: "auto" }} />
                <col style={{ width: "7rem" }} />
                <col style={{ width: "8rem" }} />
                <col style={{ width: "8rem" }} />
              </colgroup>
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead className="px-3">#</TableHead>
                  <TableHead className="px-3">Name</TableHead>
                  <TableHead className="px-3">Slug</TableHead>
                  <TableHead className="px-3">Type</TableHead>
                  <TableHead className="px-3">Icon</TableHead>
                  <TableHead className="px-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No categories found. Add one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((cat, idx) => (
                    <TableRow key={cat.id}>
                      <TableCell className="px-3 py-2 font-medium">{idx + 1}</TableCell>
                      <TableCell className="px-3 py-2">{cat.name}</TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">{cat.slug}</TableCell>
                      <TableCell className="px-3 py-2">
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-700">
                          {(cat.itemType || "SUPPLY") === "ASSET" ? "Asset" : "Supply"}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-2">{cat.iconName}</TableCell>
                      <TableCell className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>
                            <Pencil className="size-4" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => openDelete(cat)}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>Create a new inventory category.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                onBlur={updateSlugFromName}
                placeholder="e.g. Office Supplies"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-slug">Slug (URL)</Label>
              <Input
                id="add-slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="e.g. office-supplies"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-type">Type</Label>
              <Select value={form.itemType} onValueChange={(v) => setForm((f) => ({ ...f, itemType: v }))}>
                <SelectTrigger id="add-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPPLY">Supply</SelectItem>
                  <SelectItem value="ASSET">Asset / Property</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-icon">Icon</Label>
              <Select value={form.iconName} onValueChange={(v) => setForm((f) => ({ ...f, iconName: v }))}>
                <SelectTrigger id="add-icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
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
            <Button onClick={handleAdd} disabled={!form.name.trim()}>
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update the category details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                onBlur={updateSlugFromName}
                placeholder="e.g. Office Supplies"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug (URL)</Label>
              <Input
                id="edit-slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="e.g. office-supplies"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select value={form.itemType} onValueChange={(v) => setForm((f) => ({ ...f, itemType: v }))}>
                <SelectTrigger id="edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPPLY">Supply</SelectItem>
                  <SelectItem value="ASSET">Asset / Property</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-icon">Icon</Label>
              <Select value={form.iconName} onValueChange={(v) => setForm((f) => ({ ...f, iconName: v }))}>
                <SelectTrigger id="edit-icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!form.name.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? Items in this category may need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
