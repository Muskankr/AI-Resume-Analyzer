import { useState } from 'react'
import {
  formatDuration,
  formatRange,
  type FindingSeverity,
  type TimelineData,
} from '../utils/timelineFormat'

interface TimelinePanelProps {
  timeline: TimelineData | null | undefined
  /** Open on first render. Off by default, like the score breakdown. */
  defaultExpanded?: boolean
}
import './TimelinePanel.css'

const SEVERITY_ICON: Record<FindingSeverity, string> = {
  high: '!',
  medium: '▲',
  low: '◦',
  info: 'i',
}

const SEVERITY_LABEL: Record<FindingSeverity, string> = {
  high: 'Fix this',
  medium: 'Worth a look',
  low: 'Polish',
  info: 'Note',
}

/**
 * The employment timeline: how long the resume covers, and what a reader would
 * notice about its dates.
 *
 * Recruiters read the dates before the bullets and ATS platforms parse them into
 * structured employment records, so a resume can score well on keywords and
 * still be filtered on its history. Nothing in the analyzer looked at dates
 * before this (#709).
 *
 * The panel says nothing when the backend could not read any dates. The dates
 * may well be there in a layout that did not survive text extraction, and
 * asserting "your resume has no dates" would send people looking for a problem
 * they do not have — so that case gets one explanatory line, not a list of
 * warnings.
 */
export function TimelinePanel({ timeline, defaultExpanded = false }: TimelinePanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (!timeline) return null

  const { parsed, ranges, findings, total_months, largest_gap_months, has_current_role } = timeline

  if (!parsed) {
    const note = findings[0]?.message
    return (
      <div className="timeline-panel timeline-panel--unparsed">
        <div className="timeline-header">
          <span className="timeline-title">Employment timeline</span>
        </div>
        <p className="timeline-empty">
          {note ?? 'We could not read any employment dates from this resume.'}
        </p>
      </div>
    )
  }

  const worst = findings[0]?.severity

  return (
    <div className="timeline-panel">
      <button
        type="button"
        className="timeline-header timeline-header--button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
      >
        <span className="timeline-title">Employment timeline</span>
        <span className="timeline-summary">
          {formatDuration(total_months)} across {ranges.length}{' '}
          {ranges.length === 1 ? 'role' : 'roles'}
          {has_current_role ? ' · currently employed' : ''}
        </span>
        {findings.length > 0 && (
          <span className={`timeline-badge timeline-badge--${worst}`}>
            {findings.length} {findings.length === 1 ? 'note' : 'notes'}
          </span>
        )}
        <span className="timeline-chevron" aria-hidden="true">
          {expanded ? '▾' : '▸'}
        </span>
      </button>

      {expanded && (
        <div className="timeline-body">
          <ol className="timeline-ranges">
            {ranges.map((range, index) => (
              <li key={`${range.text}-${index}`} className="timeline-range">
                <span className="timeline-range-dates">{formatRange(range)}</span>
                {range.line && range.line !== range.text && (
                  <span className="timeline-range-context">{range.line}</span>
                )}
              </li>
            ))}
          </ol>

          {largest_gap_months > 0 && (
            <p className="timeline-stat">
              Largest gap: <strong>{formatDuration(largest_gap_months)}</strong>
            </p>
          )}

          {findings.length === 0 ? (
            <p className="timeline-clean">
              Nothing stands out. Your dates are consistent and continuous.
            </p>
          ) : (
            <ul className="timeline-findings">
              {findings.map((finding) => (
                <li key={finding.code + finding.evidence} className="timeline-finding">
                  <span
                    className={`timeline-finding-flag timeline-finding-flag--${finding.severity}`}
                    title={SEVERITY_LABEL[finding.severity]}
                  >
                    {SEVERITY_ICON[finding.severity]}
                  </span>
                  <span className="timeline-finding-text">
                    {finding.message}
                    {finding.evidence && (
                      <span className="timeline-finding-evidence">{finding.evidence}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
