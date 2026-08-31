import { useState, useCallback } from 'react'
import {
  useJobTracker,
  STATUS_CONFIG,
  type AppStatus,
  type JobApplication,
} from '../hooks/useJobTracker'
import './JobApplicationTracker.css'

/* ── Constants ─────────────────────────────────────────────── */

const NEXT_STATUS: Record<AppStatus, AppStatus | null> = {
  applied: 'screening',
  screening: 'interview',
  interview: 'offer',
  offer: null,
  rejected: null,
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/* ── Card ──────────────────────────────────────────────────── */

function AppCard({
  app,
  onAdvance,
  onDelete,
}: {
  app: JobApplication
  onAdvance: (id: string, s: AppStatus) => void
  onDelete: (id: string) => void
}) {
  const next = NEXT_STATUS[app.status]
  return (
    <div className="jat__card">
      <div className="jat__card-company">{app.company}</div>
      <div className="jat__card-role">{app.role}</div>
      <div className="jat__card-date">{formatDate(app.appliedAt)}</div>
      <div className="jat__card-actions">
        {next && (
          <button
            className="jat__card-btn jat__card-btn--next"
            onClick={() => onAdvance(app.id, next)}
            title={`Move to ${STATUS_CONFIG[next].label}`}
          >
            → {STATUS_CONFIG[next].icon}
          </button>
        )}
        <button
          className="jat__card-btn jat__card-btn--del"
          onClick={() => onDelete(app.id)}
          title="Remove"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

/* ── Pipeline Board ────────────────────────────────────────── */

function PipelineBoard({
  applications,
  onAdvance,
  onDelete,
}: {
  applications: JobApplication[]
  onAdvance: (id: string, s: AppStatus) => void
  onDelete: (id: string) => void
}) {
  const allStatuses: AppStatus[] = ['applied', 'screening', 'interview', 'offer', 'rejected']

  return (
    <div className="jat__pipeline">
      {allStatuses.map((status) => {
        const apps = applications.filter((a) => a.status === status)
        const cfg = STATUS_CONFIG[status]
        return (
          <div
            key={status}
            className="jat__column"
            style={{ '--col-color': cfg.color } as React.CSSProperties}
          >
            <div className="jat__col-header">
              <span className="jat__col-title">
                {cfg.icon} {cfg.label}
              </span>
              <span className="jat__col-count">{apps.length}</span>
            </div>
            {apps.map((app) => (
              <AppCard key={app.id} app={app} onAdvance={onAdvance} onDelete={onDelete} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

/* ── Funnel ────────────────────────────────────────────────── */

function Funnel({ stats }: { stats: ReturnType<typeof useJobTracker>['stats'] }) {
  const total = Math.max(stats.total, 1)
  return (
    <div className="jat__funnel">
      {(['applied', 'screening', 'interview', 'offer'] as AppStatus[]).map((s) => {
        const count = stats.byStatus[s]
        const pct = Math.round((count / total) * 100)
        const cfg = STATUS_CONFIG[s]
        return (
          <div key={s} className="jat__funnel-stage" style={{ background: cfg.color + '18' }}>
            <div className="jat__funnel-num" style={{ color: cfg.color }}>{count}</div>
            <div className="jat__funnel-label" style={{ color: cfg.color }}>{cfg.label}</div>
            <div className="jat__funnel-bar">
              <div className="jat__funnel-bar-fill" style={{ width: `${pct}%`, background: cfg.color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Main Export ────────────────────────────────────────────── */

export function JobApplicationTracker() {
  const { applications, stats, addApp, updateStatus, removeApp } = useJobTracker()
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')

  const handleAdd = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!company.trim() || !role.trim()) return
      addApp(company, role)
      setCompany('')
      setRole('')
    },
    [company, role, addApp],
  )

  const handleAdvance = useCallback(
    (id: string, status: AppStatus) => {
      updateStatus(id, status)
    },
    [updateStatus],
  )

  if (applications.length === 0) {
    return (
      <div className="jat">
        <div className="jat__header">
          <div>
            <h2 className="jat__title">Job Application Tracker</h2>
            <p className="jat__subtitle">Track your applications from submission to offer</p>
          </div>
        </div>
        <form className="jat__add-form" onSubmit={handleAdd}>
          <input
            className="jat__input"
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />
          <input
            className="jat__input"
            placeholder="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          />
          <button className="jat__add-btn" type="submit">+ Add</button>
        </form>
        <div className="jat__empty">
          <div className="jat__empty-icon">📋</div>
          <div className="jat__empty-text">No applications yet — add your first one above</div>
        </div>
      </div>
    )
  }

  return (
    <section className="jat" aria-label="Job application tracker">
      <div className="jat__header">
        <div>
          <h2 className="jat__title">Job Application Tracker</h2>
          <p className="jat__subtitle">
            {stats.total} application{stats.total !== 1 ? 's' : ''} · {stats.active} active
          </p>
        </div>
      </div>

      <form className="jat__add-form" onSubmit={handleAdd}>
        <input
          className="jat__input"
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
        />
        <input
          className="jat__input"
          placeholder="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        />
        <button className="jat__add-btn" type="submit">+ Add</button>
      </form>

      <div className="jat__stats">
        <div className="jat__stat">
          <div className="jat__stat-value">{stats.total}</div>
          <div className="jat__stat-label">Total</div>
        </div>
        <div className="jat__stat">
          <div className="jat__stat-value">{stats.active}</div>
          <div className="jat__stat-label">Active</div>
        </div>
        <div className="jat__stat">
          <div className="jat__stat-value">{stats.responseRate}%</div>
          <div className="jat__stat-label">Response</div>
        </div>
        <div className="jat__stat">
          <div className="jat__stat-value">{stats.interviewRate}%</div>
          <div className="jat__stat-label">Interview</div>
        </div>
        <div className="jat__stat">
          <div className="jat__stat-value">{stats.offerRate}%</div>
          <div className="jat__stat-label">Offer</div>
        </div>
      </div>

      <Funnel stats={stats} />
      <PipelineBoard
        applications={applications}
        onAdvance={handleAdvance}
        onDelete={removeApp}
      />
    </section>
  )
}

export default JobApplicationTracker
