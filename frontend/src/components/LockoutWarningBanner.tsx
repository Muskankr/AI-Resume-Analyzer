import React, { useState, useEffect } from 'react'
import { loginRateLimiter, LockoutState } from '../services/loginRateLimiter'
import './LockoutWarningBanner.css'

interface LockoutWarningBannerProps {
  identifier: string
  onUnlocked?: () => void
}

export const LockoutWarningBanner: React.FC<LockoutWarningBannerProps> = ({
  identifier,
  onUnlocked,
}) => {
  const [lockoutState, setLockoutState] = useState<LockoutState>(() =>
    loginRateLimiter.getLockoutState(identifier)
  )
  const [unlockInput, setUnlockInput] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [showTokenForm, setShowTokenForm] = useState(false)

  useEffect(() => {
    setLockoutState(loginRateLimiter.getLockoutState(identifier))

    const timer = setInterval(() => {
      setLockoutState(loginRateLimiter.getLockoutState(identifier))
    }, 1000)

    const unsubscribe = loginRateLimiter.subscribe(() => {
      setLockoutState(loginRateLimiter.getLockoutState(identifier))
    })

    return () => {
      clearInterval(timer)
      unsubscribe()
    }
  }, [identifier])

  if (!lockoutState.isLocked && lockoutState.failedAttempts === 0) {
    return null
  }

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setUnlockError('')
    const success = loginRateLimiter.unlockWithToken(identifier, unlockInput)
    if (success) {
      setUnlockInput('')
      setShowTokenForm(false)
      if (onUnlocked) onUnlocked()
    } else {
      setUnlockError('Invalid unlock code. Please check your code and try again.')
    }
  }

  return (
    <div className={`lockout-banner ${lockoutState.isLocked ? 'locked' : 'warning'}`}>
      <div className="banner-content">
        <span className="banner-icon">{lockoutState.isLocked ? '🔒' : '⚠️'}</span>
        <div className="banner-text">
          <strong>
            {lockoutState.isLocked ? 'Account Temporarily Locked' : 'Security Warning'}
          </strong>
          <p>{lockoutState.message}</p>

          {lockoutState.isLocked && lockoutState.unlockToken && (
            <div className="demo-unlock-hint">
              <span className="hint-label">Demo Unlock Code:</span>{' '}
              <code className="token-code">{lockoutState.unlockToken}</code>
            </div>
          )}
        </div>
      </div>

      {lockoutState.isLocked && (
        <div className="banner-actions">
          {!showTokenForm ? (
            <button
              type="button"
              className="btn-unlock-toggle"
              onClick={() => setShowTokenForm(true)}
            >
              Enter Unlock Code
            </button>
          ) : (
            <form onSubmit={handleUnlockSubmit} className="unlock-token-form">
              <input
                type="text"
                placeholder="6-digit code..."
                value={unlockInput}
                onChange={(e) => setUnlockInput(e.target.value)}
                maxLength={6}
              />
              <button type="submit" className="btn-submit-unlock">
                Unlock
              </button>
              <button
                type="button"
                className="btn-cancel-unlock"
                onClick={() => setShowTokenForm(false)}
              >
                Cancel
              </button>
            </form>
          )}
          {unlockError && <p className="unlock-error-msg">{unlockError}</p>}
        </div>
      )}
    </div>
  )
}
