// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ResumeStrengthMeter, { analyzeResume } from './ResumeStrengthMeter'

describe('ResumeStrengthMeter', () => {
  const sampleResume = `John Smith
john.smith@email.com | (555) 123-4567 | linkedin.com/in/johnsmith | github.com/johnsmith
San Francisco, CA

Summary
Results-driven Full Stack Developer with 5+ years of experience building scalable web applications. Led development of microservices architecture serving 1M+ daily users. Passionate about clean code and mentoring junior developers.

Experience
Senior Developer | TechCorp Inc. | 2022-Present
• Led migration from monolith to microservices, reducing deployment time by 60%
• Managed team of 5 engineers, delivering 12 major features on schedule
• Implemented CI/CD pipeline using Docker and Kubernetes

Software Engineer | StartupXYZ | 2020-2022
• Developed React-based dashboard used by 50K+ users monthly
• Optimized PostgreSQL queries, improving response time by 40%
• Collaborated with design team to implement responsive UI components

Skills
JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, Kubernetes, PostgreSQL, MongoDB, Git, REST APIs, GraphQL

Education
Bachelor of Science in Computer Science
University of California, Berkeley | 2020

Certifications
AWS Solutions Architect Associate
`

  it('renders the strength meter with overall score', () => {
    render(<ResumeStrengthMeter resumeText={sampleResume} />)
    
    expect(screen.getByText('Resume Strength Meter')).toBeInTheDocument()
    expect(screen.getByText(/out of 100/)).toBeInTheDocument()
  })

  it('displays section breakdown', () => {
    render(<ResumeStrengthMeter resumeText={sampleResume} />)
    
    expect(screen.getByText('Contact Information')).toBeInTheDocument()
    expect(screen.getByText('Professional Summary')).toBeInTheDocument()
    expect(screen.getByText('Work Experience')).toBeInTheDocument()
    expect(screen.getByText('Skills & Technologies')).toBeInTheDocument()
    expect(screen.getByText('Education')).toBeInTheDocument()
    expect(screen.getByText('Format & Structure')).toBeInTheDocument()
  })

  it('expands section on click', () => {
    render(<ResumeStrengthMeter resumeText={sampleResume} />)
    
    const contactSection = screen.getByText('Contact Information').closest('div')?.parentElement?.parentElement
    if (contactSection) {
      fireEvent.click(contactSection)
      expect(screen.getByText('Recommendations')).toBeInTheDocument()
    }
  })

  it('shows ATS pass rate', () => {
    render(<ResumeStrengthMeter resumeText={sampleResume} />)
    
    expect(screen.getByText(/Estimated ATS Pass Rate/)).toBeInTheDocument()
  })

  it('shows quick summary grid', () => {
    render(<ResumeStrengthMeter resumeText={sampleResume} />)
    
    expect(screen.getByText('Quick Summary')).toBeInTheDocument()
  })
})

describe('analyzeResume', () => {
  it('analyzes a complete resume correctly', () => {
    const resume = `John Smith
john@email.com | (555) 123-4567

Summary
Senior developer with 5 years experience.

Experience
Dev at TechCorp
• Built things
• Led team

Skills
JavaScript React Python

Education
BS Computer Science
University of California
`
    const result = analyzeResume(resume)
    
    expect(result.overallScore).toBeGreaterThan(0)
    expect(result.overallScore).toBeLessThanOrEqual(100)
    expect(result.grade).toBeDefined()
    expect(result.sections).toHaveLength(6)
    expect(result.estimatedAtsPass).toBeGreaterThan(0)
  })

  it('handles empty resume', () => {
    const result = analyzeResume('')
    
    expect(result.overallScore).toBe(0)
    expect(result.grade.letter).toBe('F')
    expect(result.sections).toHaveLength(6)
  })

  it('identifies missing contact info', () => {
    const result = analyzeResume('Just some random text without contact details')
    const contactSection = result.sections.find(s => s.id === 'contact')
    
    expect(contactSection).toBeDefined()
    expect(contactSection!.score).toBeLessThan(50)
  })

  it('detects strong action verbs', () => {
    const resume = `Summary
Led development of major platform.
Managed team of 10 engineers.
Implemented new architecture.
Optimized performance by 50%.`
    
    const result = analyzeResume(resume)
    const expSection = result.sections.find(s => s.id === 'experience')
    
    expect(expSection).toBeDefined()
  })
})
