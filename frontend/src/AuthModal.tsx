import React, { useState, useEffect, useRef } from 'react'
import { Lock, FileSignature, Loader2, Eye, EyeOff, X, AlertCircle, CheckCircle2, ShieldCheck, Mail, ArrowLeft } from 'lucide-react'
import axios from 'axios'
import { CaptchaChallenge } from './components/CaptchaChallenge'
import { Button } from './components/Button'
import './components/AuthModal.css'

interface AuthModalProps {
  onSignup: (username: string, password: string, captchaToken?: string) => Promise<void>
  onLogin: (
    username: string,
    password: string,
    rememberMe: boolean,
    captchaToken?: string
  ) => Promise<void>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [resendMessage, setResendMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const modalRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  const [usernameStatus, setUsernameStatus] = useState<{
    state: 'idle' | 'loading' | 'available' | 'taken'
    message: string
  }>({ state: 'idle', message: '' })

  // Auto-focus first input when modal opens or mode changes
  useEffect(() => {
    const timer = setTimeout(() => {
      firstInputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [mode])

  // Username availability check for signup
  useEffect(() => {
    if (mode !== 'signup' || !username.trim()) {
      setUsernameStatus({ state: 'idle', message: '' })
      return
    }

    const timer = setTimeout(async () => {
      setUsernameStatus({ state: 'loading', message: 'Checking availability...' })
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || ''
        const res = await fetch(
          `${backendUrl}/api/auth/check-availability?field=username&value=${encodeURIComponent(username.trim())}`
        )
        const data = await res.json()
        if (data.isAvailable) {
          setUsernameStatus({ state: 'available', message: 'Username is available' })
        } else {
          setUsernameStatus({ state: 'taken', message: 'Username is already taken' })
        }
      } catch {
        setUsernameStatus({ state: 'idle', message: '' })
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [username, mode])

  // Focus trapping & Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          last.focus()
          e.preventDefault()
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus()
          e.preventDefault()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setError('')
    setLoading(true)
    try {
      if (onOAuthLogin) {
        await onOAuthLogin(provider, { token: 'mock_oauth_token' })
        onClose()
      } else {
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

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return
    setResendStatus('sending')
    setResendMessage('')
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'
      await axios.post(`${backendUrl}/api/auth/resend-verification/`, { email: unverifiedEmail })
      setResendStatus('success')
      setResendMessage('Verification email has been resent successfully!')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.')
      return
    }

    if (mode !== 'forgot_password' && !captchaToken) {
      setError('Please complete the security check before submitting.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'signup') {
        await onSignup(username, password, captchaToken)
        onClose()
      } else if (mode === 'login') {
        await onLogin(username, password, rememberMe, captchaToken)
        onClose()
      } else if (mode === 'forgot_password') {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'
        await axios.post(`${backendUrl}/api/password-reset/`, { username })
        onClose()
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const getPasswordStrength = () => {
    if (!password) return { score: 0, label: '', colorClass: '' }
    const hasMinLength = password.length >= 8
    const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSymbol = /[^A-Za-z0-9]/.test(password)

    let score = 0
    if (hasMinLength) score++
    if (hasMixedCase) score++
    if (hasNumber) score++
    if (hasSymbol) score++

    if (password.length < 6) {
      return { score: 1, label: 'Too short', colorClass: 'weak' }
    } else if (score <= 1) {
      return { score: 1, label: 'Weak', colorClass: 'weak' }
    } else if (score <= 3) {
      return { score: 2, label: 'Medium', colorClass: 'medium' }
    } else {
      return { score: 3, label: 'Strong', colorClass: 'strong' }
    }
  }

  const passwordStrength = getPasswordStrength()

  return (
    <div
      className="auth-modal-backdrop"
      onClick={onClose}
      role="presentation"
      data-testid="auth-modal-backdrop"
    >
      <div
        ref={modalRef}
        className="auth-modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-heading"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <button
          className="auth-modal-close-btn"
          onClick={onClose}
          aria-label="Close modal"
          type="button"
          disabled={loading}
        >
          <X size={18} />
        </button>

        <div className="auth-modal-header">
          <div className="auth-modal-badge">
            <ShieldCheck size={20} />
          </div>
          <h2 id="auth-modal-heading" className="auth-modal-title">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'signup' && 'Create Your Account'}
            {mode === 'forgot_password' && 'Reset Password'}
          </h2>
          <p className="auth-modal-subtitle">
            {mode === 'login' && 'Log in to access your saved resume analyses & insights'}
            {mode === 'signup' && 'Sign up to unlock ATS resume optimizations & score history'}
            {mode === 'forgot_password' && 'Enter your account username to reset your password'}
          </p>
        </div>

        {mode !== 'forgot_password' && (
          <div className="auth-modal-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`auth-modal-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login')
                setError('')
              }}
              disabled={loading}
            >
              <Lock size={15} /> Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={`auth-modal-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setMode('signup')
                setError('')
              }}
              disabled={loading}
            >
              <FileSignature size={15} /> Sign Up
            </button>
          </div>
        )}

        {mode === 'forgot_password' && (
          <button
            type="button"
            className="auth-back-link"
            onClick={() => {
              setMode('login')
              setError('')
            }}
            disabled={loading}
          >
            <ArrowLeft size={14} /> Back to Login
          </button>
        )}

        <form onSubmit={submit} className="auth-modal-form" noValidate>
          {error && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={18} className="auth-error-icon" />
              <div className="auth-error-content">
                <p className="auth-error-text">{error}</p>
              </div>
            </div>
          )}

          <div className="auth-form-group">
            <label htmlFor="auth-username-field" className="auth-form-label">
              Username
            </label>
            <div className="auth-input-wrapper">
              <input
                ref={firstInputRef}
                id="auth-username-field"
                name="username"
                className={`auth-input-field ${usernameStatus.state === 'taken' ? 'has-error' : ''}`}
                type="text"
                placeholder="e.g. alex_dev"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>
            {mode === 'signup' && usernameStatus.message && (
              <p
                className={`auth-field-status ${
                  usernameStatus.state === 'available' ? 'status-success' : 'status-error'
                }`}
              >
                {usernameStatus.state === 'available' && <CheckCircle2 size={13} />}
                {usernameStatus.state === 'taken' && <AlertCircle size={13} />}
                {usernameStatus.message}
              </p>
            )}
          </div>

          {mode !== 'forgot_password' && (
            <div className="auth-form-group">
              <label htmlFor="auth-password-field" className="auth-form-label">
                Password
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="auth-password-field"
                  name="password"
                  className="auth-input-field"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'signup' ? 'Min 6 characters' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {mode === 'signup' && password && (
                <div className="auth-password-meter">
                  <div className="auth-meter-header">
                    <span>Password Strength:</span>
                    <span className={`strength-label ${passwordStrength.colorClass}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="auth-meter-bar-track">
                    <div
                      className={`auth-meter-bar-fill ${passwordStrength.colorClass}`}
                      style={{ width: `${(passwordStrength.score / 3) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'signup' && (
            <div className="auth-form-group">
              <label htmlFor="auth-confirm-password-field" className="auth-form-label">
                Confirm Password
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="auth-confirm-password-field"
                  name="confirmPassword"
                  className={`auth-input-field ${
                    confirmPassword && password !== confirmPassword ? 'has-error' : ''
                  }`}
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="auth-field-status status-error">
                  <AlertCircle size={13} /> Passwords do not match
                </p>
              )}
            </div>
          )}

          {mode === 'login' && (
            <div className="auth-form-options">
              <label className="auth-remember-checkbox">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="auth-forgot-link"
                onClick={() => {
                  setMode('forgot_password')
                  setError('')
                }}
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>
          )}

          {mode !== 'forgot_password' && (
            <div className="auth-captcha-box">
              <CaptchaChallenge onVerify={(token) => setCaptchaToken(token)} />
            </div>
          )}

          {unverifiedEmail && (
            <div className="auth-unverified-box">
              {resendStatus === 'success' ? (
                <p className="auth-resend-success">
                  <CheckCircle2 size={16} /> {resendMessage}
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
                    leftIcon={<Mail size={14} />}
                  >
                    {resendStatus === 'sending'
                      ? 'Sending Verification Link...'
                      : 'Resend Verification Email'}
                  </Button>
                  {resendStatus === 'error' && (
                    <p className="auth-resend-error">{resendMessage}</p>
                  )}
                </>
              )}
            </div>
          )}

          <Button
            className="auth-submit-btn"
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            disabled={loading}
            isLoading={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="auth-spin-icon" /> Please wait...
              </>
            ) : mode === 'forgot_password' ? (
              'Send Reset Link'
            ) : mode === 'login' ? (
              'Log In'
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        {mode !== 'forgot_password' && (
          <div className="auth-social-section">
            <div className="auth-divider">
              <span>Or continue with</span>
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

        <div className="auth-modal-footer">
          <p className="auth-switch-text">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              className="auth-switch-btn"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login')
                setError('')
              }}
              disabled={loading}
            >
              {mode === 'login' ? 'Sign up for free' : 'Log in here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
