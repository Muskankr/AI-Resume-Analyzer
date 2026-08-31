import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

import { calculateResumeStreak, type StreakInput } from '../utils/resumeStreak'

interface ResumeStreakBadgeProps {
  analysisHistory?: StreakInput[]
}

/**
 * "N analyses, +12% improvement" — the one-line summary of a history.
 *
 * The previous version rendered an upward-trending arrow unconditionally, next
 * to a percentage that was computed with its sign reversed (#866), so a user
 * whose score had fallen was congratulated on it. The icon now follows the
 * number, and the number is signed by the same value that chooses the icon.
 */
export const ResumeStreakBadge: React.FC<ResumeStreakBadgeProps> = ({ analysisHistory = [] }) => {
  const { hasStreak, totalAnalyses, percentageImprovement, isImproved, firstScore, latestScore } =
    calculateResumeStreak(analysisHistory)

  if (!hasStreak) return null

  const unchanged = percentageImprovement === 0 && !isImproved
  const Icon = unchanged ? Minus : isImproved ? TrendingUp : TrendingDown
  const tone = unchanged ? 'is-flat' : isImproved ? 'is-up' : 'is-down'

  const change = unchanged
    ? 'no change'
    : `${percentageImprovement > 0 ? '+' : ''}${percentageImprovement}%`

  return (
    <div className={`resume-streak-badge ${tone}`}>
      <Icon size={14} aria-hidden="true" />
      <span>
        {totalAnalyses} {totalAnalyses === 1 ? 'analysis' : 'analyses'}, {change}
      </span>
      {/* The bare percentage is not much use without the two numbers it came
       * from, and a screen reader reading "3 analyses, -25%" out of context is
       * worse than useless. */}
      <span className="sr-only">
        {` — first analysis scored ${firstScore}%, latest scored ${latestScore}%`}
      </span>
    </div>
  )
}

export default ResumeStreakBadge
