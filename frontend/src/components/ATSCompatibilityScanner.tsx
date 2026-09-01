import { useCallback, useId, useMemo, useState } from 'react'
import {
  fetchAtsCompatibility,
  type AtsCompatibilityReport,
  type AtsCriterion,
} from '../services/atsCompatibilityApi'

// ─── Presentation helpers ───────────────────────────────────────────────────

/** Colour for a 0–100 percentage. */
function scoreColor(pct: number): string {
  if (pct >= 90) return '#10b981'
  if (pct >= 75) return '#3b82f6'
  if (pct >= 50) return '#f59e0b'
  return '#ef4444'
}

function gradeColor(grade: string): string {
  return { A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#ef4444' }[grade] ?? '#94a3b8'
}

const STATUS_META: Record<AtsCriterion['status'], { label: string; color: string; icon: string }> = {
  pass: { label: 'Pass', color: '#10b981', icon: '✅' },
  warn: { label: 'Needs work', color: '#f59e0b', icon: '⚠️' },
  fail: { label: 'Fail', color: '#ef4444', icon: '🚨' },
}

const SEVERITY_COLOR: Record<'high' | 'medium' | 'low', string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
}

const SAMPLE_RESUME = `Jordan Lee
jordan.lee@example.com  (555) 123-4567  linkedin.com/in/jordanlee  Austin, TX

Summary
Backend engineer with six years building payment and data platforms.

Work Experience
Senior Software Engineer, PayGrid
Mar 2021 - Present
- Led the billing service migration to an event-driven design, cutting p95
  latency by 40 percent and infrastructure spend by 30000 dollars per year.
- Built an ingestion pipeline processing 2000000 events per day.
- Mentored 4 engineers and shipped 18 releases with zero rollbacks.

Software Engineer, DataForge
Jun 2018 - Feb 2021
- Improved dashboard load time from 9 seconds to under 2 seconds for 15000 users.
- Automated releases, reducing deploy time from 3 hours to 20 minutes.

Education
B.S. in Computer Science, University of Texas at Austin, 2018

Skills
Python, Django, PostgreSQL, Redis, Kafka, Docker, Kubernetes, AWS, Terraform,
REST, GraphQL, CI/CD, Git, Linux, pytest`

// ─── Sub-components ─────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100)
  const color = scoreColor(score)
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" role="img" aria-label={`Overall score ${score} of 100`}>
      <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
      <circle
        cx="64"
        cy="64"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 64 64)"
      />
      <text x="64" y="58" textAnchor="middle" fontSize="30" fontWeight="800" fill={color}>
        {score}
      </text>
      <text x="64" y="80" textAnchor="middle" fontSize="12" fill="#94a3b8">
        / 100
      </text>
    </svg>
  )
}

