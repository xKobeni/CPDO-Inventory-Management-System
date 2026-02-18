import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>CPDC Inventory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-600">
            shadcn/ui is installed and working.
          </p>
          <Button>Continue</Button>
        </CardContent>
      </Card>
    </div>
  )
}