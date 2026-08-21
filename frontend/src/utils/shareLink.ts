/**
 * Share-link types and formatting, kept out of the component that renders them.
 *
 * `ShareResult.tsx` is a component module, and exporting helpers alongside a
 * component breaks React Fast Refresh — the whole module reloads instead of the
 * component's state surviving. Splitting also means the countdown can be tested
 * as the pure function it is.
 */

/** Mirrors `ShareStateSerializer` on the backend. */
export interface ShareState {
  share_id: string
  share_enabled: boolean
  share_created_at: string | null
  share_expires_at: string | null
  share_view_count: number
  is_live: boolean
  /** Null whenever the link is not live, so there is never a dead URL to copy. */
  share_url: string | null
  /** Only present when the server shortened a requested lifetime. */
  lifetime_clamped_to_days?: number
}

/** Offered lifetimes. 30 days matches the backend's own default. */
export const LIFETIME_CHOICES = [
  { days: 1, label: '24 hours' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
]

export const DEFAULT_LIFETIME_DAYS = 30

/**
 * Render an expiry timestamp as a countdown.
 *
 * Returns `''` for a missing or unparseable date so a caller can concatenate the
 * result without a guard, and `'expired'` rather than a negative number for a
 * date that has already passed — the link is still *enabled* at that point, and
 * the server evaluates expiry on read, so this state is reachable in a page that
 * has been open for a while.
 */
export function formatExpiry(iso: string | null): string {
  if (!iso) return ''

  const expires = new Date(iso)
  if (Number.isNaN(expires.getTime())) return ''

  const msLeft = expires.getTime() - Date.now()
  if (msLeft <= 0) return 'expired'

  const hoursLeft = Math.round(msLeft / 3_600_000)
  if (hoursLeft < 24) {
    return `expires in ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}`
  }

  const daysLeft = Math.round(hoursLeft / 24)
  return `expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
}
