import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, Home } from 'lucide-react'
import axios from 'axios'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

interface VerifyEmailPageProps {
  onVerificationSuccess: () => void
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ onVerificationSuccess }) => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const hasCalled = useRef(false)

  useEffect(() => {
    if (hasCalled.current) return
    hasCalled.current = true

    const verify = async () => {
      try {
        await axios.post(`${BACKEND}/api/auth/verify-email/`, { token })
        setStatus('success')
        onVerificationSuccess()
        // Automatically redirect to home after 3 seconds
        setTimeout(() => {
          navigate('/')
        }, 3000)
      } catch (err: unknown) {
        setStatus('error')
        let msg = 'Verification failed. The link may be invalid or expired.'
        if (axios.isAxiosError(err)) {
          msg = err.response?.data?.error || msg
        }
        setErrorMsg(msg)
      }
    }

    if (token) {
      verify()
    } else {
      setStatus('error')
      setErrorMsg('No verification token provided.')
    }
  }, [token, navigate, onVerificationSuccess])

  return (
    <div className="verify-email-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '24px',
    }}>
      <div className="verify-email-card" style={{
        maxWidth: '450px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--radius-lg, 16px)',
        padding: '40px 32px',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      }}>
        {status === 'loading' && (
          <div>
            <Loader2 className="spin" size={48} style={{ color: '#6366f1', margin: '0 auto 24px' }} />
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: '#fff' }}>
              Verifying Your Email
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
              Please wait while we secure your account details...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <CheckCircle size={56} style={{ color: '#10b981', margin: '0 auto 24px' }} />
            <h3 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '12px', color: '#fff' }}>
              Email Verified!
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.5' }}>
              Your account is now fully verified. Redirecting you to the workspace in a few seconds...
            </p>
            <button
              onClick={() => navigate('/')}
              className="app-btn app-btn--primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: 'var(--radius-md, 8px)',
                cursor: 'pointer',
                fontWeight: 600,
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                transition: 'all 0.2s',
              }}
            >
              <Home size={16} /> Go to Dashboard
            </button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <XCircle size={56} style={{ color: '#ef4444', margin: '0 auto 24px' }} />
            <h3 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '12px', color: '#fff' }}>
              Verification Failed
            </h3>
            <p style={{ color: '#ef4444', fontSize: '0.95rem', fontWeight: 500, marginBottom: '20px' }}>
              {errorMsg}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem', marginBottom: '24px', lineHeight: '1.5' }}>
              Please request a new verification link from your account warning banner on the dashboard page.
            </p>
            <button
              onClick={() => navigate('/')}
              className="app-btn app-btn--secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: 'var(--radius-md, 8px)',
                cursor: 'pointer',
                fontWeight: 600,
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.15)',
                transition: 'all 0.2s',
              }}
            >
              <Home size={16} /> Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
