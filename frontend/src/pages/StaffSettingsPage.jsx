import { useState, useEffect } from "react"
import { User, Shield, Bell, ClipboardList } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { authService } from "@/services"
import { getErrorMessage } from "@/utils/api"
import { getAuth, setAuth } from "@/lib/auth"

export default function StaffSettingsPage() {
  const navigate = useNavigate()
  const auth = getAuth()
  
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const [notifications, setNotifications] = useState({
    emailOnLowStock: true,
    emailOnOutOfStock: true,
    emailOnTransactions: false,
    emailWeeklySummary: true,
  })
  const [savingNotifications, setSavingNotifications] = useState(false)

  const [preferences, setPreferences] = useState({
    defaultView: "grid",
    showInactiveItems: false,
    sortBy: "name",
  })
  const [savingPreferences, setSavingPreferences] = useState(false)

  useEffect(() => {
    fetchProfile()
    loadSettings()
  }, [])

  async function fetchProfile() {
    setLoading(true)
    try {
      const data = await authService.getMe()
      setProfile(data)
      setName(data.name)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function loadSettings() {
    try {
      // Get settings from localStorage for now
      const savedNotifications = localStorage.getItem("staffNotifications")
      const savedPreferences = localStorage.getItem("staffPreferences")
      
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications))
      }
      if (savedPreferences) {
        setPreferences(JSON.parse(savedPreferences))
      }
    } catch (err) {
      console.error("Failed to load settings:", err)
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Name is required")
      return
    }
    setSavingProfile(true)
    try {
      const updated = await authService.updateProfile({ name: name.trim() })
      setProfile({ ...profile, name: updated.name })
      setAuth({ token: auth?.token, user: { ...auth?.user, name: updated.name } })
      toast.success("Profile updated successfully")
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (!currentPassword || !newPassword) {
      toast.error("Please fill in all password fields")
      return
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    setChangingPassword(true)
    try {
      await authService.changePassword({ currentPassword, newPassword })
      toast.success("Password changed successfully. Please log in again.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => {
        navigate("/login")
      }, 2000)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setChangingPassword(false)
    }
  }

  async function handleSaveNotifications(e) {
    e.preventDefault()
    setSavingNotifications(true)
    try {
      localStorage.setItem("staffNotifications", JSON.stringify(notifications))
      toast.success("Notification preferences saved")
    } catch {
      toast.error("Failed to save notification preferences")
    } finally {
      setSavingNotifications(false)
    }
  }

  async function handleSavePreferences(e) {
    e.preventDefault()
    setSavingPreferences(true)
    try {
      localStorage.setItem("staffPreferences", JSON.stringify(preferences))
      toast.success("Preferences saved")
    } catch {
      toast.error("Failed to save preferences")
    } finally {
      setSavingPreferences(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", year: "numeric" })
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900">
            Staff Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your account, security, and preferences.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>

      <section className="@container/main grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Account</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {profile?.isActive ? "Active" : "Inactive"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Member Since</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatDate(profile?.createdAt)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Role</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums capitalize">
              {profile?.role?.toLowerCase() || "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Account Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4" />
              Account
            </CardTitle>
            <CardDescription>Update your profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full-name">Full Name</Label>
                <Input 
                  id="full-name" 
                  placeholder="Full Name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={profile?.email || ""} 
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="size-4" />
              Security
            </CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input 
                  id="current-password" 
                  type="password" 
                  placeholder="Current Password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input 
                  id="new-password" 
                  type="password" 
                  placeholder="New Password (min. 8 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input 
                  id="confirm-password" 
                  type="password" 
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-4" />
              Notifications
            </CardTitle>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveNotifications} className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="low-stock"
                    checked={notifications.emailOnLowStock}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, emailOnLowStock: checked })
                    }
                  />
                  <Label htmlFor="low-stock" className="font-normal cursor-pointer">
                    Email alerts for low stock items
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="out-of-stock"
                    checked={notifications.emailOnOutOfStock}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, emailOnOutOfStock: checked })
                    }
                  />
                  <Label htmlFor="out-of-stock" className="font-normal cursor-pointer">
                    Email alerts for out-of-stock items
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="transactions"
                    checked={notifications.emailOnTransactions}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, emailOnTransactions: checked })
                    }
                  />
                  <Label htmlFor="transactions" className="font-normal cursor-pointer">
                    Email on transaction approvals
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="summary"
                    checked={notifications.emailWeeklySummary}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, emailWeeklySummary: checked })
                    }
                  />
                  <Label htmlFor="summary" className="font-normal cursor-pointer">
                    Weekly summary report
                  </Label>
                </div>
              </div>
              <Button type="submit" disabled={savingNotifications}>
                {savingNotifications ? "Saving..." : "Save Preferences"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4" />
              Display Preferences
            </CardTitle>
            <CardDescription>Customize how you view inventory data</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePreferences} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="default-view">Default View</Label>
                <select
                  id="default-view"
                  value={preferences.defaultView}
                  onChange={(e) =>
                    setPreferences({ ...preferences, defaultView: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                >
                  <option value="grid">Grid View</option>
                  <option value="list">List View</option>
                  <option value="table">Table View</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort-by">Sort By Default</Label>
                <select
                  id="sort-by"
                  value={preferences.sortBy}
                  onChange={(e) =>
                    setPreferences({ ...preferences, sortBy: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="quantity">Quantity (Low to High)</option>
                  <option value="updated">Recently Updated</option>
                  <option value="category">Category</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="show-inactive"
                  checked={preferences.showInactiveItems}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, showInactiveItems: checked })
                  }
                />
                <Label htmlFor="show-inactive" className="font-normal cursor-pointer">
                  Show inactive items in lists
                </Label>
              </div>
              <Button type="submit" disabled={savingPreferences}>
                {savingPreferences ? "Saving..." : "Save Preferences"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
