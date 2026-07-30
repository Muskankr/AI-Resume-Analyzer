import React from 'react'
import { Target, FileText, History, CheckCircle } from 'lucide-react'

const features = [
  {
    title: 'ATS Score Analysis',
    description:
      'Instantly find out how your resume scores against typical Applicant Tracking Systems.',
    icon: <Target size={32} color="var(--color-primary)" />,
  },
  {
    title: 'AI Resume Feedback',
    description:
      'Get deep insights and personalized recommendations on how to improve your content.',
    icon: <FileText size={32} color="var(--color-primary)" />,
  },
  {
    title: 'Resume History',
    description:
      'Save past analyses, track your score improvements, and compare different resume versions.',
    icon: <History size={32} color="var(--color-primary)" />,
  },
  {
    title: 'Career Track Recommendations',
    description:
      'See missing skills specific to your desired role and get targeted upskilling advice.',
    icon: <CheckCircle size={32} color="var(--color-primary)" />,
  },
]

export const FeaturesSection: React.FC = () => {
  return (
    <section id="features" style={{ padding: 'var(--space-8) 0', marginTop: 'var(--space-6)' }}>
      <div
        className="animate-fade-in-up"
        style={{ textAlign: 'center', marginBottom: 'var(--space-7)' }}
      >
        <h2>Powerful Features</h2>
        <p style={{ color: 'var(--color-neutral)', marginTop: 'var(--space-2)' }}>
          Everything you need to perfect your application.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-6)',
        }}
      >
        {features.map((feature, idx) => (
          <div
            key={idx}
            className={`main-card animate-fade-in-up delay-${(idx + 1) * 100}`}
            style={{
              padding: 'var(--space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <div
              style={{
                background: 'var(--upload-bg)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-lg)',
                width: 'fit-content',
              }}
            >
              {feature.icon}
            </div>
            <h3 style={{ margin: 0 }}>{feature.title}</h3>
            <p style={{ margin: 0, color: 'var(--card-text)', opacity: 0.8, lineHeight: '1.5' }}>
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
