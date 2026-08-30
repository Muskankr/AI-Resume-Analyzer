import { useMemo, useState } from 'react'
import { analyzeSections, overallSectionScore, type ResumeSection } from '../utils/sectionAnalyzer'
import './SectionAnalyzer.css'

// ── Props ────────────────────────────────────────────────────────────────────

export interface SectionAnalyzerProps {
  resumeText: string
  skills: string[]
  defaultExpanded?: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const GRADE_COLOR: Record<ResumeSection['grade'], string> = {
  Excellent: '#22c55e',
  Good: '#3b82f6',
  Fair: '#f59e0b',
  Weak: '#ef4444',
  Missing: '#64748b',
}

const GRADE_BG: Record<ResumeSection['grade'], string> = {
  Excellent: 'rgba(34, 197, 94, 0.15)',
  Good: 'rgba(59, 130, 246, 0.15)',
  Fair: 'rgba(245, 158, 11, 0.15)',
  Weak: 'rgba(239, 68, 68, 0.15)',
  Missing: 'rgba(100, 116, 139, 0.1)',
}

// ── Sub-components ───────────────────────────────────────────────────────────

/** Single section card. */
function SectionCard({ section }: { section: ResumeSection }) {
  const [open, setOpen] = useState(false)
  const color = GRADE_COLOR[section.grade]

  return (
    <div className={`sa-card sa-card--${section.grade.toLowerCase()}`}>
      <button
        type="button"
        className="sa-card__header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="sa-card__icon">{section.icon}</span>
        <span className="sa-card__label">{section.label}</span>
        <span className="sa-card__meta">
          {section.wordCount > 0 && (
            <span className="sa-card__words">{section.wordCount} words</span>
          )}
          <span
            className="sa-card__grade"
            style={{ background: GRADE_BG[section.grade], color }}
          >
            {section.grade}
          </span>
          <span className="sa-card__score" style={{ color }}>
            {section.score}
          </span>
        </span>
        <span className="sa-card__chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="sa-card__body">
          {section.tips.length > 0 && (
            <ul className="sa-card__tips">
              {section.tips.map((tip, i) => (
                <li key={i} className="sa-card__tip">
                  <span className="sa-card__tip-icon" style={{ color }}>→</span>
                  {tip}
                </li>
              ))}
            </ul>
          )}
          {section.content ? (
            <pre className="sa-card__content">{section.content.slice(0, 800)}{section.content.length > 800 ? '…' : ''}</pre>
          ) : (
            <p className="sa-card__empty">No content detected for this section.</p>
          )}
        </div>
      )}
    </div>
  )
}

/** Health bar showing overall section score. */
function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'
  const label = score >= 70 ? 'Strong' : score >= 40 ? 'Moderate' : 'Needs Work'
  return (
    <div className="sa-health">
      <div className="sa-health__label">
        <span style={{ fontWeight: 700, color }}>Overall: {score}/100</span>
        <span className="sa-health__tag" style={{ color }}>{label}</span>
      </div>
      <div className="sa-health__bar" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
        <div className="sa-health__fill" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function SectionAnalyzer({ resumeText, skills, defaultExpanded = false }: SectionAnalyzerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const sections = useMemo(() => analyzeSections({ resumeText, skills }), [resumeText, skills])
  const overallScore = useMemo(() => overallSectionScore(sections), [sections])

  const presentCount = sections.filter((s) => s.grade !== 'Missing').length
  const missingCount = sections.length - presentCount

  if (!resumeText?.trim()) return null

  return (
    <section className="section-analyzer" aria-labelledby="sa-heading">
      <button
        type="button"
        className="sa-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="sa-panel"
      >
        <span className="sa-toggle__text">
          <span id="sa-heading" className="sa-toggle__title">📑 Section Analyzer</span>
          <span className="sa-toggle__subtitle">
            {presentCount} found{missingCount > 0 ? ` • ${missingCount} missing` : ''}
          </span>
        </span>
        <span className="sa-toggle__chevron">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div id="sa-panel" className="sa-panel">
          <HealthBar score={overallScore} />
          <div className="sa-list">
            {sections.map((s) => (
              <SectionCard key={s.key} section={s} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default SectionAnalyzer
