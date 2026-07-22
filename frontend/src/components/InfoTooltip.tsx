import React, { useState, useRef, useEffect, useId } from 'react'
import { Info } from 'lucide-react'

interface InfoTooltipProps {
  content: string
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ content }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isClicked, setIsClicked] = useState(false)

  const isVisible = isHovered || isFocused || isClicked
  const tooltipRef = useRef<HTMLDivElement>(null)
  const tooltipId = useId()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsClicked(false)
      }
    }

    if (isClicked) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isClicked])

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsClicked(!isClicked)
  }

  return (
    <div
      className="custom-tooltip-wrapper"
      ref={tooltipRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false)
        setIsClicked(false)
      }}
    >
      <button
        type="button"
        className="custom-tooltip-trigger"
        onClick={handleToggle}
        aria-label="More information"
        aria-describedby={tooltipId}
        aria-expanded={isVisible}
      >
        <Info size={16} />
      </button>

      {isVisible && (
        <div id={tooltipId} role="tooltip" className="custom-tooltip-content">
          {content}
        </div>
      )}
    </div>
  )
}
