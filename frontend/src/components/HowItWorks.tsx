import React from 'react'
import { FiUploadCloud, FiCpu, FiCheckCircle } from 'react-icons/fi'

const steps = [
  {
    icon: <FiUploadCloud size={36} />,
    title: '1. Upload',
    description: 'Upload your resume in PDF format.',
  },
  {
    icon: <FiCpu size={36} />,
    title: '2. We analyze',
    description: 'Our system scans your skills against your target role.',
  },
  {
    icon: <FiCheckCircle size={36} />,
    title: '3. Get suggestions',
    description: 'Receive actionable insights to improve your score.',
  },
]

export const HowItWorks: React.FC = () => {
  return (
    <div
      style={{
        marginTop: '2.5rem',
        paddingTop: '2rem',
        borderTop: '1px solid var(--border-color, rgba(128, 128, 128, 0.2))',
      }}
    >
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: '600', color: 'var(--card-text)' }}>
        How It Works
      </h3>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
        {steps.map((step, index) => (
          <div
            key={index}
            style={{
              flex: '1 1 250px',
              minWidth: '250px',
              padding: '24px 20px',
              background: 'var(--card-bg)',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border-color, rgba(128, 128, 128, 0.1))',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              color: 'var(--card-text)',
            }}
          >
            <div style={{ color: '#818cf8', marginBottom: '16px' }}>{step.icon}</div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: '600', color: 'var(--card-text)' }}>
              {step.title}
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: 'var(--font-size-sm, 0.875rem)',
                color: 'var(--card-text)',
                lineHeight: '1.5',
              }}
            >
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
