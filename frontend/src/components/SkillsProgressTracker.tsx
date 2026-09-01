import type { AnalysisEntry } from '../hooks/useAnalysisHistory'
import {
  useSkillsProgress,
  type SkillEvolution,
  type ProgressMetrics,
} from '../hooks/useSkillsProgress'
import './SkillsProgressTracker.css'

/* ── Constants ─────────────────────────────────────────────── */

const TREND_LABELS: Record<SkillEvolution['trend'], string> = {
  new: 'New',
  stable: 'Stable',
  lost: 'Lost',
  declining: 'Fading',
}

const TREND_ICONS: Record<SkillEvolution['trend'], string> = {
  new: '✦',
  stable: '●',
  lost: '✕',
  declining: '↓',
}

function barLevel(pct: number): 'high' | 'mid' | 'low' {
  if (pct >= 70) return 'high'
  if (pct >= 40) return 'mid'
  return 'low'
}

/* ── Metrics Row ───────────────────────────────────────────── */

function MetricsRow({ m }: { m: ProgressMetrics }) {
  return (
    <div className="spt__metrics">
      <div className="spt__metric">
        <div className="spt__metric-value spt__metric-value--accent">
          {m.totalUploads}
        </div>
        <div className="spt__metric-label">Uploads</div>
      </div>
      <div className="spt__metric">
        <div className="spt__metric-value">{m.uniqueSkillsEver}</div>
        <div className="spt__metric-label">Total Skills</div>
      </div>
      <div className="spt__metric">
        <div className="spt__metric-value">{m.currentSkillCount}</div>
        <div className="spt__metric-label">Current</div>
      </div>
      <div className="spt__metric">
        <div className="spt__metric-value" style={{ color: '#34d399' }}>
          +{m.skillsGained}
        </div>
        <div className="spt__metric-label">Gained</div>
      </div>
      <div className="spt__metric">
        <div className="spt__metric-value" style={{ color: '#f87171' }}>
          -{m.skillsLost}
        </div>
        <div className="spt__metric-label">Lost</div>
      </div>
    </div>
  )
}

/* ── Timeline Chart ────────────────────────────────────────── */

function TimelineChart({
  points,
}: {
  points: { label: string; detectedSkills: string[] }[]
}) {
  if (points.length === 0) return null

  const maxCount = Math.max(...points.map((p) => p.detectedSkills.length), 1)
  const colors = ['#818cf8', '#60a5fa', '#34d399', '#fbbf24', '#f87171']

  return (
    <div className="spt__panel">
      <h4 className="spt__panel-title">📊 Skill Count Over Time</h4>
      <div className="spt__timeline" role="img" aria-label="Skill count timeline">
        {points.map((p, i) => {
          const height = Math.max(
            4,
            (p.detectedSkills.length / maxCount) * 100,
          )
          return (
            <div
              key={i}
              className="spt__timeline-bar"
              style={{
                height: `${height}%`,
                background: colors[i % colors.length],
              }}
              title={`${p.label}: ${p.detectedSkills.length} skills`}
            />
          )
        })}
      </div>
      <div className="spt__timeline-label">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  )
}

/* ── Skill List ────────────────────────────────────────────── */

function SkillList({ evolutions }: { evolutions: SkillEvolution[] }) {
  // Show top 20 most consistent
  const shown = evolutions.slice(0, 20)

  return (
    <div className="spt__panel">
      <h4 className="spt__panel-title">🔧 Skill Consistency</h4>
      <div className="spt__skill-list">
        {shown.map((e) => (
          <div key={e.skill} className="spt__skill-row">
            <span className="spt__skill-name" title={e.displayName}>
              {e.displayName}
            </span>
            <span className="spt__skill-pct">{e.consistency}%</span>
            <div className="spt__skill-bar">
              <div
                className={`spt__skill-bar-fill spt__skill-bar-fill--${barLevel(e.consistency)}`}
                style={{ width: `${e.consistency}%` }}
              />
            </div>
            <span className={`spt__trend-badge spt__trend-badge--${e.trend}`}>
              {TREND_ICONS[e.trend]} {TREND_LABELS[e.trend]}
            </span>
          </div>
        ))}
        {evolutions.length > 20 && (
          <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#64748b', paddingTop: '0.3rem' }}>
            +{evolutions.length - 20} more skills
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Highlights ────────────────────────────────────────────── */

function Highlights({
  trending,
  losses,
}: {
  trending: SkillEvolution[]
  losses: SkillEvolution[]
}) {
  if (trending.length === 0 && losses.length === 0) return null

  return (
    <div className="spt__panel">
      <h4 className="spt__panel-title">⚡ Notable Changes</h4>
      <div className="spt__highlights">
        <div className="spt__highlight-card">
          <div
            className="spt__highlight-title"
            style={{ color: '#34d399' }}
          >
            Newly Detected
          </div>
          <div className="spt__highlight-list">
            {trending.length === 0 ? (
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                None
              </span>
            ) : (
              trending.map((e) => (
                <span
                  key={e.skill}
                  className="spt__highlight-chip spt__highlight-chip--gain"
                >
                  {e.displayName}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="spt__highlight-card">
          <div
            className="spt__highlight-title"
            style={{ color: '#f87171' }}
          >
            No Longer Detected
          </div>
          <div className="spt__highlight-list">
            {losses.length === 0 ? (
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                None
              </span>
            ) : (
              losses.map((e) => (
                <span
                  key={e.skill}
                  className="spt__highlight-chip spt__highlight-chip--loss"
                >
                  {e.displayName}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main Export ────────────────────────────────────────────── */

interface SkillsProgressTrackerProps {
  entries: AnalysisEntry[]
}

export function SkillsProgressTracker({ entries }: SkillsProgressTrackerProps) {
  const { timeline, evolutions, metrics, topTrendingUp, recentLosses } =
    useSkillsProgress(entries)

  if (entries.length < 2) {
    return (
      <div className="spt">
        <div className="spt__empty">
          <div className="spt__empty-icon">📈</div>
          <div className="spt__empty-text">
            Upload at least 2 resumes to see skill evolution trends
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="spt" aria-label="Skills progress tracker">
      <div className="spt__header">
        <div>
          <h2 className="spt__title">Skills Progress</h2>
          <p className="spt__subtitle">
            Track how your skill profile evolves across {metrics.totalUploads} uploads
          </p>
        </div>
        <div
          className="spt__metric"
          style={{ padding: '0.4rem 0.7rem' }}
          title={`Average consistency across all ${evolutions.length} detected skills`}
        >
          <span
            className="spt__metric-value spt__metric-value--accent"
            style={{ fontSize: '1rem' }}
          >
            {metrics.consistencyScore}%
          </span>
          <span className="spt__metric-label" style={{ fontSize: '0.55rem' }}>
            Consistency
          </span>
        </div>
      </div>

      <MetricsRow m={metrics} />
      <TimelineChart points={timeline} />
      <Highlights trending={topTrendingUp} losses={recentLosses} />
      <SkillList evolutions={evolutions} />
    </section>
  )
}

export default SkillsProgressTracker
