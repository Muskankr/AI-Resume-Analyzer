/**
 * Building the query string for `/api/skills-leaderboard/`.
 *
 * Small enough to have been inline, and worth pulling out anyway: the endpoint
 * gained two parameters that both affect what the numbers *mean*, and the URL
 * is now the one place where a mistake produces a plausible-looking but wrong
 * page rather than an error.
 */

export type CountedBy = 'analysis' | 'user'

export interface LeaderboardQuery {
  /** Career track, or `''` for every track. */
  track?: string
  /** How many skills each list should carry. The backend caps this at 50. */
  limit?: number
  /**
   * Count each skill once per person rather than once per analysis.
   *
   * With `'analysis'`, someone who re-runs the same resume eight times casts
   * eight votes, so the percentages track how often individuals re-upload as
   * much as how common a skill is.
   */
  countedBy?: CountedBy
}

/**
 * Return the path and query for a leaderboard request.
 *
 * Empty and default values are left out rather than sent explicitly, so the
 * common request stays a single cache entry on the backend instead of splitting
 * across `?track=&limit=10` and the bare path.
 */
export function buildLeaderboardUrl(base: string, query: LeaderboardQuery = {}): string {
  const params = new URLSearchParams()

  const track = query.track?.trim()
  if (track) params.set('track', track)

  if (typeof query.limit === 'number' && Number.isFinite(query.limit)) {
    params.set('limit', String(Math.trunc(query.limit)))
  }

  if (query.countedBy === 'user') params.set('per_user', 'true')

  const search = params.toString()
  const path = `${base.replace(/\/$/, '')}/api/skills-leaderboard/`
  return search ? `${path}?${search}` : path
}

/**
 * Sentence describing what a percentage on the page is a percentage *of*.
 *
 * The figure is meaningless without it, and the page previously showed a bare
 * "%" over a denominator labelled "Total Resumes Aggregated" — which is what it
 * was, but not what most readers assume it is.
 */
export function describeDenominator(countedBy: CountedBy | undefined, total: number): string {
  const noun = countedBy === 'user' ? 'people' : 'analyses'
  return `% of ${total.toLocaleString()} ${noun}`
}
