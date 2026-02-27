import { createContext, useState, useCallback } from "react"

const TutorialContext = createContext(null)

export function TutorialProvider({ children }) {
  const [isActive, setIsActive] = useState(false)
  const [steps, setSteps] = useState([])
  const [currentStep, setCurrentStep] = useState(0)
  const [pageId, setPageId] = useState(null)

  const startTutorial = useCallback((tutorialSteps, page) => {
    if (!tutorialSteps?.length) return
    setSteps(tutorialSteps)
    setCurrentStep(0)
    setPageId(page)
    setIsActive(true)
  }, [])

  const endTutorial = useCallback(() => {
    setIsActive(false)
    setSteps([])
    setCurrentStep(0)
    setPageId(null)
  }, [])

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev < steps.length - 1) {
        return prev + 1
      }
      // Last step, end tutorial
      endTutorial()
      return prev
    })
  }, [steps.length, endTutorial])

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }, [])

  const goToStep = useCallback((index) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStep(index)
    }
  }, [steps.length])

  const value = {
    isActive,
    steps,
    currentStep,
    currentStepData: steps[currentStep] || null,
    pageId,
    totalSteps: steps.length,
    startTutorial,
    endTutorial,
    nextStep,
    prevStep,
    goToStep,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,
  }

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  )
}

export default TutorialContext
