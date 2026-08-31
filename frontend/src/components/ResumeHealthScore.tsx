import { useResumeHealth, GRADE_COLORS, type HealthDimension } from '../hooks/useResumeHealth'
import './ResumeHealthScore.css'

/* ── SVG Ring ──────────────────────────────────────────────── */

function HealthRing({
  score,
  grade,
  color,
}: {
  score: number
  grade: string
  color: string
}) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="rhs__ring">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle className="rhs__ring-bg" cx="50" cy="50" r={radius} />
        <circle
          className="rhs__ring-fill"
          cx="50"
          cy="50"
          r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="rhs__ring-center">
        <span className="rhs__ring-score" style={{ color }}>
          {score}
        </span>
        <span className="rhs__ring-label">Grade {grade}</span>
      </div>
    </div>
  )
}

/* ── Dimension Row ─────────────────────────────────────────── */

function DimensionRow({ dim }: { dim: HealthDimension }) {
  const color = GRADE_COLORS[dim.grade]

  return (
    <div className="rhs__dimension">
      <div className="rhs__dim-header">
        <div className="rhs__dim-left">
          <span className="rhs__dim-grade" style={{ background: color + '22', color }}>
            {dim.grade}
          </span>
          <span className="rhs__dim-label">{dim.label}</span>
        </div>
        <span className="rhs__dim-score" style={{ color }}>
          {dim.score}/100
        </span>
      </div>

      <div className="rhs__dim-bar">
        <div className="rhs__dim-bar-fill" style={{ width: `${dim.score}%`, background: color }} />
      </div>

      <div className="rhs__dim-detail">{dim.detail}</div>

      {dim.tips.length > 0 && (
        <ul className="rhs__dim-tips">
          {dim.tips.map((tip, i) => (
            <li key={i} className="rhs__dim-tip">
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── Main Export ────────────────────────────────────────────── */

interface ResumeHealthScoreProps {
  resumeText: string
}

export function ResumeHealthScore({ resumeText }: ResumeHealthScoreProps) {
  const health = useResumeHealth(resumeText)

  if (!resumeText || resumeText.trim().length < 20) {
    return (
      <div className="rhs">
        <div className="rhs__empty">
          <div className="rhs__empty-icon">🩺</div>
          <div className="rhs__empty-text">
            Upload a resume to see its health score
          </div>
        </div>
      </div>
    )
  }

  const ringColor = GRADE_COLORS[health.overallGrade]

  return (
    <section className="rhs" aria-label="Resume health score">
      <div className="rhs__header">
        <h2 className="rhs__title">Resume Health Score</h2>
      </div>

      <div className="rhs__ring-section">
        <HealthRing score={health.overall} grade={health.overallGrade} color={ringColor} />
        <div className="rhs__ring-meta">
          <p className="rhs__ring-summary">{health.summary}</p>
          <p className="rhs__ring-action">
            <strong>Top action:</strong> {health.topAction}
          </p>
        </div>
      </div>

      <div className="rhs__dimensions">
        {health.dimensions.map((dim) => (
          <DimensionRow key={dim.key} dim={dim} />
        ))}
      </div>
    </section>
  )
}

export default ResumeHealthScore
