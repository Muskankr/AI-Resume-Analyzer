import { describe, it, expect } from 'vitest'
import { useResumeHealth, GRADE_COLORS } from '../hooks/useResumeHealth'
import { renderHook } from '@testing-library/react'

describe('useResumeHealth', () => {
  it('returns empty health for blank text', () => {
    const { result } = renderHook(() => useResumeHealth(''))
    expect(result.current.overall).toBe(0)
    expect(result.current.dimensions).toHaveLength(5)
  })

  it('scores a well-structured resume highly', () => {
    const goodResume = [
      'John Doe',
      'Email: john@example.com | Phone: +1-555-1234',
      'LinkedIn: linkedin.com/in/johndoe',
      '',
      '## Summary',
      'Senior software engineer with 8 years of experience building scalable web applications.',
      '',
      '## Experience',
      '- Led a team of 5 engineers to deliver a microservices platform serving 2M users daily',
      '- Reduced API response time by 40% through query optimization and caching strategies',
      '- Implemented CI/CD pipelines that cut deployment time from 45 minutes to 8 minutes',
      '- Mentored 3 junior developers, with 2 earning promotions within 12 months',
      '',
      '## Skills',
      'JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, PostgreSQL, Redis',
      '',
      '## Education',
      'B.S. Computer Science, Stanford University, 2016',
    ].join('\n')

    const { result } = renderHook(() => useResumeHealth(goodResume))
    expect(result.current.overall).toBeGreaterThanOrEqual(70)
    expect(result.current.overallGrade).toBe('A')
    expect(result.current.dimensions.length).toBe(5)
    expect(result.current.topAction).toBeTruthy()
    expect(result.current.summary).toBeTruthy()
  })

  it('penalizes too-short resumes', () => {
    const shortResume = 'Jane Doe\njane@test.com'
    const { result } = renderHook(() => useResumeHealth(shortResume))

    const lengthDim = result.current.dimensions.find((d) => d.key === 'length')
    expect(lengthDim).toBeDefined()
    expect(lengthDim!.score).toBeLessThan(50)
  })

  it('detects missing contact info', () => {
    const noContactResume = [
      'Summary: Developer',
      'Experience: worked at a company',
      'Education: BS CS',
      'Skills: python',
    ].join('\n')

    const { result } = renderHook(() => useResumeHealth(noContactResume))
    const contactDim = result.current.dimensions.find((d) => d.key === 'contact')
    expect(contactDim).toBeDefined()
    expect(contactDim!.score).toBeLessThan(80)
  })

  it('detects missing sections', () => {
    const partialResume = [
      'Summary: I am a developer.',
      'Experience: Built things.',
      'Education: BS CS',
      'Skills: React, Vue',
      'Email: test@test.com',
      'Phone: 555-0100',
    ].join('\n')

    const { result } = renderHook(() => useResumeHealth(partialResume))
    const sectionDim = result.current.dimensions.find((d) => d.key === 'sections')
    expect(sectionDim).toBeDefined()
    expect(sectionDim!.score).toBeGreaterThanOrEqual(75) // 3/4 found
  })

  it('rewards quantified bullet points', () => {
    const quantified = [
      'Email: test@test.com',
      'Summary: Developer',
      'Experience: Led team',
      'Education: BS',
      'Skills: Python',
      '- Increased revenue by 35% in Q3 2024',
      '- Managed 500+ production deployments',
      '- Reduced costs by $200K annually',
      '- Served 1M+ daily active users',
    ].join('\n')

    const { result } = renderHook(() => useResumeHealth(quantified))
    const bulletDim = result.current.dimensions.find((d) => d.key === 'bullets')
    expect(bulletDim).toBeDefined()
    expect(bulletDim!.score).toBeGreaterThanOrEqual(70)
  })

  it('provides grade colors for all grades', () => {
    expect(GRADE_COLORS.A).toBeTruthy()
    expect(GRADE_COLORS.B).toBeTruthy()
    expect(GRADE_COLORS.C).toBeTruthy()
    expect(GRADE_COLORS.D).toBeTruthy()
    expect(GRADE_COLORS.F).toBeTruthy()
  })

  it('generates actionable tips for poor scores', () => {
    const poorResume = 'x'.repeat(5000) // Very long, no structure
    const { result } = renderHook(() => useResumeHealth(poorResume))
    const allTips = result.current.dimensions.flatMap((d) => d.tips)
    expect(allTips.length).toBeGreaterThan(0)
  })
})
