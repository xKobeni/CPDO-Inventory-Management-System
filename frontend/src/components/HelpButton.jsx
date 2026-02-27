import { HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTutorial } from "@/hooks/useTutorial"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function HelpButton({ steps, pageId, className }) {
  const { startTutorial, isActive } = useTutorial()

  const handleClick = () => {
    if (!isActive && steps?.length) {
      startTutorial(steps, pageId)
    }
  }

  if (!steps?.length) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={handleClick}
            className={className}
            aria-label="Start tutorial"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Start page tutorial</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Floating help button for fixed positioning
export function FloatingHelpButton({ steps, pageId }) {
  const { startTutorial, isActive } = useTutorial()

  const handleClick = () => {
    if (!isActive && steps?.length) {
      startTutorial(steps, pageId)
    }
  }

  if (!steps?.length) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size="icon"
            onClick={handleClick}
            className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-amber-500 hover:bg-amber-600 shadow-lg"
            aria-label="Start tutorial"
          >
            <HelpCircle className="h-6 w-6 text-white" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Need help? Start tutorial</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default HelpButton
