import { describe, expect, it } from 'vitest'

import { calculateResumeStreak, type StreakInput } from './resumeStreak'

/** History as the app stores it: newest first, `timestamp`, no `createdAt`. */
const at = (timestamp: number, score: number | string | null): StreakInput => ({
  timestamp,
  score,
})

describe('calculateResumeStreak direction (#866)', () => {
  it('measures from the oldest entry to the newest, not the other way round', () => {
    // The regression. Newest first is the order both the API and the local
    // history use, and the old comparator left it untouched, so 60 -> 80 was
    // reported as -25%.
    const result = calculateResumeStreak([at(3_000, 80), at(2_000, 70), at(1_000, 60)])

    expect(result.firstScore).toBe(60)
    expect(result.latestScore).toBe(80)
    expect(result.percentageImprovement).toBe(33)
    expect(result.isImproved).toBe(true)
  })

  it('reports a decline as a decline', () => {
    const result = calculateResumeStreak([at(2_000, 60), at(1_000, 80)])

    expect(result.percentageImprovement).toBe(-25)
    expect(result.isImproved).toBe(false)
  })

  it('gives the same answer whatever order the entries arrive in', () => {
    const oldestFirst = calculateResumeStreak([at(1_000, 60), at(2_000, 70), at(3_000, 80)])
    const newestFirst = calculateResumeStreak([at(3_000, 80), at(2_000, 70), at(1_000, 60)])
    const shuffled = calculateResumeStreak([at(2_000, 70), at(3_000, 80), at(1_000, 60)])

    expect(newestFirst).toEqual(oldestFirst)
    expect(shuffled).toEqual(oldestFirst)
  })

  it('reads createdAt when that is all an entry carries', () => {
    const result = calculateResumeStreak([
      { createdAt: '2026-08-20T10:00:00Z', score: 90 },
      { createdAt: '2026-08-01T10:00:00Z', score: 45 },
    ])

    expect(result.firstScore).toBe(45)
    expect(result.latestScore).toBe(90)
    expect(result.isImproved).toBe(true)
  })

  it('prefers timestamp when both are present and disagree', () => {
    const result = calculateResumeStreak([
      { timestamp: 1_000, createdAt: '2030-01-01T00:00:00Z', score: 50 },
      { timestamp: 2_000, createdAt: '2000-01-01T00:00:00Z', score: 75 },
    ])

    expect(result.firstScore).toBe(50)
    expect(result.latestScore).toBe(75)
  })
})

describe('calculateResumeStreak shape', () => {
  it('returns every field on the not-enough-history path', () => {
    // The old version returned three fields here and four on success, so the
    // badge read `isImproved` as undefined.
    const result = calculateResumeStreak([at(1_000, 70)])

    expect(result).toEqual({
      hasStreak: false,
      totalAnalyses: 1,
      percentageImprovement: 0,
      isImproved: false,
      firstScore: 0,
      latestScore: 0,
    })
  })

  it('returns every field on the zero-first-score path', () => {
    const result = calculateResumeStreak([at(1_000, 0), at(2_000, 40)])

    expect(result.hasStreak).toBe(true)
    // A relative change against zero is undefined, so the percentage stays 0...
    expect(result.percentageImprovement).toBe(0)
    // ...but the direction is not in doubt.
    expect(result.isImproved).toBe(true)
    expect(result.firstScore).toBe(0)
    expect(result.latestScore).toBe(40)
  })

  it('reports no movement as no movement', () => {
    const result = calculateResumeStreak([at(1_000, 70), at(2_000, 70)])

    expect(result.percentageImprovement).toBe(0)
    expect(result.isImproved).toBe(false)
  })
})

describe('calculateResumeStreak degenerate input', () => {
  it('handles an empty history', () => {
    expect(calculateResumeStreak([]).hasStreak).toBe(false)
    expect(calculateResumeStreak([]).totalAnalyses).toBe(0)
  })

  it('handles no argument at all', () => {
    expect(calculateResumeStreak().hasStreak).toBe(false)
  })

  it('counts 0 rather than undefined when handed a non-array', () => {
    // The old guard returned `totalAnalyses: history.length`, which is
    // `undefined` for exactly the case the guard exists to catch.
    const result = calculateResumeStreak(null as unknown as StreakInput[])

    expect(result.totalAnalyses).toBe(0)
    expect(result.hasStreak).toBe(false)
  })

  it('ignores entries with no usable score', () => {
    const result = calculateResumeStreak([
      at(1_000, 50),
      at(2_000, null),
      at(3_000, 'n/a'),
      at(4_000, 75),
    ])

    // Two usable endpoints, so the count must say two -- reporting four and
    // then diffing two of them would be a lie about what was measured.
    expect(result.totalAnalyses).toBe(2)
    expect(result.firstScore).toBe(50)
    expect(result.latestScore).toBe(75)
  })

  it('accepts numeric strings, which is what a JSON payload often carries', () => {
    const result = calculateResumeStreak([at(1_000, '40'), at(2_000, '60')])

    expect(result.percentageImprovement).toBe(50)
  })

  it('says no streak when fewer than two entries have a score', () => {
    const result = calculateResumeStreak([at(1_000, 50), at(2_000, null)])

    expect(result.hasStreak).toBe(false)
    expect(result.totalAnalyses).toBe(1)
  })

  it('keeps input order for entries with no usable time rather than sorting them to an end', () => {
    const result = calculateResumeStreak([{ score: 30 }, { score: 45 }, { score: 60 }])

    expect(result.firstScore).toBe(30)
    expect(result.latestScore).toBe(60)
  })

  it('does not treat a missing timestamp as 1 Jan 1970', () => {
    // Coercing an unusable time to 0 would sort that entry to the front and
    // make it the "first analysis".
    const result = calculateResumeStreak([at(1_000, 90), { score: 10 }, at(2_000, 95)])

    expect(result.firstScore).toBe(90)
    expect(result.latestScore).toBe(95)
  })

  it('rounds rather than trailing decimals into the UI', () => {
    const result = calculateResumeStreak([at(1_000, 70), at(2_000, 78)])

    expect(result.percentageImprovement).toBe(11)
  })
})
