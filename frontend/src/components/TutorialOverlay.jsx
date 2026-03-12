import { useEffect, useState, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTutorial } from "@/hooks/useTutorial"
import { cn } from "@/lib/utils"

// Calculate optimal tooltip position based on element location
function calculatePosition(targetRect, tooltipRef, padding = 16) {
  if (!targetRect || !tooltipRef.current) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)", placement: "center" }
  }

  const tooltip = tooltipRef.current.getBoundingClientRect()
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  }

  const spaceAbove = targetRect.top
  const spaceBelow = viewport.height - targetRect.bottom
  const spaceLeft = targetRect.left
  const spaceRight = viewport.width - targetRect.right

  // Determine best placement
  let placement = "bottom"
  if (spaceBelow >= tooltip.height + padding) {
    placement = "bottom"
  } else if (spaceAbove >= tooltip.height + padding) {
    placement = "top"
  } else if (spaceRight >= tooltip.width + padding) {
    placement = "right"
  } else if (spaceLeft >= tooltip.width + padding) {
    placement = "left"
  }

  let top, left

  switch (placement) {
    case "top":
      top = targetRect.top - padding - 8
      left = targetRect.left + targetRect.width / 2
      break
    case "bottom":
      top = targetRect.bottom + padding + 8
      left = targetRect.left + targetRect.width / 2
      break
    case "left":
      top = targetRect.top + targetRect.height / 2
      left = targetRect.left - padding - 8
      break
    case "right":
      top = targetRect.top + targetRect.height / 2
      left = targetRect.right + padding + 8
      break
    default:
      top = viewport.height / 2
      left = viewport.width / 2
  }

  // Ensure tooltip stays within viewport
  const maxLeft = viewport.width - tooltip.width - padding
  const maxTop = viewport.height - tooltip.height - padding
  left = Math.max(padding, Math.min(left, maxLeft))
  top = Math.max(padding, Math.min(top, maxTop))

  return { top: `${top}px`, left: `${left}px`, placement }
}

function StepIndicator({ total, current, onGoToStep }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          onClick={() => onGoToStep(i)}
          className={cn(
            "h-2 w-2 rounded-full transition-all duration-200",
            i === current
              ? "bg-amber-500 w-4"
              : "bg-zinc-300 hover:bg-zinc-400"
          )}
          aria-label={`Go to step ${i + 1}`}
        />
      ))}
    </div>
  )
}

