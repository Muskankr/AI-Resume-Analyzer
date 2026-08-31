import { describe, it, expect } from 'vitest'
import { ResumeVersioningEngine } from './ResumeVersioningEngine'

describe('ResumeVersioningEngine Unit Tests', () => {
  it('fetches versions list accurately', () => {
    const results = ResumeVersioningEngine.getVersions({})
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].versionId).toBe('VER-101')
  })
})
