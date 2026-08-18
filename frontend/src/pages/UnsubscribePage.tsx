import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

const MISSING_TOKEN_MESSAGE =
  'This page needs the unsubscribe link from one of your digest emails. Open the ' +
  'most recent one and use the link at the bottom, or sign in and turn the digest ' +
  'off from your profile.'

export const UnsubscribePage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const tokenParam = searchParams.get('token') || ''

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const handleUnsubscribe = async (token: string) => {
    // The backend identifies the account from the signed token in the link.
    // An email address typed into this page proves nothing, so it is no
    // longer sent — and no longer accepted.
    if (!token) {
      setStatus('error')
      setMessage(MISSING_TOKEN_MESSAGE)
      return
    }

    setStatus('loading')
    setMessage(null)

    try {
      const response = await axios.post(`${BACKEND}/api/unsubscribe/`, { token })
      setStatus('success')
      setMessage(response.data.message || 'Successfully unsubscribed from weekly resume tips.')
    } catch (err: any) {
      setStatus('error')
      setMessage(
        err.response?.data?.error ||
          err.response?.data?.detail ||
          'We could not process that unsubscribe link. Please try the link in your most recent digest email.'
      )
    }
  }

  useEffect(() => {
    if (tokenParam) {
      handleUnsubscribe(tokenParam)
    } else {
      // Older digest emails linked here with ?email=..., which the backend no
      // longer honours. Explain what to do instead of silently doing nothing.
      setStatus('error')
      setMessage(MISSING_TOKEN_MESSAGE)
    }
  }, [tokenParam])

  return (
    <div className="app-container" style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px' }}>
      <div className="analysis-card" style={{ maxWidth: '500px', width: '100%', padding: '36px', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔕</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: '700', margin: '0 0 8px 0', color: 'var(--heading-text)' }}>
          Email Digest Unsubscribe
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted-text)', margin: '0 0 24px 0' }}>
          Manage your subscription preferences for weekly resume-tips email digest.
        </p>

        {status === 'loading' && (
          <div style={{ padding: '20px 0' }}>
            <div className="spinner" style={{ borderTopColor: 'var(--color-primary)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--muted-text)', fontSize: '0.9rem' }}>Processing your unsubscribe request...</p>
          </div>
        )}

        {status === 'success' && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid var(--color-accent)',
            color: 'var(--color-accent)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
            fontSize: '0.95rem'
          }}>
            ✅ {message}
          </div>
        )}

        {status === 'error' && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-danger)',
            color: 'var(--color-danger)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
            fontSize: '0.95rem'
          }}>
            ⚠️ {message}
          </div>
        )}

        {status === 'error' && tokenParam && (
          <button
            type="button"
            className="app-btn app-btn--primary"
            onClick={() => handleUnsubscribe(tokenParam)}
            style={{ width: '100%', marginBottom: '20px' }}
          >
            Try Again
          </button>
        )}

        {status === 'error' && !tokenParam && (
          <Link
            to="/#profile"
            className="app-btn app-btn--primary"
            style={{ display: 'block', width: '100%', marginBottom: '20px', textDecoration: 'none' }}
          >
            Manage Preferences in My Profile
          </Link>
        )}

        <div style={{ marginTop: '20px' }}>
          <Link to="/" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
