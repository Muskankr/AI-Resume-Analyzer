// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import React from 'react'
import { HowItWorks } from './HowItWorks'

describe('HowItWorks Component (#276 Contrast & Step Cards)', () => {
  it('renders section title, subtitle, and step cards with full visibility', () => {
    render(<HowItWorks />)

    expect(screen.getByTestId('how-it-works')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'How It Works' })).toBeInTheDocument()
    expect(
      screen.getByText(/Optimize your resume for applicant tracking systems/i)
    ).toBeInTheDocument()

    // Step cards check
    expect(screen.getByTestId('step-card-1')).toBeInTheDocument()
    expect(screen.getByTestId('step-card-2')).toBeInTheDocument()
    expect(screen.getByTestId('step-card-3')).toBeInTheDocument()
  })

  it('renders step 1 text with WCAG contrast complaint content', () => {
    render(<HowItWorks />)

    expect(screen.getByText('1. Upload Resume')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Upload your resume in PDF, DOCX, or TXT format. Drag & drop directly or choose a saved file.'
      )
    ).toBeInTheDocument()
    expect(screen.getByText('Step 01')).toBeInTheDocument()
  })

  it('renders step 2 text with high contrast content', () => {
    render(<HowItWorks />)

    expect(screen.getByText('2. We Analyze')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Our system scans your skills, experience, and formatting against target job description requirements.'
      )
    ).toBeInTheDocument()
    expect(screen.getByText('Step 02')).toBeInTheDocument()
  })

  it('renders step 3 text with high contrast content', () => {
    render(<HowItWorks />)

    expect(screen.getByText('3. Get Suggestions')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Receive actionable insights, missing keyword alerts, and tailored suggestions to boost your ATS score.'
      )
    ).toBeInTheDocument()
    expect(screen.getByText('Step 03')).toBeInTheDocument()
  })

  it('renders security guarantee disclaimer badge', () => {
    render(<HowItWorks />)

    expect(
      screen.getByText('Your data is encrypted and deleted immediately after session analysis.')
    ).toBeInTheDocument()
  })
})
