import React, { useState, useEffect } from 'react'
import { captchaService, CaptchaProvider } from '../services/captchaService'
import './CaptchaWidget.css'

interface CaptchaWidgetProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  provider?: CaptchaProvider
}

export const CaptchaWidget: React.FC<CaptchaWidgetProps> = ({
  onVerify,
  onExpire,
  provider = 'hcaptcha',
}) => {
  const [activeProvider, setActiveProvider] = useState<CaptchaProvider>(provider)
  const [verified, setVerified] = useState(false)

  // Fallback state
  const [fallbackChallenge, setFallbackChallenge] = useState<{
    challengeId: string
    question: string
    answer: number
  } | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (activeProvider === 'accessible_math') {
      const ch = captchaService.generateFallbackChallenge()
      setFallbackChallenge(ch)
    }
  }, [activeProvider])

  const refreshFallback = () => {
    const ch = captchaService.generateFallbackChallenge()
    setFallbackChallenge(ch)
    setUserAnswer('')
    setErrorMsg('')
    setVerified(false)
  }

  const handleFallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fallbackChallenge) return

    const parsed = parseInt(userAnswer.trim(), 10)
    if (isNaN(parsed)) {
      setErrorMsg('Please enter a valid numeric answer.')
      return
    }

    const isValid = captchaService.verifyFallbackAnswer(fallbackChallenge.challengeId, parsed)
    if (isValid) {
      setVerified(true)
      setErrorMsg('')
      onVerify(`demo-token-math-${fallbackChallenge.challengeId}`)
    } else {
      setErrorMsg('Incorrect answer. Please try again.')
      refreshFallback()
    }
  }

  const handleSimulatedHCaptchaClick = () => {
    const mockToken = `demo-token-hcaptcha-${Date.now()}`
    setVerified(true)
    onVerify(mockToken)
  }

  return (
    <div className="captcha-widget-container">
      <div className="captcha-header-row">
        <span className="captcha-badge">
          🛡️ Bot Protection ({activeProvider.toUpperCase()})
        </span>
        <button
          type="button"
          className="btn-switch-provider"
          onClick={() =>
            setActiveProvider((prev) =>
              prev === 'hcaptcha' ? 'accessible_math' : 'hcaptcha'
            )
          }
        >
          {activeProvider === 'hcaptcha' ? 'Accessibility Mode' : 'hCaptcha Mode'}
        </button>
      </div>

      {verified ? (
        <div className="captcha-verified-box">
          <span className="verified-icon">✓</span>
          <span className="verified-text">Security verification passed</span>
        </div>
      ) : activeProvider === 'hcaptcha' ? (
        <div className="hcaptcha-placeholder-box">
          <div className="hcaptcha-checkbox-row" onClick={handleSimulatedHCaptchaClick}>
            <div className="hcaptcha-checkbox">
              <span className="checkbox-inner"></span>
            </div>
            <span className="checkbox-label">I am human</span>
          </div>
          <div className="hcaptcha-branding">
            <span className="brand-logo">hCaptcha</span>
            <span className="brand-terms">Privacy • Terms</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleFallbackSubmit} className="captcha-fallback-form">
          <div className="math-question-row">
            <span className="math-icon">🔢</span>
            <label className="math-question-text">{fallbackChallenge?.question}</label>
            <button
              type="button"
              className="btn-refresh-math"
              onClick={refreshFallback}
              title="New math question"
            >
              🔄
            </button>
          </div>

          <div className="math-input-row">
            <input
              type="number"
              placeholder="Answer security question"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              className="math-answer-input"
              required
            />
            <button type="submit" className="btn-verify-math">
              Verify
            </button>
          </div>

          {errorMsg && <p className="captcha-error-text">{errorMsg}</p>}
        </form>
      )}
    </div>
  )
}
