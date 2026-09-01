import { describe, it, expect } from 'vitest'
import { simulateScoreImpact, HIGH_IMPACT_SKILLS } from './whatIfSimulatorEngine'

describe('whatIfSimulatorEngine', () => {
  it('calculates score boost when missing skills are selected', () => {
    const baseScore = 65
    const currentSkills = ['React', 'JavaScript']
    const selected = ['TypeScript', 'Docker']

    const result = simulateScoreImpact(baseScore, currentSkills, selected)

    expect(result.baseScore).toBe(65)
    expect(result.projectedScore).toBeGreaterThan(65)
    expect(result.totalDelta).toBeGreaterThan(0)
    expect(result.skillBreakdown).toHaveLength(2)
    expect(result.isEstimate).toBe(true)
    expect(result.disclaimer).toContain('Estimates are algorithmically projected')
  })

  it('does not double count skills already present in candidate profile', () => {
    const baseScore = 70
    const currentSkills = ['React', 'TypeScript']
    const selected = ['React']

    const result = simulateScoreImpact(baseScore, currentSkills, selected)

    expect(result.totalDelta).toBe(0)
    expect(result.projectedScore).toBe(70)
    expect(result.skillBreakdown).toHaveLength(0)
  })

  it('caps maximum projected score at 99', () => {
    const baseScore = 95
    const currentSkills = ['HTML']
    const selected = ['TypeScript', 'Kubernetes', 'AWS', 'Python']

    const result = simulateScoreImpact(baseScore, currentSkills, selected)

    expect(result.projectedScore).toBe(99)
  })

  it('assigns correct readiness tiers based on projected score', () => {
    const resLow = simulateScoreImpact(50, [], [])
    expect(resLow.projectedReadinessTier).toBe('Junior')

    const resHigh = simulateScoreImpact(90, [], [])
    expect(resHigh.projectedReadinessTier).toBe('Lead')
  })
})
