import React, { useState } from 'react'
import { Lock, FileSignature, Loader2, Eye, EyeOff } from 'lucide-react'
import axios from 'axios'
import { CaptchaChallenge } from './components/CaptchaChallenge'

interface AuthModalProps {
  onSignup: (username: string, email: string, password: string, captchaToken?: string) => Promise<void>
  onLogin: (username: string, password: string, rememberMe: boolean, captchaToken?: string) => Promise<void>
  onClose: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSignup, onLogin, onClose }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password'>('login')
  const [rememberMe, setRememberMe] = useState(true)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (mode !== 'forgot_password' && !captchaToken) {
      setError('Please complete the security check before submitting.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'signup') {
        await onSignup(username, email, password, captchaToken)
        onClose()
      } else if (mode === 'login') {
        await onLogin(username, password, rememberMe, captchaToken)
        onClose()
      } else if (mode === 'forgot_password') {
        // Was hardcoded to http://localhost:8000, so "forgot password" only
        // ever worked on a developer's own machine.
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'
        await axios.post(`${backendUrl}/api/password-reset/`, { username })
        onClose()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="auth-modal-title">
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
          {mode === 'forgot_password' && (
            <input
              id="auth-forgot-username"
              name="username"
              className="auth-input"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
            />
          )}
          {mode !== 'forgot_password' && (
            <>
              <input
                id="auth-username"
                name="username"
                className="auth-input"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
              />
              {mode === 'signup' && (
                <input
                  className="auth-input"
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              )}
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  id="auth-password"
                  name="password"
                  className="auth-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </>
          )}
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
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}
            >
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="rememberMe" style={{ fontSize: '0.9rem', color: '#666' }}>
                Remember me
              </label>
            </div>
          )}
          {mode !== 'forgot_password' && (
            <CaptchaChallenge onVerify={(token) => setCaptchaToken(token)} />
          )}
          <div style={{ textAlign: 'right', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => {
                setMode('forgot_password')
                setError('')
              }}
              style={{
                fontSize: '0.9rem',
                color: '#3b82f6',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Forgot password?
            </button>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-submit-btn" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={15} className="spin" /> Please wait...
              </>
            ) : mode === 'forgot_password' ? (
              'Send Reset Link'
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
