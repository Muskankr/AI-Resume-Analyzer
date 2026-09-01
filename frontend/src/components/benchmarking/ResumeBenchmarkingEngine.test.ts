import { describe, it, expect } from 'vitest'
import { ResumeBenchmarkingEngine } from './ResumeBenchmarkingEngine'

describe('ResumeBenchmarkingEngine Unit Tests', () => {
  it('filters peer comparisons accurately based on industry domain', () => {
    const results = ResumeBenchmarkingEngine.getComparisons({
      industryDomain: 'FinTech & Banking',
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].industryDomain).toBe('FinTech & Banking')
  })

  it('calculates custom penalty score correctly', () => {
    const baseScore = 90
    const missingKeywords = 4
    const adjusted = ResumeBenchmarkingEngine.calculateCustomScore(baseScore, missingKeywords)
    expect(adjusted).toBe(84)
  })
})
