import React from 'react'
import { Check } from 'lucide-react'

const benefits = [
  'Improve ATS compatibility with keyword optimization',
  'Identify missing skills for your target role',
  'Receive AI-powered, actionable recommendations',
  'Get career-focused suggestions based on industry standards',
  'Fast, reliable resume review in seconds',
]

export const BenefitsSection: React.FC = () => {
  return (
    <section
      style={{
        padding: 'var(--space-8) 0',
        marginTop: 'var(--space-6)',
        marginBottom: 'var(--space-8)',
      }}
    >
      <div
        className="main-card animate-fade-in-up"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: 'var(--space-8) var(--space-4)',
        }}
      >
        <h2 style={{ marginBottom: 'var(--space-4)' }}>Why Choose Our Analyzer?</h2>
        <p
          style={{
            color: 'var(--color-neutral)',
            maxWidth: '600px',
            margin: '0 auto var(--space-6)',
            fontSize: 'var(--text-md)',
            lineHeight: '1.6',
          }}
        >
          Our AI-powered engine goes beyond basic keyword matching to give you a comprehensive
          review of your resume's strengths and weaknesses.
        </p>

        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            textAlign: 'left',
            maxWidth: '500px',
            width: '100%',
          }}
        >
          {benefits.map((benefit, idx) => (
            <li
              key={idx}
              className={`animate-fade-in-up delay-${(idx + 1) * 100}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)',
                fontSize: 'var(--text-base)',
                color: 'var(--card-text)',
              }}
            >
              <div style={{ color: 'var(--color-accent)', marginTop: '2px' }}>
                <Check size={20} />
              </div>
              <span style={{ opacity: 0.9 }}>{benefit}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
