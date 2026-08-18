import { useState } from 'react'
import './ScoreBreakdown.css'

export interface ScoreFactor {
  key: string
  label: string
  earned: number
  possible: number
  status: 'strong' | 'partial' | 'weak'
  detail: string
}

export interface ScoreBreakdownData {
  overall: number
  summary: string
  factors: ScoreFactor[]
}

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownData | null | undefined
  /** Open on first render. Off by default so the headline score stays the focus. */
  defaultExpanded?: boolean
}

const STATUS_ICON: Record<ScoreFactor['status'], string> = {
  strong: '✔',
  partial: '◐',
  weak: '!',
}

const STATUS_LABEL: Record<ScoreFactor['status'], string> = {
  strong: 'Strong',
  partial: 'Needs work',
  weak: 'Weak',
}

/**
 * Shows how the ATS score was arrived at: one row per factor, with the points
 * earned out of the points available and a sentence saying why.
 *
 * The headline number on its own only ever supported one piece of advice —
 * "add more keywords". This is the part that tells someone which lever to pull.
 */
export function ScoreBreakdown({ breakdown, defaultExpanded = false }: ScoreBreakdownProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (!breakdown || !breakdown.factors?.length) return null

  const { overall, summary, factors } = breakdown
  const weakest = factors.reduce((worst, factor) =>
    factor.earned / factor.possible < worst.earned / worst.possible ? factor : worst
  )

  return (
    <section className="score-breakdown" aria-labelledby="score-breakdown-heading">
      <button
        type="button"
        className="score-breakdown__toggle"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        aria-controls="score-breakdown-panel"
      >
        <span className="score-breakdown__toggle-text">
          <span id="score-breakdown-heading" className="score-breakdown__title">
            How this score was calculated
          </span>
          <span className="score-breakdown__overall">{overall}/100</span>
        </span>
        <span className="score-breakdown__chevron" aria-hidden="true">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      <p className="score-breakdown__summary">{summary}</p>

      {expanded && (
        <div id="score-breakdown-panel" className="score-breakdown__panel">
          <ul className="score-breakdown__list">
            {factors.map((factor) => {
              const percent = factor.possible
                ? Math.round((factor.earned / factor.possible) * 100)
                : 0

              return (
                <li
                  key={factor.key}
                  className={`score-breakdown__factor score-breakdown__factor--${factor.status}`}
                >
                  <div className="score-breakdown__factor-head">
                    <span
                      className="score-breakdown__status"
                      title={STATUS_LABEL[factor.status]}
                      aria-hidden="true"
                    >
                      {STATUS_ICON[factor.status]}
                    </span>
                    <span className="score-breakdown__label">{factor.label}</span>
                    <span className="score-breakdown__points">
                      <span className="sr-only">{STATUS_LABEL[factor.status]}. </span>
                      {factor.earned} / {factor.possible} pts
                    </span>
                  </div>

                  <div
                    className="score-breakdown__bar"
                    role="progressbar"
                    aria-valuenow={factor.earned}
                    aria-valuemin={0}
                    aria-valuemax={factor.possible}
                    aria-label={`${factor.label}: ${factor.earned} of ${factor.possible} points`}
                  >
                    <div className="score-breakdown__bar-fill" style={{ width: `${percent}%` }} />
                  </div>

                  <p className="score-breakdown__detail">{factor.detail}</p>
                </li>
              )
            })}
          </ul>

          <p className="score-breakdown__footnote">
            Weights total 100 points. The biggest single opportunity right now is{' '}
            <strong>{weakest.label.toLowerCase()}</strong>, worth up to{' '}
            {weakest.possible - weakest.earned} more points.
          </p>
        </div>
      )}
    </section>
  )
}

export default ScoreBreakdown
