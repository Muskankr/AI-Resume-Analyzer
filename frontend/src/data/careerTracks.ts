/**
 * The career tracks and experience levels the analyzer scores against.
 *
 * These live outside `CareerTrackSelector.tsx` so that file exports only a
 * component — the `react-refresh/only-export-components` rule, and it is a
 * real one here: mixing constants into a component module breaks fast refresh
 * for everything that imports them.
 *
 * The option lists were previously written out inline, twice, in `App.tsx`.
 * Having one source for them means a new track cannot be half-added.
 */

export const CAREER_TRACKS = ['Frontend Developer', 'Backend Developer', 'Data Analyst'] as const

export type CareerTrack = (typeof CAREER_TRACKS)[number]

export interface ExperienceLevelOption {
  /** Stored in localStorage and sent to the API. */
  value: string
  /** What the dropdown shows. */
  label: string
}

export const EXPERIENCE_LEVELS: readonly ExperienceLevelOption[] = [
  { value: 'Junior', label: 'Junior (0-2 yrs)' },
  { value: 'Mid-Level', label: 'Mid-Level (2-5 yrs)' },
  { value: 'Senior', label: 'Senior (5+ yrs)' },
] as const

/** The value used when nothing has been chosen or restored yet. */
export const DEFAULT_CAREER_TRACK: CareerTrack = 'Frontend Developer'
export const DEFAULT_EXPERIENCE_LEVEL = 'Mid-Level'
