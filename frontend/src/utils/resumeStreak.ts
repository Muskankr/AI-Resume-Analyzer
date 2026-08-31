/**
 * How far a resume has moved since the first analysis in the history.
 *
 * The original sorted by a field that does not exist:
 *
 *     const sorted = [...history].sort(
 *       (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
 *     )
 *
 * `AnalysisEntry` carries `timestamp`, not `createdAt`. `new Date(undefined)`
 * is `Invalid Date`, subtracting two of those gives `NaN`, and a comparator
 * that returns `NaN` leaves the array in the order it was already in. Both the
 * server path (`/api/history/`) and the local one put the newest entry at index
 * 0, so `sorted[0]` was the *latest* analysis and `sorted[length - 1]` the
 * *first*: someone who went from 60% to 80% was told they had improved by
 * −25%, under an upward-trending arrow (#866).
 *
 * The file is TypeScript now for the same reason. `ResumeStreakBadge` is handed
 * `AnalysisEntry[]` by a `.tsx` caller, and an untyped `.js` helper in the
 * middle is precisely what let a field name that has never existed go
 * unnoticed.
 */

export interface StreakInput {
  /** Milliseconds since the epoch. What `AnalysisEntry` actually carries. */
  timestamp?: number
  /** Accepted as a fallback; see `entryTime`. */
  createdAt?: string | number | Date
  score?: number | string | null
}

export interface ResumeStreak {
  /** False when there is not enough history to say anything. */
  hasStreak: boolean
  totalAnalyses: number
  /** Relative change from the first score to the latest, rounded. */
  percentageImprovement: number
  /** Direction of the raw change, which stays meaningful when the percentage cannot be computed. */
  isImproved: boolean
  firstScore: number
  latestScore: number
}

const NO_STREAK: ResumeStreak = {
  hasStreak: false,
  totalAnalyses: 0,
  percentageImprovement: 0,
  isImproved: false,
  firstScore: 0,
  latestScore: 0,
}

/**
 * When an entry happened.
 *
 * `timestamp` is the field the app writes. `createdAt` is tolerated because a
 * payload persisted by an older build, or handed over by a caller reading
 * straight from the API, may carry that instead — and falling back to input
 * order is the failure this function exists to fix, so it should not be the
 * thing that happens when a shape is merely unfamiliar.
 *
 * Returns `null` rather than `0` for an unusable value: `0` is a real instant
 * (1 Jan 1970) and would sort such an entry to the front as if it were the
 * oldest.
 */
function entryTime(entry: StreakInput): number | null {
  if (typeof entry.timestamp === 'number' && Number.isFinite(entry.timestamp)) {
    return entry.timestamp
  }
  if (entry.createdAt !== undefined && entry.createdAt !== null) {
    const parsed = new Date(entry.createdAt).getTime()
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

/** A score we can do arithmetic with, or `null`. */
function entryScore(entry: StreakInput): number | null {
  if (entry.score === null || entry.score === undefined || entry.score === '') return null
  const value = Number(entry.score)
  return Number.isFinite(value) ? value : null
}

/**
 * Summarise the direction of travel across a history.
 *
 * Every branch returns the same shape. The original returned three fields on
 * the `initialScore === 0` path and four on the success path, so
 * `ResumeStreakBadge` destructured `isImproved` as `undefined` and silently
 * rendered the "no improvement" text.
 */
export function calculateResumeStreak(history: StreakInput[] = []): ResumeStreak {
  if (!Array.isArray(history)) return { ...NO_STREAK }

  // An entry with no usable score cannot be an endpoint of the comparison.
  // Keeping it would mean reporting "5 analyses" and then diffing two of them.
  const usable = history.filter((entry) => entryScore(entry) !== null)

  if (usable.length < 2) {
    return { ...NO_STREAK, totalAnalyses: usable.length }
  }

  // Oldest first. Entries with no usable time keep their relative position --
  // Array.prototype.sort is stable — rather than being pushed to one end,
  // where they would silently become the "first" or "latest" analysis.
  const sorted = [...usable].sort((a, b) => {
    const left = entryTime(a)
    const right = entryTime(b)
    if (left === null || right === null) return 0
    return left - right
  })

  const firstScore = entryScore(sorted[0]) as number
  const latestScore = entryScore(sorted[sorted.length - 1]) as number
  const delta = latestScore - firstScore

  // A relative change against zero is undefined, not infinite and not nothing.
  // Report 0 for the percentage but keep `isImproved` honest: going from 0% to
  // 40% is an improvement whatever the ratio does.
  const percentageImprovement =
    firstScore === 0 ? 0 : Math.round((delta / Math.abs(firstScore)) * 100)

  return {
    hasStreak: true,
    totalAnalyses: usable.length,
    percentageImprovement,
    isImproved: delta > 0,
    firstScore,
    latestScore,
  }
}
