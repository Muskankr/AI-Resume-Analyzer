import { describe, expect, it } from 'vitest'

import { buildLeaderboardUrl, describeDenominator } from './leaderboardQuery'

const BASE = 'http://127.0.0.1:8000'

describe('buildLeaderboardUrl (#707)', () => {
  it('sends no query at all for the default request', () => {
    // Sending `?track=&limit=10` would be a second cache entry for the same
    // answer as the bare path.
    expect(buildLeaderboardUrl(BASE)).toBe(`${BASE}/api/skills-leaderboard/`)
  })

  it('encodes a track containing a space', () => {
    expect(buildLeaderboardUrl(BASE, { track: 'Backend Developer' })).toBe(
      `${BASE}/api/skills-leaderboard/?track=Backend+Developer`
    )
  })

  it('omits a blank or whitespace-only track', () => {
    expect(buildLeaderboardUrl(BASE, { track: '' })).not.toContain('track')
    expect(buildLeaderboardUrl(BASE, { track: '   ' })).not.toContain('track')
  })

  it('sends per_user only when counting people', () => {
    expect(buildLeaderboardUrl(BASE, { countedBy: 'user' })).toContain('per_user=true')
    expect(buildLeaderboardUrl(BASE, { countedBy: 'analysis' })).not.toContain('per_user')
  })

  it('sends a limit as an integer', () => {
    expect(buildLeaderboardUrl(BASE, { limit: 25 })).toContain('limit=25')
    expect(buildLeaderboardUrl(BASE, { limit: 25.7 })).toContain('limit=25')
  })

  it('ignores a non-finite limit rather than sending NaN', () => {
    expect(buildLeaderboardUrl(BASE, { limit: Number.NaN })).not.toContain('limit')
  })

  it('does not double the slash when the base ends in one', () => {
    expect(buildLeaderboardUrl(`${BASE}/`)).toBe(`${BASE}/api/skills-leaderboard/`)
  })

  it('combines every parameter', () => {
    const url = buildLeaderboardUrl(BASE, {
      track: 'Data Analyst',
      limit: 5,
      countedBy: 'user',
    })

    expect(url).toContain('track=Data+Analyst')
    expect(url).toContain('limit=5')
    expect(url).toContain('per_user=true')
  })
})

describe('describeDenominator', () => {
  it('names analyses when counting rows', () => {
    expect(describeDenominator('analysis', 1200)).toBe('% of 1,200 analyses')
  })

  it('names people when counting users', () => {
    expect(describeDenominator('user', 340)).toBe('% of 340 people')
  })

  it('falls back to analyses when the backend did not say', () => {
    expect(describeDenominator(undefined, 5)).toBe('% of 5 analyses')
  })
})