export function TutorialOverlay() {
  const {
    isActive,
    currentStepData,
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    goToStep,
    endTutorial,
    isFirstStep,
    isLastStep,
  } = useTutorial()

  const tooltipRef = useRef(null)
  const prevStepRef = useRef(currentStep)
  const [targetRect, setTargetRect] = useState(null)
  const [position, setPosition] = useState({ top: "50%", left: "50%", placement: "center" })
  const [isAnimating, setIsAnimating] = useState(false)

  // Target selector from current step
  const targetSelector = currentStepData?.target

  // Find and measure target element
  const updateTargetRect = useCallback(() => {
    if (!targetSelector) {
      setTargetRect(null)
      return
    }

    const element = document.querySelector(targetSelector)
    if (element) {
      const rect = element.getBoundingClientRect()
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right,
      })

      // Scroll element into view if needed
      const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight
      if (!isInView) {
        element.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    } else {
      setTargetRect(null)
    }
  }, [targetSelector])

  // Update position when target changes - combined effect
  useEffect(() => {
    if (!isActive) return

    // Check if step changed for animation
    const stepChanged = prevStepRef.current !== currentStep
    prevStepRef.current = currentStep

    // Trigger animation on step change
    if (stepChanged) {
      queueMicrotask(() => setIsAnimating(true))
    }

    const animationTimer = setTimeout(() => setIsAnimating(false), 200)
    
    // Delay the rect update to allow animation
    const rectTimer = setTimeout(() => {
      updateTargetRect()
    }, 50)

    // Update on scroll/resize
    const handleUpdate = () => updateTargetRect()
    window.addEventListener("scroll", handleUpdate, true)
    window.addEventListener("resize", handleUpdate)

    return () => {
      clearTimeout(animationTimer)
      clearTimeout(rectTimer)
      window.removeEventListener("scroll", handleUpdate, true)
      window.removeEventListener("resize", handleUpdate)
    }
  }, [isActive, currentStep, updateTargetRect])

  // Calculate tooltip position after rect is known
  useEffect(() => {
    if (targetRect && tooltipRef.current) {
      const pos = calculatePosition(targetRect, tooltipRef)
      setPosition(pos)
    }
  }, [targetRect])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e) => {
      switch (e.key) {
        case "Escape":
          endTutorial()
          break
        case "ArrowRight":
        case "Enter":
          nextStep()
          break
        case "ArrowLeft":
          prevStep()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isActive, nextStep, prevStep, endTutorial])

  if (!isActive) return null

  const highlightPadding = 8
  const highlightStyle = targetRect
    ? {
        top: targetRect.top - highlightPadding,
        left: targetRect.left - highlightPadding,
        width: targetRect.width + highlightPadding * 2,
        height: targetRect.height + highlightPadding * 2,
      }
    : null

  return createPortal(
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
      {/* Backdrop with spotlight cutout */}
      {!highlightStyle ? (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200" />
      ) : (
        <>
          {/* Top backdrop */}
          <div
            className="absolute left-0 right-0 bg-black/65 backdrop-blur-[2px]"
            style={{
              top: 0,
              height: Math.max(0, highlightStyle.top),
            }}
          />
          {/* Bottom backdrop */}
          <div
            className="absolute left-0 right-0 bottom-0 bg-black/65 backdrop-blur-[2px]"
            style={{
              top: highlightStyle.top + highlightStyle.height,
            }}
          />
          {/* Left backdrop */}
          <div
            className="absolute bg-black/65 backdrop-blur-[2px]"
            style={{
              top: highlightStyle.top,
              left: 0,
              width: Math.max(0, highlightStyle.left),
              height: highlightStyle.height,
            }}
          />
          {/* Right backdrop */}
          <div
            className="absolute bg-black/65 backdrop-blur-[2px]"
            style={{
              top: highlightStyle.top,
              left: highlightStyle.left + highlightStyle.width,
              right: 0,
              height: highlightStyle.height,
            }}
          />
          {/* Highlight border */}
          <div
            className="absolute rounded-lg transition-all duration-300 ease-out pointer-events-none"
            style={{
              ...highlightStyle,
              border: "2px solid #f59e0b",
              background: "transparent",
            }}
          />
        </>
      )}

      {/* Tooltip */}
        <div
          ref={tooltipRef}
          className={cn(
            "absolute z-[10000] max-w-sm rounded-xl bg-white p-5 shadow-2xl",
          "border border-zinc-200",
          "transition-all duration-200 ease-out",
          isAnimating && "opacity-0 scale-95"
        )}
        style={{
          top: position.top,
          left: position.left,
          transform: position.placement === "center" ? "translate(-50%, -50%)" : undefined,
        }}
      >
        {/* Close button */}
        <button
          onClick={endTutorial}
          className="absolute right-3 top-3 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          aria-label="Close tutorial"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Step indicator badge */}
        <div className="mb-3 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
          Step {currentStep + 1} of {totalSteps}
        </div>

        {/* Title */}
        {currentStepData?.title && (
          <h3 className="mb-2 text-lg font-semibold text-zinc-900">
            {currentStepData.title}
          </h3>
        )}

        {/* Description */}
        {currentStepData?.description && (
          <p className="mb-4 text-sm text-zinc-600">
            {currentStepData.description}
          </p>
        )}

        {/* Step dots */}
        <div className="mb-4">
          <StepIndicator total={totalSteps} current={currentStep} onGoToStep={goToStep} />
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={prevStep}
            disabled={isFirstStep}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={endTutorial}
            className="text-zinc-500"
          >
            Skip
          </Button>

          <Button
            size="sm"
            onClick={nextStep}
            className="gap-1 bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isLastStep ? "Finish" : "Next"}
            {!isLastStep && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default TutorialOverlay
