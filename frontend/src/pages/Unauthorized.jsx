import { Link } from "react-router-dom"

export default function Unauthorized() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-md w-full rounded-lg border bg-white p-6">
        <h1 className="text-lg font-semibold">Unauthorized</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don’t have permission to view this page.
        </p>
        <Link className="mt-4 inline-block text-sm underline" to="/dashboard">
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}