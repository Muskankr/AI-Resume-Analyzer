import React, { useState } from 'react'
import { Lock, FileSignature, Loader2, Eye, EyeOff } from 'lucide-react'
import axios from 'axios'
import { CaptchaChallenge } from './components/CaptchaChallenge'
import { Button } from './components/Button'

interface AuthModalProps {
  onSignup: (
    username: string,
    password: string,
    captchaToken?: string,
    captchaAnswer?: string
  ) => Promise<void>
  onLogin: (
    username: string,
    password: string,
    rememberMe: boolean,
    captchaToken?: string,
    captchaAnswer?: string
  ) => Promise<void>
  onOAuthLogin?: (provider: 'google' | 'github', payload?: any) => Promise<void>
  onClose: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onSignup,
  onLogin,
  onOAuthLogin,
  onClose,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password'>('login')
  const [rememberMe, setRememberMe] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [resendMessage, setResendMessage] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<{ state: 'idle' | 'loading' | 'available' | 'taken'; message: string }>({ state: 'idle', message: '' })

  React.useEffect(() => {
    if (mode !== 'signup' || !username.trim()) {
      setUsernameStatus({ state: 'idle', message: '' })
      return
    }

    const timer = setTimeout(async () => {
      setUsernameStatus({ state: 'loading', message: 'Checking...' })
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || ''
        const res = await fetch(`${backendUrl}/api/auth/check-availability?field=username&value=${encodeURIComponent(username.trim())}`)
        const data = await res.json()
        if (data.isAvailable) {
          setUsernameStatus({ state: 'available', message: '✓ Available' })
        } else {
          setUsernameStatus({ state: 'taken', message: '✖ Username is already taken.' })
        }
      } catch {
        setUsernameStatus({ state: 'idle', message: '' })
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [username, mode])

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setError('')
    setLoading(true)
    try {
      if (onOAuthLogin) {
        await onOAuthLogin(provider, { token: 'mock_oauth_token' })
        onClose()
      } else {
        // Direct backend call fallback
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'
        await axios.post(`${backendUrl}/api/auth/oauth/`, {
          provider,
          token: 'mock_oauth_token',
        })
        onClose()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `${provider} login failed`
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return
    setResendStatus('sending')
    setResendMessage('')
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'
      await axios.post(`${backendUrl}/api/auth/resend-verification/`, { email: unverifiedEmail })
      setResendStatus('success')
      setResendMessage('Verification email has been resent successfully!')
    } catch (err: any) {
      setResendStatus('error')
      setResendMessage(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          'Failed to resend verification email.'
      )
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setUnverifiedEmail('')
    setResendStatus('idle')
    setResendMessage('')

    // Both halves are required: the token is the server's signed challenge and
    // the answer is what gets checked against it.
    if (mode !== 'forgot_password' && (!captchaToken || !captchaAnswer)) {
      setError('Please complete the security check before submitting.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'signup') {
        await onSignup(username, password, captchaToken, captchaAnswer)
        onClose()
      } else if (mode === 'login') {
        await onLogin(username, password, rememberMe, captchaToken, captchaAnswer)
        onClose()
      } else if (mode === 'forgot_password') {
        // Was hardcoded to http://localhost:8000, so "forgot password" only
        // ever worked on a developer's own machine.
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'
        await axios.post(`${backendUrl}/api/password-reset/`, { username })
        onClose()
      }
    } catch (err: any) {
      let msg = 'Authentication failed'
      let emailVal = ''
      if (err.response?.data) {
        const data = err.response.data
        if (data.detail) {
          msg = data.detail
        } else if (data.error) {
          msg = data.error
        } else if (typeof data === 'string') {
          msg = data
        } else {
          const firstKey = Object.keys(data)[0]
          if (firstKey) {
            msg = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey]
          }
        }

        if (data.code === 'email_unverified' && data.email) {
          emailVal = data.email
        }
      } else if (err.message) {
        msg = err.message
      }
      setError(msg)
      setUnverifiedEmail(emailVal)
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
              {mode === 'signup' && usernameStatus.message && (
                <span className={`text-xs mt-1 font-semibold ${usernameStatus.state === 'available' ? 'text-green-500' : 'text-red-400'}`} style={{ display: 'block', fontSize: '0.8rem', marginTop: '4px', marginBottom: '8px', color: usernameStatus.state === 'available' ? '#22c55e' : '#ef4444' }}>
                  {usernameStatus.message}
                </span>
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
            <CaptchaChallenge
              onChange={(token, answer) => {
                setCaptchaToken(token)
                setCaptchaAnswer(answer)
              }}
            />
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

          {unverifiedEmail && (
            <div style={{ marginTop: '10px', marginBottom: '16px', textAlign: 'center' }}>
              {resendStatus === 'success' ? (
                <p style={{ color: 'var(--color-accent, #22c55e)', fontSize: '0.9rem', margin: 0 }}>
                  {resendMessage}
                </p>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={handleResendVerification}
                    disabled={resendStatus === 'sending'}
                    isLoading={resendStatus === 'sending'}
                  >
                    {resendStatus === 'sending'
                      ? 'Sending Verification Link...'
                      : 'Resend Verification Email'}
                  </Button>
                  {resendStatus === 'error' && (
                    <p
                      style={{
                        color: 'var(--color-danger, #ef4444)',
                        fontSize: '0.85rem',
                        marginTop: '6px',
                        margin: 0,
                      }}
                    >
                      {resendMessage}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {error && error.includes('locked') && (
            <div style={{ marginTop: '10px', marginBottom: '16px', textAlign: 'center' }}>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => {
                  setMode('forgot_password')
                  setError('')
                }}
              >
                Reset Password to Unlock
              </Button>
            </div>
          )}

          <Button
            className="auth-submit-btn"
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            isLoading={loading}
          >
            {loading
              ? 'Please wait...'
              : mode === 'forgot_password'
              ? 'Send Reset Link'
              : mode === 'login'
              ? 'Login'
              : 'Create Account'}
          </Button>
        </form>

        {mode !== 'forgot_password' && (
          <div className="auth-social-section">
            <div className="auth-divider">
              <span>or continue with</span>
            </div>
            <div className="auth-social-buttons">
              <Button
                variant="secondary"
                className="auth-social-btn auth-google-btn"
                aria-label="Continue with Google"
                onClick={() => handleSocialLogin('google')}
                disabled={loading}
                leftIcon={
                  <svg className="social-icon" viewBox="0 0 24 24" width="18" height="18">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                }
              >
                Google
              </Button>
              <Button
                variant="secondary"
                className="auth-social-btn auth-github-btn"
                aria-label="Continue with GitHub"
                onClick={() => handleSocialLogin('github')}
                disabled={loading}
                leftIcon={
                  <svg
                    className="social-icon"
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    />
                  </svg>
                }
              >
                GitHub
              </Button>
            </div>
          </div>
        )}
        <p className="auth-switch">
          {mode === 'login' ? 'No account? ' : 'Have an account? '}
          <Button
            variant="ghost"
            size="sm"
            className="auth-switch-btn"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError('')
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </Button>
        </p>
      </div>
    </div>
  )
}
