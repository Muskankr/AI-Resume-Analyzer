import React, { useState } from 'react'
import './SecurityCheckInput.css'

interface SecurityCheckInputProps {
  questionText?: string
  value: string
  onChange: (value: string) => void
  error?: string
  id?: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  onRefreshQuestion?: () => void
}

export const SecurityCheckInput: React.FC<SecurityCheckInputProps> = ({
  questionText = 'What is 5 + 3?',
  value,
  onChange,
  error,
  id = 'security-check-answer-input',
  label = 'Security Verification',
  placeholder = 'Answer security question',
  required = true,
  disabled = false,
  onRefreshQuestion,
}) => {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <div className={`security-check-field-group ${isFocused ? 'focused' : ''} ${error ? 'has-error' : ''}`}>
      <div className="security-check-label-row">
        <label htmlFor={id} className="security-check-label">
          <span className="shield-icon">🛡️</span> {label}
        </label>
        {onRefreshQuestion && (
          <button
            type="button"
            className="btn-refresh-question"
            onClick={onRefreshQuestion}
            title="Generate new question"
          >
            Refresh Challenge
          </button>
        )}
      </div>

      <div className="security-check-question-banner">
        <span className="question-badge">Puzzle:</span>
        <span className="question-prompt">{questionText}</span>
      </div>

      <div className="security-check-input-wrapper">
        <input
          type="text"
          id={id}
          className="security-check-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          required={required}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoComplete="off"
        />
      </div>

      {error && (
        <span id={`${id}-error`} className="security-check-error-text" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
