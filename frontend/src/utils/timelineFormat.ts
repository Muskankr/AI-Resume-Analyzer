/**
 * Types and formatting for the employment timeline, kept out of the component.
 *
 * `TimelinePanel.tsx` is a component module, and exporting helpers alongside a
 * component breaks React Fast Refresh — the whole module reloads instead of the
 * component's state surviving. Splitting also lets the formatting be tested as
 * the pure functions it is.
 *
 * Mirrors `analyzer/timeline.py`.
 */

export type FindingSeverity = 'high' | 'medium' | 'low' | 'info'

export interface TimelineFinding {
  code: string
  severity: FindingSeverity
  message: string
  /** Text from the resume the finding refers to, so it can be located. */
  evidence?: string
}

export interface TimelineRange {
  start_year: number
  start_month: number | null
  end_year: number | null
  end_month: number | null
  is_current: boolean
  text: string
  line?: string
}

export interface TimelineData {
  /** False when no dates could be read. Not the same as "there are none". */
  parsed: boolean
  ranges: TimelineRange[]
  findings: TimelineFinding[]
  total_months: number
  total_years: number
  largest_gap_months: number
  has_current_role: boolean
  formats_seen: string[]
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/**
 * Render one end of a range the way the resume wrote it, near enough.
 *
 * A year-only date stays a year rather than becoming "Jan 2021" — the whole
 * point of the `year_only_dates` finding is that we do not know the month, and
 * inventing one on the display would contradict the advice beside it.
 */
export function formatEndpoint(year: number | null, month: number | null): string {
  if (year === null) return 'Present'
  if (month === null || month < 1 || month > 12) return String(year)
  return `${MONTH_NAMES[month - 1]} ${year}`
}

export function formatRange(range: TimelineRange): string {
  const start = formatEndpoint(range.start_year, range.start_month)
  const end = range.is_current ? 'Present' : formatEndpoint(range.end_year, range.end_month)
  return `${start} – ${end}`
}

/** "4 years 3 months", or "9 months" under a year. */
export function formatDuration(totalMonths: number): string {
  if (totalMonths <= 0) return '0 months'
  if (totalMonths < 12) return `${totalMonths} month${totalMonths === 1 ? '' : 's'}`

  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  const yearPart = `${years} year${years === 1 ? '' : 's'}`
  if (months === 0) return yearPart
  return `${yearPart} ${months} month${months === 1 ? '' : 's'}`
}
