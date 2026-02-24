import { useState, useEffect, useCallback } from "react"
import { Users, Search, MoreHorizontal, RefreshCw } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { usersService } from "@/services"
import { getErrorMessage } from "@/utils/api"

const ROLE_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: "ADMIN", label: "Admin" },
  { value: "STAFF", label: "Staff" },
  { value: "REQUESTER", label: "Requester" },
]
const ACTIVE_OPTIONS = [
  { value: "", label: "All" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
]

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [activeFilter, setActiveFilter] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetUser, setResetUser] = useState(null)
  const [actionConfirm, setActionConfirm] = useState(null) // { type: 'deactivate'|'activate', user }

  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", role: "STAFF" })
  const [editForm, setEditForm] = useState({ name: "", role: "STAFF", isActive: true })
  const [resetForm, setResetForm] = useState({ newPassword: "" })
  const [submitting, setSubmitting] = useState(false)

  const fetchUsers = useCallback(async (showToast = false) => {
    setLoading(true)
    setError(null)
    const params = {}
    if (search.trim()) params.q = search.trim()
    if (roleFilter && roleFilter !== "_") params.role = roleFilter
    if (activeFilter && activeFilter !== "_") params.active = activeFilter
    try {
      const data = await usersService.listUsers(params)
      setUsers(data)
      if (showToast) toast.success("Users refreshed.")
    } catch (err) {
      setError(getErrorMessage(err))
      setUsers([])
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, activeFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const total = users.length
  const admins = users.filter((u) => u.role === "ADMIN").length
  const staff = users.filter((u) => u.role === "STAFF").length
  const activeCount = users.filter((u) => u.isActive).length

  const handleAdd = async () => {
    if (!addForm.name?.trim() || !addForm.email?.trim() || !addForm.password?.trim()) {
      toast.error("Name, email, and password are required.")
      return
    }
    setSubmitting(true)
    try {
      await usersService.createUser({
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        password: addForm.password,
        role: addForm.role,
      })
      toast.success("User created. A verification email was sent—they must verify before signing in.")
      setAddOpen(false)
      setAddForm({ name: "", email: "", password: "", role: "STAFF" })
      fetchUsers()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editUser) return
    setSubmitting(true)
    try {
      await usersService.updateUser(editUser._id, {
        name: editForm.name?.trim() || editUser.name,
        role: editForm.role,
        isActive: editForm.isActive,
      })
      toast.success("User updated.")
      setEditOpen(false)
      setEditUser(null)
      fetchUsers()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetUser || !resetForm.newPassword?.trim()) {
      toast.error("Enter a new password.")
      return
    }
    setSubmitting(true)
    try {
      await usersService.resetPassword(resetUser._id, { newPassword: resetForm.newPassword })
      toast.success("Password reset.")
      setResetOpen(false)
      setResetUser(null)
      setResetForm({ newPassword: "" })
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeactivate = async () => {
    if (!actionConfirm?.user) return
    setSubmitting(true)
    try {
      await usersService.deactivateUser(actionConfirm.user._id)
      toast.success("User deactivated.")
      setActionConfirm(null)
      fetchUsers()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleActivate = async () => {
    if (!actionConfirm?.user) return
    setSubmitting(true)
    try {
      await usersService.activateUser(actionConfirm.user._id)
      toast.success("User activated.")
      setActionConfirm(null)
      fetchUsers()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (user) => {
    setEditUser(user)
    setEditForm({
      name: user.name ?? "",
      role: user.role ?? "STAFF",
      isActive: user.isActive !== false,
    })
    setEditOpen(true)
  }

  const openReset = (user) => {
    setResetUser(user)
    setResetForm({ newPassword: "" })
    setResetOpen(true)
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage system users and roles. (Admin Only)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchUsers(true)} disabled={loading}>
            <RefreshCw className="size-4" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button onClick={() => setAddOpen(true)}>Add User</Button>
          <Button asChild variant="outline">
            <Link to="/items">View inventory</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}

      <section className="@container/main grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Admins</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{admins}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Staff</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{staff}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active Users</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:px-6 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search users..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={roleFilter || "_"} onValueChange={(v) => setRoleFilter(v === "_" ? "" : v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value || "all"} value={o.value || "_"}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activeFilter || "_"} onValueChange={(v) => setActiveFilter(v === "_" ? "" : v)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVE_OPTIONS.map((o) => (
                  <SelectItem key={o.value || "all"} value={o.value || "_"}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No users match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <UserRow
                    key={user._id}
                    user={user}
                    onEdit={() => openEdit(user)}
                    onResetPassword={() => openReset(user)}
                    onDeactivate={() => setActionConfirm({ type: "deactivate", user })}
                    onActivate={() => setActionConfirm({ type: "activate", user })}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground lg:px-6">
          <p>Showing {users.length} user{users.length !== 1 ? "s" : ""}</p>
        </div>
      </section>

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>Create a new user account.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-password">Password</Label>
              <Input
                id="add-password"
                type="password"
                value={addForm.password}
                onChange={(e) => setAddForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Min 8 characters"
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select
                value={addForm.role}
                onValueChange={(v) => setAddForm((p) => ({ ...p, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="REQUESTER">Requester</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm((p) => ({ ...p, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="REQUESTER">Requester</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={editForm.isActive}
                onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetUser?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={resetForm.newPassword}
                onChange={(e) => setResetForm({ newPassword: e.target.value })}
                placeholder="Min 8 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={submitting || !resetForm.newPassword?.trim()}>
              {submitting ? "Resetting…" : "Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate / Activate confirm */}
      <AlertDialog
        open={!!actionConfirm}
        onOpenChange={(open) => !open && setActionConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionConfirm?.type === "deactivate" ? "Deactivate user?" : "Activate user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionConfirm?.type === "deactivate"
                ? `Deactivating ${actionConfirm?.user?.name ?? actionConfirm?.user?.email} will prevent them from logging in.`
                : `Reactivate ${actionConfirm?.user?.name ?? actionConfirm?.user?.email} so they can log in again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={actionConfirm?.type === "deactivate" ? handleDeactivate : handleActivate}
              disabled={submitting}
              className={actionConfirm?.type === "deactivate" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {submitting ? "…" : actionConfirm?.type === "deactivate" ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function UserRow({ user, onEdit, onResetPassword, onDeactivate, onActivate }) {
  const roleLabel = user.role === "ADMIN" ? "Admin" : user.role === "STAFF" ? "Staff" : user.role ?? "—"
  const status = user.isActive !== false ? "Active" : "Inactive"
  const created = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : "—"

  return (
    <TableRow>
      <TableCell className="font-medium">{user.name ?? "—"}</TableCell>
      <TableCell>{user.email ?? "—"}</TableCell>
      <TableCell>
        <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
          {roleLabel}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={
              status === "Active"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }
          >
            {status}
          </Badge>
          {user.isVerified === false && (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
              Unverified
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>{created}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={onResetPassword}>Reset password</DropdownMenuItem>
            {user.isActive !== false ? (
              <DropdownMenuItem onClick={onDeactivate} className="text-destructive">
                Deactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={onActivate}>Activate</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
