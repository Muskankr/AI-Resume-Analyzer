import React from 'react'
import { UploadCloud, Cpu, CheckCircle2, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react'
import './HowItWorks.css'

export interface StepItem {
  id: number
  title: string
  subtitle: string
  description: string
  icon: React.ReactNode
  badgeText: string
}

const stepsData: StepItem[] = [
  {
    id: 1,
    badgeText: 'Step 01',
    title: '1. Upload Resume',
    subtitle: 'PDF, DOCX, or TXT format',
    description: 'Upload your resume in PDF, DOCX, or TXT format. Drag & drop directly or choose a saved file.',
    icon: <UploadCloud size={32} aria-hidden="true" />,
  },
  {
    id: 2,
    badgeText: 'Step 02',
    title: '2. We Analyze',
    subtitle: 'AI & ATS Parser Engine',
    description: 'Our system scans your skills, experience, and formatting against target job description requirements.',
    icon: <Cpu size={32} aria-hidden="true" />,
  },
  {
    id: 3,
    badgeText: 'Step 03',
    title: '3. Get Suggestions',
    subtitle: 'Actionable Insights',
    description: 'Receive actionable insights, missing keyword alerts, and tailored suggestions to boost your ATS score.',
    icon: <CheckCircle2 size={32} aria-hidden="true" />,
  },
]

export const HowItWorks: React.FC = () => {
  return (
    <section
      className="how-it-works-section"
      aria-labelledby="how-it-works-heading"
      data-testid="how-it-works"
    >
      <div className="how-it-works-header">
        <div className="how-it-works-pill">
          <Sparkles size={14} />
          <span>Simple 3-Step Process</span>
        </div>
        <h3 id="how-it-works-heading" className="how-it-works-title">
          How It Works
        </h3>
        <p className="how-it-works-subtitle">
          Optimize your resume for applicant tracking systems (ATS) in seconds with automated AI analysis.
        </p>
      </div>

      <div className="how-it-works-grid">
        {stepsData.map((step, idx) => (
          <div key={step.id} className="how-it-works-card" data-testid={`step-card-${step.id}`}>
            <div className="step-card-header">
              <div className="step-icon-wrapper" aria-hidden="true">
                {step.icon}
              </div>
              <span className="step-badge">{step.badgeText}</span>
            </div>

            <h4 className="step-card-title">{step.title}</h4>
            <span className="step-card-subtitle">{step.subtitle}</span>

            <p className="step-card-description">{step.description}</p>

            {idx < stepsData.length - 1 && (
              <div className="step-connector" aria-hidden="true">
                <ArrowRight size={18} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="how-it-works-footer">
        <div className="security-guarantee">
          <ShieldCheck size={16} className="text-emerald-400" />
          <span>Your data is encrypted and deleted immediately after session analysis.</span>
        </div>
      </div>
    </section>
  )
}
