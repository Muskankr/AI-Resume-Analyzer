import React, { useState, useEffect } from 'react'

interface CaptchaChallengeProps {
  onVerify: (captchaToken: string) => void
  onReset?: () => void
}

export const CaptchaChallenge: React.FC<CaptchaChallengeProps> = ({ onVerify }) => {
  const [num1, setNum1] = useState(0)
  const [num2, setNum2] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState(false)

  const generateChallenge = () => {
    const a = Math.floor(Math.random() * 8) + 1
    const b = Math.floor(Math.random() * 8) + 1
    setNum1(a)
    setNum2(b)
    setUserAnswer('')
    setVerified(false)
    setError(false)
  }

  useEffect(() => {
    generateChallenge()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setUserAnswer(val)
    setError(false)

    if (parseInt(val.trim(), 10) === num1 + num2) {
      setVerified(true)
      const now = Date.now()
      const randStr = Math.random().toString(36).substring(2, 10)
      const token = `CAP-VERIFIED-${now}-${randStr}`
      onVerify(token)
    } else {
      setVerified(false)
    }
  }

  return (
    <div
      className="captcha-container"
      style={{
        margin: '16px 0',
        padding: '14px 16px',
        borderRadius: '10px',
        background: verified ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.04)',
        border: `1px solid ${verified ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 255, 255, 0.12)'}`,
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
            {num1} + {num2} = ?
          </span>
        </div>

        {verified ? (
          <span
            style={{
              color: '#22c55e',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ✓ Verified
          </span>
        ) : (
          <input
            type="number"
            value={userAnswer}
            onChange={handleInputChange}
            placeholder="Answer"
            aria-label="Security check answer"
            style={{
              width: '70px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.2)'}`,
              background: 'rgba(15, 23, 42, 0.6)',
              color: '#fff',
              fontSize: '0.9rem',
              textAlign: 'center',
              outline: 'none',
            }}
          />
        )}
      </div>

      {!verified && (
        <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '6px 0 0 0', textAlign: 'left' }}>
          Solve the quick puzzle above to verify you are human.
        </p>
      )}
    </div>
  )
}
