import React from 'react'
import { UploadCloud, Cpu, CheckCircle } from 'lucide-react'

export const HowItWorksSection: React.FC = () => {
  return (
    <section style={{ padding: 'var(--space-8) 0', marginTop: 'var(--space-6)' }}>
      <div
        className="animate-fade-in-up"
        style={{ textAlign: 'center', marginBottom: 'var(--space-7)' }}
      >
        <h2>How It Works</h2>
        <p style={{ color: 'var(--color-neutral)', marginTop: 'var(--space-2)' }}>
          Three simple steps to a better resume.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 'var(--space-5)',
          justifyContent: 'center',
        }}
      >
        {/* Step 1 */}
        <div
          className="animate-fade-in-up delay-100"
          style={{
            flex: '1 1 250px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-round)',
              background: 'var(--btn-secondary-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
            }}
          >
            <UploadCloud size={32} />
          </div>
          <h3 style={{ margin: 0 }}>1. Upload Resume</h3>
          <p style={{ color: 'var(--color-neutral)', fontSize: 'var(--text-sm)' }}>
            Simply upload your PDF or paste your resume text.
          </p>
        </div>

        {/* Step 2 */}
        <div
          className="animate-fade-in-up delay-200"
          style={{
            flex: '1 1 250px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-round)',
              background: 'var(--btn-secondary-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-secondary)',
            }}
          >
            <Cpu size={32} />
          </div>
          <h3 style={{ margin: 0 }}>2. AI Analyzes Resume</h3>
          <p style={{ color: 'var(--color-neutral)', fontSize: 'var(--text-sm)' }}>
            Our smart engine checks keywords, formatting, and skills.
          </p>
        </div>

        {/* Step 3 */}
        <div
          className="animate-fade-in-up delay-300"
          style={{
            flex: '1 1 250px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-round)',
              background: 'var(--btn-secondary-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
            }}
          >
            <CheckCircle size={32} />
          </div>
          <h3 style={{ margin: 0 }}>3. Get Score & Suggestions</h3>
          <p style={{ color: 'var(--color-neutral)', fontSize: 'var(--text-sm)' }}>
            Receive actionable feedback to improve your ATS match.
          </p>
        </div>
      </div>
    </section>
  )
}
