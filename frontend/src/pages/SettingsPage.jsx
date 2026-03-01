import { useState, useEffect } from "react"
import { User, Shield, Palette, Database, Download } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authService } from "@/services"
import { downloadBackupXlsx, downloadBackupJson, downloadBackupCsv } from "@/services/export.service"
import { getErrorMessage } from "@/utils/api"
import { getAuth, setAuth } from "@/lib/auth"
import { useTheme } from "@/contexts/ThemeContext"

export default function SettingsPage() {
  const navigate = useNavigate()
  const auth = getAuth()
  const { themeColor, setThemeColor } = useTheme()
  
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const [downloadingBackup, setDownloadingBackup] = useState(false)

  useEffect(() => {
    fetchProfile()
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
      // Update the local auth storage so the name updates everywhere
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
      // Clear password fields
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate("/login")
      }, 2000)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setChangingPassword(false)
    }
  }

  async function handleDownloadBackup(format) {
    setDownloadingBackup(true)
    try {
      let blob
      let filename
      
      if (format === "xlsx") {
        blob = await downloadBackupXlsx()
        filename = `cpdc_backup_${new Date().toISOString().slice(0, 10)}.xlsx`
      } else if (format === "json") {
        blob = await downloadBackupJson()
        filename = `cpdc_backup_${new Date().toISOString().slice(0, 10)}.json`
      } else if (format === "csv") {
        blob = await downloadBackupCsv()
        filename = `cpdc_backup_${new Date().toISOString().slice(0, 10)}.csv`
      }

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success(`Backup downloaded successfully as ${format.toUpperCase()}`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDownloadingBackup(false)
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
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your account and security settings.
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="size-4" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the system theme color</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="theme-color-select">System Color</Label>
              <Select value={themeColor} onValueChange={setThemeColor}>
                <SelectTrigger id="theme-color-select">
                  <SelectValue placeholder="Select theme color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="red">Red</SelectItem>
                  <SelectItem value="black">Black</SelectItem>
                  <SelectItem value="grey">Grey</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Changes the primary color across the entire system
              </p>
            </div>
          </CardContent>
        </Card>

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
      </section>

      <section className="grid grid-cols-1 gap-6">
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

      <section className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="size-4" />
              Data Backup & Export
            </CardTitle>
            <CardDescription>
              Download a complete backup of all system data including items, transactions, and audit logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm text-zinc-700 mb-4">
                  Choose a format to export all your data. The backup includes:
                </p>
                <ul className="text-sm text-zinc-600 space-y-1 ml-4 mb-4">
                  <li className="list-disc">All items (supplies and assets)</li>
                  <li className="list-disc">All transactions (stock-in, stock-out, issuance)</li>
                  <li className="list-disc">Complete audit log history</li>
                </ul>
                <p className="text-xs text-zinc-500">
                  💡 Backups are also created automatically every day at 4:00 PM and stored in the server.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => handleDownloadBackup("xlsx")}
                  disabled={downloadingBackup}
                  className="flex items-center gap-2"
                >
                  <Download className="size-4" />
                  {downloadingBackup ? "Downloading..." : "Excel (.xlsx)"}
                </Button>
                
                <Button
                  onClick={() => handleDownloadBackup("json")}
                  disabled={downloadingBackup}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="size-4" />
                  {downloadingBackup ? "Downloading..." : "JSON (.json)"}
                </Button>
                
                <Button
                  onClick={() => handleDownloadBackup("csv")}
                  disabled={downloadingBackup}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="size-4" />
                  {downloadingBackup ? "Downloading..." : "CSV (.csv)"}
                </Button>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-800">
                  <strong>Note:</strong> The backup file may be large depending on your data volume. 
                  Store it securely and use it for disaster recovery or data migration purposes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
