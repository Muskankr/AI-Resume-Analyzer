import React, { useState, useEffect, useCallback, useRef } from 'react'

interface TourStep {
  target: string
  title: string
  content: string
}

const steps: TourStep[] = [
  {
    target: 'body', // We'll center this one specially
    title: 'Welcome!',
    content: "Welcome! Let's quickly explore the application.",
  },
  {
    target: '.role-selector-container',
    title: 'Target Career Track',
    content: 'Choose a career path before analysis to get tailored feedback.',
  },
  {
    target: '.upload-box',
    title: 'Resume Upload',
    content: 'Drag & drop or click to upload your resume here.',
  },
  {
    target: "[data-tour='history-link']",
    title: 'History',
    content: 'View your previous resume analyses here.',
  },
]

export const OnboardingTour: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenOnboarding')
    if (!hasSeen) {
      // Delay slightly to let the app render completely
      const timer = setTimeout(() => {
        setIsVisible(true)
        setWindowSize({ width: window.innerWidth, height: window.innerHeight })
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const updateTargetRect = useCallback(() => {
    if (!isVisible) return

    const step = steps[currentStep]
    if (step.target === 'body') {
      setTargetRect(null)
      return
    }

    const element = document.querySelector(step.target)
    if (element) {
      setTargetRect(element.getBoundingClientRect())
      // Optionally scroll the element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentStep, isVisible])

  useEffect(() => {
    updateTargetRect()

    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
      updateTargetRect()
    }

    const handleScroll = () => {
      updateTargetRect()
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true) // true to capture all scroll events

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [updateTargetRect])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isVisible) return
      if (e.key === 'Escape') {
        finishTour()
      } else if (e.key === 'Tab') {
        // Very basic focus trap
        if (!tooltipRef.current) return
        const focusableElements = tooltipRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus()
            e.preventDefault()
          }
        }
      }
    },
    [isVisible]
  )

  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      const focusableElements = tooltipRef.current.querySelectorAll('button')
      if (focusableElements.length > 0) {
        ;(focusableElements[focusableElements.length - 1] as HTMLElement).focus() // Focus Next/Finish by default
      }
    }
  }, [isVisible, currentStep])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const finishTour = () => {
    localStorage.setItem('hasSeenOnboarding', 'true')
    setIsVisible(false)
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      finishTour()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (!isVisible) return null

  const step = steps[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1

  // Calculate tooltip position
  let tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 9999,
  }

  if (targetRect) {
    const spaceBelow = windowSize.height - targetRect.bottom
    const spaceAbove = targetRect.top

    if (spaceBelow > 200 || spaceBelow > spaceAbove) {
      // Place below
      tooltipStyle = {
        position: 'fixed',
        top: targetRect.bottom + 16,
        left: Math.max(
          16,
          Math.min(targetRect.left + targetRect.width / 2 - 150, windowSize.width - 316)
        ),
        zIndex: 9999,
      }
    } else {
      // Place above
      tooltipStyle = {
        position: 'fixed',
        top: targetRect.top - 16,
        left: Math.max(
          16,
          Math.min(targetRect.left + targetRect.width / 2 - 150, windowSize.width - 316)
        ),
        transform: 'translateY(-100%)',
        zIndex: 9999,
      }
    }
  }

  return (
    <>
      {/* Background Mask */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {targetRect ? (
          <div
            style={{
              position: 'absolute',
              top: targetRect.top - 6,
              left: targetRect.left - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
              borderRadius: '8px',
              transition: 'all 0.3s ease',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              transition: 'all 0.3s ease',
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="tour-tooltip"
        style={{
          ...tooltipStyle,
          width: '300px',
          backgroundColor: 'var(--bg-card, #1e1e2f)',
          color: 'var(--text-color, #e2e8f0)',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
        role="dialog"
        aria-labelledby="tour-title"
        aria-describedby="tour-content"
      >
        <h3 id="tour-title" style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>
          {step.title}
        </h3>

        <p id="tour-content" style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>
          {step.content}
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '8px',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {currentStep + 1} of {steps.length}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isFirst && (
              <button
                onClick={prevStep}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Previous
              </button>
            )}
            <button
              onClick={nextStep}
              style={{
                padding: '6px 12px',
                background: '#6366f1',
                border: 'none',
                color: '#fff',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 'bold',
              }}
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '4px' }}>
          <button
            onClick={finishTour}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.8rem',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            Skip Tour
          </button>
        </div>
      </div>
    </>
  )
}
