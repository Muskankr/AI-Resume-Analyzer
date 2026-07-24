import React, { useState } from 'react'
import { Lock, FileSignature, Loader2 } from 'lucide-react'

interface AuthModalProps {
  onSignup: (username: string, password: string) => Promise<void>
  onLogin: (username: string, password: string, rememberMe: boolean) => Promise<void>
  onClose: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSignup, onLogin, onClose }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [rememberMe, setRememberMe] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') await onSignup(username, password)
      else await onLogin(username, password, rememberMe)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          {mode === 'login' ? (
            <>
              <Lock size={16} /> Login
            </>
          ) : (
            <>
              <FileSignature size={16} /> Sign Up
            </>
          )}
        </h3>
        <form onSubmit={submit}>
          <input
            className="auth-input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {mode === 'signup' &&
            password &&
            (() => {
              const hasMinLength = password.length >= 8
              const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password)
              const hasNumber = /[0-9]/.test(password)
              const hasSymbol = /[^A-Za-z0-9]/.test(password)

              let score = 0
              if (hasMinLength) score++
              if (hasMixedCase) score++
              if (hasNumber) score++
              if (hasSymbol) score++

              let strengthLabel = 'Weak'
              let strengthLevel = 'weak'
              let filledCount = 1

              if (password.length >= 6) {
                if (score <= 1) {
                  strengthLabel = 'Weak'
                  strengthLevel = 'weak'
                  filledCount = 1
                } else if (score <= 3) {
                  strengthLabel = 'Medium'
                  strengthLevel = 'medium'
                  filledCount = 2
                } else {
                  strengthLabel = 'Strong'
                  strengthLevel = 'strong'
                  filledCount = 3
                }
              }

              return (
                <div className="password-strength-container">
                  <div className="password-strength-label">
                    <span>Password Strength:</span>
                    <span className={`strength-val ${strengthLevel}`}>{strengthLabel}</span>
                  </div>
                  <div className="password-strength-bar-container">
                    <div
                      className={`password-strength-segment ${filledCount >= 1 ? `${strengthLevel}-filled` : ''}`}
                    />
                    <div
                      className={`password-strength-segment ${filledCount >= 2 ? `${strengthLevel}-filled` : ''}`}
                    />
                    <div
                      className={`password-strength-segment ${filledCount >= 3 ? `${strengthLevel}-filled` : ''}`}
                    />
                  </div>
                </div>
              )
            })()}
          {mode === 'login' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="rememberMe" style={{ fontSize: '0.9rem', color: '#666' }}>Remember me</label>
            </div>
          )}
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-submit-btn" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={15} className="spin" /> Please wait...
              </>
            ) : mode === 'login' ? (
              'Login'
            ) : (
              'Create Account'
            )}
          </button>
        </form>
        <p className="auth-switch">
          {mode === 'login' ? 'No account? ' : 'Have an account? '}
          <button
            className="auth-switch-btn"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError('')
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  )
}
