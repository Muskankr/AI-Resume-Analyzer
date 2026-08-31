import { useMemo, useState, useCallback } from 'react'
import {
  SKILL_DOMAINS,
  categoriseSkills,
  buildRadarPolygon,
  buildRadarRings,
  buildRadarAxes,
  verticesToPoints,
  domainCoverageScore,
  domainExtremes,
  type RadarPoint,
} from '../utils/skillsRadar'
import './SkillsRadar.css'

// ── Chart constants ──────────────────────────────────────────────────────────

const CHART_SIZE = 360
const CX = CHART_SIZE / 2
const CY = CHART_SIZE / 2
const MAX_RADIUS = 140
const LABEL_OFFSET = 18

// ── Props ────────────────────────────────────────────────────────────────────

export interface SkillsRadarChartProps {
  /** Flat list of detected skills (e.g. `["React", "Docker", "SQL"]`). */
  skills: string[]
  /** Domain keys the user wants to highlight. Empty = show all. */
  highlightDomains?: string[]
}

// ── Helper: domain label position (pushed out beyond the vertex) ─────────────

function labelPosition(idx: number, total: number): RadarPoint {
  const step = 360 / total
  const rad = (((step * idx) - 90) * Math.PI) / 180
  const r = MAX_RADIUS + LABEL_OFFSET
  return {
    x: CX + r * Math.cos(rad),
    y: CY + r * Math.sin(rad),
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

/** Tooltip shown on hover over a polygon vertex. */
function RadarTooltip({
  domainKey,
  skillCount,
  skills,
  position,
}: {
  domainKey: string
  skillCount: number
  skills: string[]
  position: RadarPoint
}) {
  const domain = SKILL_DOMAINS.find((d) => d.key === domainKey)
  if (!domain) return null
  const displayed = skills.slice(0, 6)
  const remaining = skills.length - displayed.length

  return (
    <div
      className="radar-tooltip"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 8}px`,
        transform: 'translate(-50%, -100%)',
      }}
      role="tooltip"
    >
      <div className="radar-tooltip__header">
        <span className="radar-tooltip__icon">{domain.icon}</span>
        <span className="radar-tooltip__domain">{domain.label}</span>
        <span className="radar-tooltip__count">{skillCount} skill{skillCount !== 1 ? 's' : ''}</span>
      </div>
      {skills.length > 0 && (
        <ul className="radar-tooltip__list">
          {displayed.map((s) => (
            <li key={s}>{s}</li>
          ))}
          {remaining > 0 && <li className="radar-tooltip__more">+{remaining} more</li>}
        </ul>
      )}
    </div>
  )
}

/** Legend below the chart. */
function RadarLegend({
  domainCounts,
  hoveredDomain,
  onHover,
  onLeave,
}: {
  domainCounts: Map<string, Set<string>>
  hoveredDomain: string | null
  onHover: (key: string) => void
  onLeave: () => void
}) {
  return (
    <div className="radar-legend" role="list" aria-label="Skill domains">
      {SKILL_DOMAINS.map((domain) => {
        const count = domainCounts.get(domain.key)?.size ?? 0
        const isHovered = hoveredDomain === domain.key
        const isEmpty = count === 0
        return (
          <button
            key={domain.key}
            type="button"
            className={`radar-legend__item${isHovered ? ' radar-legend__item--active' : ''}${isEmpty ? ' radar-legend__item--empty' : ''}`}
            onMouseEnter={() => onHover(domain.key)}
            onMouseLeave={onLeave}
            role="listitem"
            aria-label={`${domain.label}: ${count} skills`}
          >
            <span
              className="radar-legend__dot"
              style={{ background: domain.color }}
            />
            <span className="radar-legend__icon">{domain.icon}</span>
            <span className="radar-legend__label">{domain.label}</span>
            <span className="radar-legend__count">{count}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Coverage badge showing how many domains have at least one skill. */
function CoverageBadge({ score }: { score: number }) {
  const label = score >= 80 ? 'Excellent' : score >= 50 ? 'Good' : score >= 25 ? 'Narrow' : 'Sparse'
  const cls = score >= 80 ? 'coverage-badge--excellent' : score >= 50 ? 'coverage-badge--good' : score >= 25 ? 'coverage-badge--narrow' : 'coverage-badge--sparse'
  return (
    <div className={`coverage-badge ${cls}`}>
      <span className="coverage-badge__score">{score}%</span>
      <span className="coverage-badge__label">{label} Coverage</span>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function SkillsRadarChart({ skills, highlightDomains = [] }: SkillsRadarChartProps) {
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const domainCounts = useMemo(() => categoriseSkills(skills), [skills])

  const normalisedValues = useMemo(() => {
    const maxCount = Math.max(
      1,
      ...Array.from(domainCounts.values()).map((s) => s.size),
    )
    return SKILL_DOMAINS.map((d) => (domainCounts.get(d.key)?.size ?? 0) / maxCount)
  }, [domainCounts])

  const coverage = useMemo(() => domainCoverageScore(domainCounts), [domainCounts])
  const { strongest, weakest } = useMemo(() => domainExtremes(normalisedValues), [normalisedValues])

  const dataPolygon = useMemo(
    () => buildRadarPolygon(normalisedValues, CX, CY, MAX_RADIUS),
    [normalisedValues],
  )

  const rings = useMemo(() => buildRadarRings(CX, CY, MAX_RADIUS), [])
  const axes = useMemo(() => buildRadarAxes(CX, CY, MAX_RADIUS), [])

  const handleDomainHover = useCallback((key: string) => setHoveredDomain(key), [])
  const handleDomainLeave = useCallback(() => setHoveredDomain(null), [])

  if (skills.length === 0) return null

  const highlightSet = new Set(highlightDomains)

  return (
    <section className="skills-radar" aria-label="Skills radar chart">
      {/* Toggle header */}
      <button
        type="button"
        className="skills-radar__toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="skills-radar-panel"
      >
        <span className="skills-radar__toggle-text">
          <span id="skills-radar-heading" className="skills-radar__title">
            🕸️ Skills Radar
          </span>
          <span className="skills-radar__subtitle">
            {skills.length} skills across {Array.from(domainCounts.values()).filter((s) => s.size > 0).length} domains
          </span>
        </span>
        <span className="skills-radar__chevron" aria-hidden="true">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div id="skills-radar-panel" className="skills-radar__panel">
          <div className="skills-radar__content">
            {/* SVG chart */}
            <div className="skills-radar__chart-wrapper">
              <svg
                viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
                className="skills-radar__svg"
                role="img"
                aria-label="Radar chart of skill domains"
              >
                {/* Guide rings */}
                {rings.map((ring, ri) => (
                  <polygon
                    key={`ring-${ri}`}
                    points={verticesToPoints(ring)}
                    className="skills-radar__ring"
                  />
                ))}

                {/* Axis lines */}
                {axes.map((axis, ai) => (
                  <line
                    key={`axis-${ai}`}
                    x1={axis.from.x}
                    y1={axis.from.y}
                    x2={axis.to.x}
                    y2={axis.to.y}
                    className="skills-radar__axis"
                  />
                ))}

                {/* Data polygon */}
                <polygon
                  points={verticesToPoints(dataPolygon)}
                  className="skills-radar__polygon"
                />

                {/* Data vertices (interactive) */}
                {dataPolygon.map((pt, i) => {
                  const domain = SKILL_DOMAINS[i]
                  const isHovered = hoveredDomain === domain.key
                  const isHighlighted = highlightSet.has(domain.key)
                  const hasSkills = (domainCounts.get(domain.key)?.size ?? 0) > 0
                  return (
                    <g key={domain.key}>
                      {/* Larger invisible hit area */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={14}
                        className="skills-radar__hit-area"
                        onMouseEnter={() => handleDomainHover(domain.key)}
                        onMouseLeave={handleDomainLeave}
                      />
                      {/* Visible dot */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered || isHighlighted ? 6 : 4}
                        className={`skills-radar__dot${hasSkills ? ' skills-radar__dot--filled' : ''}`}
                        style={{ fill: domain.color }}
                        onMouseEnter={() => handleDomainHover(domain.key)}
                        onMouseLeave={handleDomainLeave}
                      />
                    </g>
                  )
                })}

                {/* Domain labels */}
                {SKILL_DOMAINS.map((domain, i) => {
                  const pos = labelPosition(i, SKILL_DOMAINS.length)
                  const isHovered = hoveredDomain === domain.key
                  return (
                    <text
                      key={`label-${domain.key}`}
                      x={pos.x}
                      y={pos.y}
                      className={`skills-radar__label${isHovered ? ' skills-radar__label--active' : ''}`}
                      textAnchor="middle"
                      dominantBaseline="central"
                      onMouseEnter={() => handleDomainHover(domain.key)}
                      onMouseLeave={handleDomainLeave}
                    >
                      {domain.icon} {domain.label}
                    </text>
                  )
                })}

                {/* Ring value labels (20%, 40%, 60%, 80%, 100%) */}
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((pct, ri) => (
                  <text
                    key={`ring-label-${ri}`}
                    x={CX + 4}
                    y={CY - pct * MAX_RADIUS + 4}
                    className="skills-radar__ring-label"
                  >
                    {Math.round(pct * 100)}
                  </text>
                ))}
              </svg>

              {/* Tooltip overlay */}
              {hoveredDomain && (() => {
                const idx = SKILL_DOMAINS.findIndex((d) => d.key === hoveredDomain)
                if (idx === -1) return null
                const pt = dataPolygon[idx]
                if (!pt) return null
                const skillsInDomain = Array.from(domainCounts.get(hoveredDomain) ?? [])
                return (
                  <RadarTooltip
                    domainKey={hoveredDomain}
                    skillCount={skillsInDomain.length}
                    skills={skillsInDomain}
                    position={pt}
                  />
                )
              })()}
            </div>

            {/* Side panel */}
            <div className="skills-radar__sidebar">
              <CoverageBadge score={coverage} />

              <div className="skills-radar__insight">
                {SKILL_DOMAINS[strongest] && (
                  <div className="skills-radar__insight-row">
                    <span className="skills-radar__insight-icon" style={{ color: SKILL_DOMAINS[strongest].color }}>
                      ▲ Strongest
                    </span>
                    <span className="skills-radar__insight-value">
                      {SKILL_DOMAINS[strongest].icon} {SKILL_DOMAINS[strongest].label}
                      {' '}
                      <span className="skills-radar__insight-count">
                        ({(domainCounts.get(SKILL_DOMAINS[strongest].key)?.size ?? 0)} skills)
                      </span>
                    </span>
                  </div>
                )}
                {SKILL_DOMAINS[weakest] && (
                  <div className="skills-radar__insight-row">
                    <span className="skills-radar__insight-icon" style={{ color: SKILL_DOMAINS[weakest].color }}>
                      ▼ Weakest
                    </span>
                    <span className="skills-radar__insight-value">
                      {SKILL_DOMAINS[weakest].icon} {SKILL_DOMAINS[weakest].label}
                      {' '}
                      <span className="skills-radar__insight-count">
                        ({(domainCounts.get(SKILL_DOMAINS[weakest].key)?.size ?? 0)} skills)
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Legend */}
          <RadarLegend
            domainCounts={domainCounts}
            hoveredDomain={hoveredDomain}
            onHover={handleDomainHover}
            onLeave={handleDomainLeave}
          />
        </div>
      )}
    </section>
  )
}

export default SkillsRadarChart
