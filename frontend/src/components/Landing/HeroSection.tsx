import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Target } from 'lucide-react'

export const HeroSection: React.FC = () => {
  const navigate = useNavigate()

  return (
    <section
      className="hero-section"
      style={{ padding: 'var(--space-8) 0', textAlign: 'center', marginTop: '40px' }}
    >
      <h1 className="app-main-title animate-fade-in-up" style={{ marginBottom: 'var(--space-3)' }}>
        AI Resume Analyzer
      </h1>
      <p
        className="animate-fade-in-up delay-100"
        style={{
          fontSize: 'var(--text-lg)',
          color: 'var(--color-primary)',
          fontWeight: 'bold',
          marginBottom: 'var(--space-4)',
        }}
      >
        Optimize your resume for the ATS in seconds.
      </p>
      <p
        className="animate-fade-in-up delay-200"
        style={{
          fontSize: 'var(--text-md)',
          color: 'var(--card-text)',
          maxWidth: '600px',
          margin: '0 auto var(--space-6)',
          lineHeight: '1.6',
          opacity: 0.9,
        }}
      >
        Get actionable feedback, identify missing skills, and instantly discover how well your
        resume matches your target role. Stop guessing, start landing interviews.
      </p>

      <div
        className="animate-fade-in-up delay-300"
        style={{
          display: 'flex',
          gap: 'var(--space-4)',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          className="app-btn app-btn--accent"
          onClick={() => navigate('/analyze')}
          style={{
            fontSize: 'var(--text-base)',
            padding: 'var(--space-3) var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Target size={20} />
          Analyze Resume
        </button>
        <button
          className="app-btn app-btn--secondary"
          onClick={() => {
            document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
          }}
          style={{ fontSize: 'var(--text-base)', padding: 'var(--space-3) var(--space-6)' }}
        >
          Learn More
        </button>
      </div>
    </section>
  )
}
