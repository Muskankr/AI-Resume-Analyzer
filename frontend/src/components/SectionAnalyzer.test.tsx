import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectionAnalyzer } from './SectionAnalyzer'
import { analyzeSections, overallSectionScore } from '../utils/sectionAnalyzer'

// ── analyzeSections ──────────────────────────────────────────────────────────

describe('analyzeSections', () => {
  it('returns empty array for empty text', () => {
    expect(analyzeSections({ resumeText: '', skills: [] })).toEqual([])
  })

  it('detects a single section', () => {
    const text = 'Experience\n- Built a React app with TypeScript\n- Improved performance by 40%'
    const sections = analyzeSections({ resumeText: text, skills: ['React'] })
    expect(sections.length).toBeGreaterThanOrEqual(1)
    const exp = sections.find((s) => s.key === 'experience')
    expect(exp).toBeDefined()
    expect(exp!.label).toBe('Work Experience')
    expect(exp!.wordCount).toBeGreaterThan(0)
  })

  it('detects multiple sections', () => {
    const text = `
Summary
Experienced developer with 5 years of expertise in React and Node.js.

Experience
- Led a team of 4 engineers
- Deployed microservices on AWS

Education
Bachelor of Science in Computer Science, MIT

Skills
React, TypeScript, Docker, PostgreSQL
    `
    const sections = analyzeSections({ resumeText: text, skills: ['React', 'Docker'] })
    expect(sections.length).toBeGreaterThanOrEqual(4)

    const keys = sections.map((s) => s.key)
    expect(keys).toContain('summary')
    expect(keys).toContain('experience')
    expect(keys).toContain('education')
    expect(keys).toContain('skills')
  })

  it('marks missing sections', () => {
    const text = 'Skills\nReact, Docker'
    const sections = analyzeSections({ resumeText: text, skills: ['React'] })
    const missing = sections.filter((s) => s.grade === 'Missing')
    expect(missing.length).toBeGreaterThan(0)
    expect(missing.map((s) => s.key)).toContain('experience')
  })

  it('scores a strong section higher than a weak one', () => {
    const strong = `
Experience
- Built a production-grade React application serving 10k users daily
- Reduced API latency by 60% through query optimization
- Led migration from monolith to microservices architecture
- Automated deployment pipeline reducing release time by 75%
`
    const weak = 'Experience\nstuff'
    const strongSections = analyzeSections({ resumeText: strong, skills: [] })
    const weakSections = analyzeSections({ resumeText: weak, skills: [] })

    const strongExp = strongSections.find((s) => s.key === 'experience')
    const weakExp = weakSections.find((s) => s.key === 'experience')

    expect(strongExp!.score).toBeGreaterThan(weakExp!.score)
  })

  it('provides tips for weak sections', () => {
    const text = 'Experience\nnothing useful'
    const sections = analyzeSections({ resumeText: text, skills: [] })
    const exp = sections.find((s) => s.key === 'experience')
    expect(exp!.tips.length).toBeGreaterThan(0)
  })
})

// ── overallSectionScore ──────────────────────────────────────────────────────

describe('overallSectionScore', () => {
  it('returns 0 for empty array', () => {
    expect(overallSectionScore([])).toBe(0)
  })

  it('averages present section scores', () => {
    const sections = analyzeSections({
      resumeText: `
Experience
- Built a production-grade application with React and TypeScript
- Reduced load time by 50% through code splitting
- Led team of 5 engineers on enterprise migration
- Deployed on AWS with full CI/CD pipeline
- Managed PostgreSQL database serving 1M+ rows
`,
      skills: ['React', 'TypeScript', 'AWS'],
    })
    const score = overallSectionScore(sections)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})

// ── Component render tests ───────────────────────────────────────────────────

describe('SectionAnalyzer', () => {
  it('renders nothing for empty text', () => {
    const { container } = render(
      <SectionAnalyzer resumeText="" skills={[]} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders the toggle button', () => {
    render(
      <SectionAnalyzer resumeText="Experience\nReact dev" skills={['React']} />,
    )
    expect(screen.getByText(/Section Analyzer/)).toBeDefined()
  })

  it('expands and shows section cards', () => {
    render(
      <SectionAnalyzer
        resumeText="Experience\n- Built React app\nEducation\nBS Computer Science"
        skills={['React']}
      />,
    )
    screen.getByRole('button', { name: /Section Analyzer/ }).click()
    expect(screen.getByText('Work Experience')).toBeDefined()
    expect(screen.getByText('Education')).toBeDefined()
  })

  it('shows health bar after expansion', () => {
    render(
      <SectionAnalyzer resumeText="Skills\nReact Docker" skills={['React']} />,
    )
    screen.getByRole('button', { name: /Section Analyzer/ }).click()
    expect(screen.getByText(/Overall:/)).toBeDefined()
  })
})
