import type { ChangeEvent } from 'react'
import { CAREER_TRACKS, EXPERIENCE_LEVELS } from '../data/careerTracks'

/**
 * The Target Career Track and Experience Level dropdowns.
 *
 * These controls used to be written out twice in `App.tsx` — once as a
 * free-standing banner under the page heading, and again inside the
 * "Step 1: Set Career Track & Experience" card. Both copies rendered
 * unconditionally, both hardcoded `id="roleSelect"` and
 * `id="experienceLevelSelect"`, and both were bound to the same state, so the
 * page showed the same two dropdowns twice and four elements shared two ids.
 *
 * Duplicate ids are not a cosmetic problem. `<label for>` resolves through
 * `getElementById`, which returns the first match, so *both* labels pointed at
 * the first dropdown: it had two labels and the second copy had none. A screen
 * reader announced the second pair as unnamed comboboxes, and clicking the
 * label above the second dropdown moved focus to the one further up the page.
 *
 * Keeping the markup in one component is what stops that coming back. `idPrefix`
 * exists so that if a second instance is ever genuinely wanted — a modal, a
 * compare view — it can have its own ids rather than colliding by default.
 */

interface CareerTrackSelectorProps {
  targetRole: string
  onTargetRoleChange: (value: string) => void
  experienceLevel: string
  onExperienceLevelChange: (value: string) => void
  /**
   * Prefix for the generated element ids. Only worth setting if the component
   * is rendered more than once in the same document — the default keeps the
   * ids the existing tests and any deep links already use.
   */
  idPrefix?: string
  /** Disables both dropdowns, e.g. while an analysis is running. */
  disabled?: boolean
  className?: string
}

export default function CareerTrackSelector({
  targetRole,
  onTargetRoleChange,
  experienceLevel,
  onExperienceLevelChange,
  idPrefix = '',
  disabled = false,
  className = '',
}: CareerTrackSelectorProps) {
  const roleId = `${idPrefix}roleSelect`
  const levelId = `${idPrefix}experienceLevelSelect`

  const handleRoleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onTargetRoleChange(event.target.value)
  }

  const handleLevelChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onExperienceLevelChange(event.target.value)
  }

  return (
    <div className={`career-track-selector ${className}`.trim()}>
      <div className="career-track-selector__field">
        <label htmlFor={roleId} className="career-track-selector__label">
          Target Career Track:
        </label>
        {/*
          `.custom-select-container` / `.custom-select-element` carry the themed
          chevron, the focus ring and the print rules from #261. The step-card
          copy of this markup used inline styles instead, which meant it lost
          the light-theme chevron and the focus-visible outline, and hardcoded
          `color: #fff` on the label so it was invisible on a light background.
        */}
        <div className="custom-select-container">
          <select
            id={roleId}
            value={targetRole}
            onChange={handleRoleChange}
            disabled={disabled}
            className="custom-select-element"
          >
            {CAREER_TRACKS.map((track) => (
              <option key={track} value={track}>
                {track}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="career-track-selector__field">
        <label htmlFor={levelId} className="career-track-selector__label">
          Experience Level:
        </label>
        <div className="custom-select-container">
          <select
            id={levelId}
            value={experienceLevel}
            onChange={handleLevelChange}
            disabled={disabled}
            className="custom-select-element"
          >
            {EXPERIENCE_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
