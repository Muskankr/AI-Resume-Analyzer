import { describe, it, expect } from 'vitest'
import { AtsScoringAnalyticsEngine } from './AtsScoringAnalyticsEngine'

describe('AtsScoringAnalyticsEngine Production Unit Tests', () => {
  it('filters candidate ATS reports by tier accurately', () => {
    const results = AtsScoringAnalyticsEngine.getReports({
      scoringTier: 'SENIOR',
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].scoringTier).toBe('SENIOR')
  })

  it('filters candidate ATS reports by search query', () => {
    const results = AtsScoringAnalyticsEngine.getReports({
      search: 'Samantha',
    })

    expect(results.length).toBe(1)
    expect(results[0].candidateName).toBe('Samantha Reed')
  })

  it('returns valid audit timeline logs', () => {
    const logs = AtsScoringAnalyticsEngine.getAuditLogs()
    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0].eventType).toBe('SCORE_RECALCULATED')
  })
})
