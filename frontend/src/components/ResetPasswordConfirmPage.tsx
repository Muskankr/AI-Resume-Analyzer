import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Lock, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react'

export const ResetPasswordConfirmPage: React.FC = () => {
  const { uid, token } = useParams<{ uid: string; token: string }>()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setLoading(true)
    try {
      await axios.post(`${backendUrl}/api/password-reset-confirm/`, {
        uid,
        token,
        new_password: password,
      })

      setSuccess('Password reset successful! Redirecting...')

      setTimeout(() => {
        navigate('/')
      }, 3000)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data
        // The backend now runs AUTH_PASSWORD_VALIDATORS and returns their
        // messages under `new_password`. Reading only `error` swallowed them,
        // leaving the user with "Invalid or expired reset token" when the real
        // problem was that the password was too common or too short.
        const fieldErrors = data?.new_password
        if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
          setError(fieldErrors.join(' '))
        } else {
          setError(data?.error || 'Invalid or expired reset token.')
        }
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="auth-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div className="auth-modal" style={{ cursor: 'default' }}>
        <h3>
          <Lock size={16} /> Set New Password
        </h3>

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle color="#4ade80" size={48} style={{ margin: '0 auto 16px' }} />
            <p style={{ color: '#4ade80', fontSize: '1.1rem', fontWeight: 500 }}>{success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                id="reset-new-password"
                name="new-password"
                className="auth-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="New Password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                autoComplete="new-password"
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

            <div style={{ position: 'relative', width: '100%' }}>
              <input
                id="reset-confirm-password"
                name="confirm-password"
                className="auth-input"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
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
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-submit-btn" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={15} className="spin" />
                </>
              ) : (
                'Save New Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
