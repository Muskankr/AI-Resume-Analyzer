import React from 'react'
import { FiUploadCloud, FiCpu, FiCheckCircle } from 'react-icons/fi'

const steps = [
  {
    icon: <FiUploadCloud size={36} />,
    title: 'Upload Resume',
    description: 'Upload your resume in PDF format and select your target career track.',
    gradient: 'linear-gradient(135deg, #14b8a6, #2dd4bf)',
  },
  {
    icon: <FiCpu size={36} />,
    title: 'AI Analysis',
    description: 'Our AI scans your resume, extracts skills, and matches against your target role.',
    gradient: 'linear-gradient(135deg, #f472b6, #ec4899)',
  },
  {
    icon: <FiCheckCircle size={36} />,
    title: 'Get Insights',
    description: 'Receive your ATS score, skill gap analysis, and personalized recommendations.',
    gradient: 'linear-gradient(135deg, #60a5fa, #2dd4bf)',
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
      <h3
        style={{
          marginBottom: '0.5rem',
          fontSize: '1.4rem',
          fontWeight: '700',
          textAlign: 'center',
        }}
        className="gradient-text-animated"
      >
        How It Works
      </h3>
      <p
        style={{
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
          marginBottom: '2rem',
        }}
      >
        Three simple steps to optimize your resume
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="step-card bounce-in" style={{ animationDelay: `${0.15 * index}s` }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: step.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: '#fff',
                  boxShadow: `0 8px 24px ${step.gradient}33`,
                }}
              >
                {step.icon}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: step.gradient,
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  marginBottom: '10px',
                }}
              >
                {index + 1}
              </div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: '700' }}>
                {step.title}
              </h4>
              <p
                style={{
                  margin: 0,
                  fontSize: 'var(--font-size-sm, 0.875rem)',
                  lineHeight: '1.6',
                  color: 'var(--text-muted)',
                }}
              >
                {step.description}
              </p>
            </div>
            {index < steps.length - 1 && <div className="step-connector" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
