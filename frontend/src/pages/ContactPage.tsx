import React, { useEffect, useState } from 'react'
import axios from 'axios'

const SUPPORT_EMAIL = 'support@ai-resume-analyzer.dev'
const GITHUB_ISSUES_URL = 'https://github.com/Muskankr/AI-Resume-Analyzer/issues'

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState('General Inquiry')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    document.title = 'Contact Us | AI Resume Analyzer'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrorMsg('Please fill in your name, email, and message.')
      return
    }

    setLoading(true)
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

    try {
      const res = await axios.post(`${backendUrl}/api/contact/`, {
        name,
        email,
        category,
        subject,
        message,
      })

      setSuccessMsg(
        res.data.detail || 'Thank you for reaching out! Your message has been sent to our team.'
      )
      setName('')
      setEmail('')
      setCategory('General Inquiry')
      setSubject('')
      setMessage('')
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setErrorMsg(err.response.data.error)
      } else {
        setErrorMsg('Failed to send message. Please try again later or email us directly.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      id="main-content"
      style={{
        maxWidth: '860px',
        margin: '0 auto',
        padding: '60px 24px 80px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '44px', textAlign: 'center' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #818cf8, #38bdf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '12px',
          }}
        >
          Contact Support & Feedback
        </h1>
        <p
          style={{
            color: 'var(--text-secondary, #94a3b8)',
            maxWidth: '580px',
            margin: '0 auto',
            lineHeight: '1.7',
            fontSize: '0.96rem',
          }}
        >
          Have a question, encountered an issue, or have a suggestion? Reach out to us below or via
          our direct support channel. We are here to help!
        </p>
      </div>

      {/* Info Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '40px',
        }}
      >
        <div
          style={{
            padding: '24px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>✉️</div>
          <h3 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '6px' }}>Direct Email</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0, lineHeight: '1.6' }}>
            Send us an email anytime at:
            <br />
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              style={{ color: '#818cf8', textDecoration: 'underline', fontWeight: 600 }}
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>

        <div
          style={{
            padding: '24px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>🐙</div>
          <h3 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '6px' }}>GitHub Issues</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0, lineHeight: '1.6' }}>
            Developer or feature request?
            <br />
            <a
              href={GITHUB_ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#38bdf8', textDecoration: 'underline', fontWeight: 600 }}
            >
              Open a GitHub Issue
            </a>
          </p>
        </div>
      </div>

      {/* Form Container */}
      <div
        style={{
          padding: '36px',
          borderRadius: '16px',
          background: 'rgba(30, 30, 47, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        }}
      >
        <h2 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '24px', fontWeight: 700 }}>
          Send Us a Message
        </h2>

        {successMsg && (
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '10px',
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              color: '#4ade80',
              marginBottom: '24px',
              fontSize: '0.93rem',
              lineHeight: '1.6',
            }}
          >
            ✅ {successMsg}
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              marginBottom: '24px',
              fontSize: '0.93rem',
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
              marginBottom: '20px',
            }}
          >
            <div>
              <label
                htmlFor="contact-name"
                style={{
                  display: 'block',
                  color: '#e2e8f0',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  marginBottom: '8px',
                }}
              >
                Your Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#fff',
                  fontSize: '0.92rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="contact-email"
                style={{
                  display: 'block',
                  color: '#e2e8f0',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  marginBottom: '8px',
                }}
              >
                Email Address <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#fff',
                  fontSize: '0.92rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
              marginBottom: '20px',
            }}
          >
            <div>
              <label
                htmlFor="contact-category"
                style={{
                  display: 'block',
                  color: '#e2e8f0',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  marginBottom: '8px',
                }}
              >
                Category
              </label>
              <select
                id="contact-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#fff',
                  fontSize: '0.92rem',
                  outline: 'none',
                }}
              >
                <option value="General Inquiry">General Inquiry</option>
                <option value="Technical Support">Technical Support</option>
                <option value="Bug Report">Bug Report</option>
                <option value="Feature Request">Feature Request</option>
                <option value="Account & Data">Account & Data</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="contact-subject"
                style={{
                  display: 'block',
                  color: '#e2e8f0',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  marginBottom: '8px',
                }}
              >
                Subject
              </label>
              <input
                id="contact-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your message"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#fff',
                  fontSize: '0.92rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label
              htmlFor="contact-message"
              style={{
                display: 'block',
                color: '#e2e8f0',
                fontSize: '0.88rem',
                fontWeight: 600,
                marginBottom: '8px',
              }}
            >
              Message <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or feedback in detail..."
              rows={5}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: '#fff',
                fontSize: '0.92rem',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #818cf8, #38bdf8)',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.96rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? '⏳ Sending Message...' : '🚀 Submit Message'}
          </button>
        </form>
      </div>
    </main>
  )
}