function CriterionCard({ criterion }: { criterion: AtsCriterion }) {
  const pct = Math.round((criterion.earned / criterion.max) * 100)
  const meta = STATUS_META[criterion.status]
  return (
    <div className="ats-card ats-criterion">
      <div className="ats-criterion-head">
        <span className="ats-criterion-title">{criterion.label}</span>
        <span className="ats-chip" style={{ color: meta.color, borderColor: `${meta.color}55`, background: `${meta.color}14` }}>
          {meta.icon} {meta.label}
        </span>
      </div>
      <div className="ats-criterion-score">
        <span style={{ color: scoreColor(pct), fontWeight: 800 }}>{criterion.earned}</span>
        <span className="ats-muted"> / {criterion.max} points</span>
      </div>
      <div className="ats-bar">
        <div className="ats-bar-fill" style={{ width: `${pct}%`, background: scoreColor(pct) }} />
      </div>
      <p className="ats-why">{criterion.why_it_matters}</p>
      {criterion.evidence.length > 0 && (
        <ul className="ats-list ats-evidence">
          {criterion.evidence.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      {criterion.fixes.length > 0 && (
        <ul className="ats-list ats-fixes">
          {criterion.fixes.map((f, i) => (
            <li key={i}>
              <span className="ats-fix-points">+{f.points}</span> {f.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export function ATSCompatibilityScanner() {
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [hasTables, setHasTables] = useState(false)
  const [hasColumns, setHasColumns] = useState(false)
  const [report, setReport] = useState<AtsCompatibilityReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resumeFieldId = useId()
  const jdFieldId = useId()

  const analyze = useCallback(async () => {
    if (resumeText.trim().length < 30) {
      setError('Paste at least a few lines of resume text to analyze.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAtsCompatibility({
        resume_text: resumeText,
        job_description: jobDescription.trim() || undefined,
        has_tables: hasTables,
        has_columns: hasColumns,
      })
      setReport(result)
    } catch (err) {
      setError(
        'Could not reach the ATS compatibility service. Make sure the backend is running and try again.',
      )
      // eslint-disable-next-line no-console
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [resumeText, jobDescription, hasTables, hasColumns])

  const summaryTiles = useMemo(() => {
    if (!report) return []
    return [
      { label: 'Overall score', value: `${report.overall_score}/100`, color: scoreColor(report.overall_score) },
      { label: 'Letter grade', value: report.grade, color: gradeColor(report.grade) },
      {
        label: 'Est. ATS pass rate',
        value: `${report.estimated_ats_pass_rate}%`,
        color: scoreColor(report.estimated_ats_pass_rate),
      },
    ]
  }, [report])

  return (
    <div className="ats-root">
      <style>{STYLES}</style>

      <header className="ats-header">
        <h1 className="ats-h1">🤖 ATS Compatibility Checker</h1>
        <p className="ats-sub">
          Ten vendor-neutral checks against the formatting rules mainstream Applicant Tracking
          Systems rely on. Every score shows the evidence behind it and the fix worth the most points.
        </p>
      </header>

      {/* Input */}
      <section className="ats-card">
        <label htmlFor={resumeFieldId} className="ats-label">
          Resume text
        </label>
        <textarea
          id={resumeFieldId}
          className="ats-textarea"
          rows={10}
          placeholder="Paste the plain text of your resume here…"
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
        />

        <label htmlFor={jdFieldId} className="ats-label">
          Job description <span className="ats-muted">(optional — enables real keyword matching)</span>
        </label>
        <textarea
          id={jdFieldId}
          className="ats-textarea"
          rows={4}
          placeholder="Paste the target job posting to score keyword overlap…"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />

        <div className="ats-controls">
          <label className="ats-check">
            <input type="checkbox" checked={hasTables} onChange={(e) => setHasTables(e.target.checked)} />
            My resume uses tables
          </label>
          <label className="ats-check">
            <input type="checkbox" checked={hasColumns} onChange={(e) => setHasColumns(e.target.checked)} />
            …or multiple columns
          </label>
          <button
            type="button"
            className="ats-btn ats-btn-ghost"
            onClick={() => setResumeText(SAMPLE_RESUME)}
          >
            Load sample
          </button>
          <button type="button" className="ats-btn ats-btn-primary" onClick={analyze} disabled={loading}>
            {loading ? 'Analyzing…' : 'Analyze resume'}
          </button>
        </div>

        {error && <p className="ats-error" role="alert">{error}</p>}
      </section>

      {/* Results */}
      {report && (
        <>
          <section className="ats-card ats-summary">
            <ScoreRing score={report.overall_score} />
            <div className="ats-summary-tiles">
              {summaryTiles.map((t) => (
                <div key={t.label} className="ats-tile">
                  <div className="ats-tile-value" style={{ color: t.color }}>
                    {t.value}
                  </div>
                  <div className="ats-tile-label">{t.label}</div>
                </div>
              ))}
              <div className="ats-tile">
                <div className="ats-tile-value">
                  <span style={{ color: STATUS_META.pass.color }}>{report.summary.passed}</span>
                  {' · '}
                  <span style={{ color: STATUS_META.warn.color }}>{report.summary.warnings}</span>
                  {' · '}
                  <span style={{ color: STATUS_META.fail.color }}>{report.summary.failed}</span>
                </div>
                <div className="ats-tile-label">pass · warn · fail &nbsp;({report.word_count} words)</div>
              </div>
            </div>
          </section>

          {report.prioritized_fixes.length > 0 && (
            <section className="ats-card">
              <h2 className="ats-h2">🔧 Priority fixes</h2>
              <ol className="ats-priority">
                {report.prioritized_fixes.map((fix, i) => (
                  <li key={i}>
                    <span
                      className="ats-dot"
                      style={{ background: SEVERITY_COLOR[fix.severity] }}
                      aria-hidden
                    />
                    <span className="ats-priority-text">{fix.text}</span>
                    <span className="ats-fix-points">+{fix.points} pts</span>
                    <span className="ats-muted ats-priority-cat">{fix.category}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section aria-label="Category results" className="ats-grid">
            {report.criteria.map((c) => (
              <CriterionCard key={c.id} criterion={c} />
            ))}
          </section>
        </>
      )}
    </div>
  )
}

export default ATSCompatibilityScanner

// ─── Styles (scoped by the `ats-` prefix, responsive via media queries) ─────

const STYLES = `
.ats-root { max-width: 1100px; margin: 0 auto; padding: 24px 16px 64px;
  color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.ats-header { margin-bottom: 20px; }
.ats-h1 { font-size: 26px; font-weight: 800; margin: 0 0 8px;
  background: linear-gradient(135deg, #10b981, #3b82f6);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.ats-h2 { font-size: 16px; margin: 0 0 12px; }
.ats-sub { color: #94a3b8; font-size: 14px; margin: 0; max-width: 70ch; }
.ats-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px; padding: 18px; margin-bottom: 16px; }
.ats-label { display: block; font-size: 13px; font-weight: 600; margin: 12px 0 6px; }
.ats-label:first-child { margin-top: 0; }
.ats-muted { color: #94a3b8; font-weight: 400; }
.ats-textarea { width: 100%; box-sizing: border-box; resize: vertical;
  background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px; color: #e2e8f0; font: inherit; font-size: 13px; padding: 10px; }
.ats-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 14px; }
.ats-check { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #cbd5e1; }
.ats-btn { padding: 9px 18px; border-radius: 10px; font-size: 13px; font-weight: 600;
  cursor: pointer; border: 1px solid transparent; }
.ats-btn-primary { background: #3b82f6; color: #fff; }
.ats-btn-primary:disabled { opacity: 0.6; cursor: default; }
.ats-btn-ghost { background: rgba(255,255,255,0.05); color: #cbd5e1;
  border-color: rgba(255,255,255,0.12); }
.ats-btn-primary { margin-left: auto; }
.ats-error { color: #fca5a5; font-size: 13px; margin: 12px 0 0; }
.ats-summary { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.ats-summary-tiles { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 12px; flex: 1; min-width: 260px; }
.ats-tile { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px; padding: 12px; text-align: center; }
.ats-tile-value { font-size: 22px; font-weight: 800; }
.ats-tile-label { font-size: 11px; color: #94a3b8; margin-top: 4px; }
.ats-priority { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.ats-priority li { display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  background: rgba(255,255,255,0.03); border-radius: 8px; padding: 10px 12px; font-size: 13px; }
.ats-dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.ats-priority-text { flex: 1; min-width: 200px; }
.ats-priority-cat { font-size: 11px; }
.ats-fix-points { display: inline-block; background: rgba(16,185,129,0.14); color: #10b981;
  font-size: 11px; font-weight: 700; border-radius: 6px; padding: 1px 7px; }
.ats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.ats-criterion-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.ats-criterion-title { font-weight: 700; font-size: 14px; }
.ats-chip { font-size: 11px; font-weight: 600; border: 1px solid; border-radius: 999px; padding: 2px 9px; white-space: nowrap; }
.ats-criterion-score { font-size: 13px; margin: 8px 0 6px; }
.ats-bar { height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
.ats-bar-fill { height: 100%; border-radius: 3px; transition: width .4s ease; }
.ats-why { font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 10px 0 0; }
.ats-list { margin: 8px 0 0; padding-left: 18px; font-size: 12px; line-height: 1.55; }
.ats-evidence li { color: #cbd5e1; }
.ats-fixes li { color: #86efac; margin-top: 2px; list-style: none; margin-left: -18px; }
@media (max-width: 720px) {
  .ats-summary-tiles { grid-template-columns: repeat(2, 1fr); }
  .ats-grid { grid-template-columns: 1fr; }
  .ats-btn-primary { margin-left: 0; width: 100%; }
}
`
