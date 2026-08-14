import React, { useCallback, useEffect, useState } from 'react'
import axios from 'axios'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

interface CaptchaChallengeProps {
  /**
   * Called with the signed challenge token and the answer the user typed.
   * Both are needed — the server checks the answer against the token, so
   * neither half proves anything on its own.
   *
   * Called with empty strings whenever a new challenge is being fetched, so a
   * stale pair can never be left sitting in the parent's state.
   */
  onChange: (captchaToken: string, captchaAnswer: string) => void
  onReset?: () => void
}

/**
 * Arithmetic CAPTCHA whose question comes from the backend.
 *
 * The previous version generated the sum in the browser and, on a correct
 * answer, minted its own `CAP-VERIFIED-...` token that the server accepted at
 * face value — so the check could be skipped entirely by posting that string
 * directly. The question and the expected answer now both live server-side,
 * and the answer is sent back to be verified. This component no longer decides
 * whether anyone passed.
 */
export const CaptchaChallenge: React.FC<CaptchaChallengeProps> = ({ onChange, onReset }) => {
  const [question, setQuestion] = useState('')
  const [token, setToken] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const loadChallenge = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    setAnswer('')
    // Clear the parent's copy up front: the old pair is about to be replaced
    // and must not remain submittable in the meantime.
    onChange('', '')

    try {
      const res = await axios.get(`${BACKEND}/api/captcha/`)
      setQuestion(res.data.question)
      setToken(res.data.captcha_token)
    } catch {
      setLoadError(true)
      setQuestion('')
      setToken('')
    } finally {
      setLoading(false)
    }
  }, [onChange])

  useEffect(() => {
    loadChallenge()
  }, [loadChallenge])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setAnswer(value)
    // Deliberately no client-side "is it correct" check — that is the server's
    // job now, and repeating it here would just hand out the answer.
    onChange(token, value.trim())
  }

  const handleRefresh = () => {
    onReset?.()
    loadChallenge()
  }

  return (
    <div
      className="captcha-container"
      style={{
        margin: '16px 0',
        padding: '14px 16px',
        borderRadius: '10px',
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        transition: 'all 0.25s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.1rem' }}>🛡️</span>
          <span
            style={{
              fontSize: '0.88rem',
              fontWeight: 600,
              color: 'var(--text-primary, #e2e8f0)',
            }}
          >
            Security Check:
          </span>
          <span
            style={{
              fontFamily: 'monospace',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: '#818cf8',
              background: 'rgba(129, 140, 248, 0.15)',
              padding: '2px 8px',
              borderRadius: '6px',
            }}
          >
            {loading ? '…' : loadError ? '—' : `${question} = ?`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="number"
            value={answer}
            onChange={handleInputChange}
            placeholder="Answer"
            aria-label="Security check answer"
            disabled={loading || loadError}
            style={{
              width: '70px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: '#fff',
              fontSize: '0.9rem',
              textAlign: 'center',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Get a new security question"
            title="Get a new question"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: '2px 4px',
              lineHeight: 1,
            }}
          >
            ↻
          </button>
        </div>
      </div>

      <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '6px 0 0 0', textAlign: 'left' }}>
        {loadError
          ? 'Could not load the security check. Use ↻ to try again.'
          : 'Solve the quick puzzle above to verify you are human.'}
      </p>
    </div>
  )
}
