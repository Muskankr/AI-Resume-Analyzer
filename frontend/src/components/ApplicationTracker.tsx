import { useState, useCallback } from 'react'
import {
  useJobApplications,
  type ApplicationStatus,
  type JobApplication,
  type CreateApplicationPayload,
  STATUS_ORDER,
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_ICONS,
} from '../hooks/useJobApplications'
import './ApplicationTracker.css'

/* ------------------------------------------------------------------ */
/*  Kanban pipeline: Applied → Screening → Interviewed → Offered      */
/*  Rejected is shown separately as a "lost" column.                   */
/* ------------------------------------------------------------------ */

const PIPELINE_ORDER: ApplicationStatus[] = [
  'applied',
  'screening',
  'interviewed',
  'offered',
]

const NEXT_STATUS: Record<ApplicationStatus, ApplicationStatus | null> = {
  applied: 'screening',
  screening: 'interviewed',
  interviewed: 'offered',
  rejected: null,
  offered: null,
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="app-tracker__empty">
      <div className="app-tracker__empty-icon">📋</div>
      <p className="app-tracker__empty-text">No applications yet</p>
      <p className="app-tracker__empty-hint">
        Start tracking your job applications to see your pipeline here.
      </p>
      <button
        className="app-tracker__add-btn"
        style={{ marginTop: '1rem' }}
        onClick={onAdd}
      >
        + Add First Application
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Stats bar                                                          */
/* ------------------------------------------------------------------ */

function StatsBar({
  stats,
}: {
  stats: NonNullable<ReturnType<typeof useJobApplications>['stats']>
}) {
  return (
    <div className="app-tracker__stats">
      <div className="app-tracker__stat-card">
        <div className="app-tracker__stat-value app-tracker__stat-value--accent">
          {stats.total}
        </div>
        <div className="app-tracker__stat-label">Total</div>
      </div>
      <div className="app-tracker__stat-card">
        <div className="app-tracker__stat-value">{stats.interview_rate}%</div>
        <div className="app-tracker__stat-label">Interview Rate</div>
      </div>
      <div className="app-tracker__stat-card">
        <div className="app-tracker__stat-value">{stats.offer_rate}%</div>
        <div className="app-tracker__stat-label">Offer Rate</div>
      </div>
      <div className="app-tracker__stat-card">
        <div className="app-tracker__stat-value">
          {stats.applications_this_week}
        </div>
        <div className="app-tracker__stat-label">This Week</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Funnel visualization                                               */
/* ------------------------------------------------------------------ */

function Funnel({ stats }: { stats: NonNullable<ReturnType<typeof useJobApplications>['stats']> }) {
  const total = Math.max(stats.total, 1)

  return (
    <div className="app-tracker__funnel">
      {PIPELINE_ORDER.map((status) => {
        const count = stats.by_status[status] ?? 0
        const pct = Math.round((count / total) * 100)
        return (
          <div
            key={status}
            className="app-tracker__funnel-stage"
            style={{ background: STATUS_COLORS[status] + '22' }}
          >
            <div className="app-tracker__funnel-count" style={{ color: STATUS_COLORS[status] }}>
              {count}
            </div>
            <div className="app-tracker__funnel-label">{STATUS_LABELS[status]}</div>
            <div className="app-tracker__funnel-bar">
              <div
                className="app-tracker__funnel-bar-fill"
                style={{ width: `${pct}%`, background: STATUS_COLORS[status] }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Application card                                                   */
/* ------------------------------------------------------------------ */

function ApplicationCard({
  app,
  onAdvance,
  onDelete,
}: {
  app: JobApplication
  onAdvance: (id: number, status: ApplicationStatus) => void
  onDelete: (id: number) => void
}) {
  const next = NEXT_STATUS[app.status]

  return (
    <div className="app-tracker__card">
      <div className="app-tracker__card-company">{app.company_name}</div>
      <div className="app-tracker__card-title">{app.job_title}</div>
      <div className="app-tracker__card-date">{formatDate(app.applied_date)}</div>
      {app.notes && <div className="app-tracker__card-notes">{app.notes}</div>}
      <div className="app-tracker__card-actions">
        {next && (
          <button
            className="app-tracker__card-action-btn app-tracker__card-action-btn--next"
            onClick={() => onAdvance(app.id, next)}
            title={`Move to ${STATUS_LABELS[next]}`}
          >
            → {STATUS_LABELS[next]}
          </button>
        )}
        <button
          className="app-tracker__card-action-btn app-tracker__card-action-btn--delete"
          onClick={() => onDelete(app.id)}
          title="Remove application"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Kanban board                                                       */
/* ------------------------------------------------------------------ */

function KanbanBoard({
  applications,
  onAdvance,
  onDelete,
}: {
  applications: JobApplication[]
  onAdvance: (id: number, status: ApplicationStatus) => void
  onDelete: (id: number) => void
}) {
  const allColumns: ApplicationStatus[] = [...PIPELINE_ORDER, 'rejected']

  return (
    <div className="app-tracker__kanban">
      {allColumns.map((status) => {
        const apps = applications.filter((a) => a.status === status)
        return (
          <div
            key={status}
            className="app-tracker__column"
            style={{ '--column-color': STATUS_COLORS[status] } as React.CSSProperties}
          >
            <div className="app-tracker__column-header">
              <span className="app-tracker__column-icon">{STATUS_ICONS[status]}</span>
              <span className="app-tracker__column-title">{STATUS_LABELS[status]}</span>
              <span className="app-tracker__column-count">{apps.length}</span>
            </div>
            {apps.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                onAdvance={onAdvance}
                onDelete={onDelete}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Add-application modal                                              */
/* ------------------------------------------------------------------ */

function AddApplicationModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (payload: CreateApplicationPayload) => Promise<void>
}) {
  const [company, setCompany] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company.trim() || !title.trim()) return
    setSaving(true)
    try {
      await onSave({
        company_name: company.trim(),
        job_title: title.trim(),
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="app-tracker__modal-overlay" onClick={onClose}>
      <div className="app-tracker__modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="app-tracker__modal-title">Add Application</h3>
        <form onSubmit={handleSubmit}>
          <div className="app-tracker__form-group">
            <label className="app-tracker__form-label">Company</label>
            <input
              className="app-tracker__form-input"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Acme Corp"
              autoFocus
              required
            />
          </div>
          <div className="app-tracker__form-group">
            <label className="app-tracker__form-label">Job Title</label>
            <input
              className="app-tracker__form-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Frontend Engineer"
              required
            />
          </div>
          <div className="app-tracker__form-group">
            <label className="app-tracker__form-label">Notes (optional)</label>
            <textarea
              className="app-tracker__form-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Referrer, source, etc."
              rows={2}
            />
          </div>
          <div className="app-tracker__modal-actions">
            <button
              type="button"
              className="app-tracker__btn app-tracker__btn--secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="app-tracker__btn app-tracker__btn--primary"
              disabled={saving || !company.trim() || !title.trim()}
            >
              {saving ? 'Saving…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Status transition legend                                           */
/* ------------------------------------------------------------------ */

function TransitionLegend() {
  return (
    <div className="app-tracker__transitions">
      <div className="app-tracker__transitions-title">Pipeline Stages</div>
      <div className="app-tracker__transition-legend">
        {STATUS_ORDER.map((status) => (
          <div key={status} className="app-tracker__transition-item">
            <span
              className="app-tracker__transition-dot"
              style={{ background: STATUS_COLORS[status] }}
            />
            {STATUS_LABELS[status]}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

export function ApplicationTracker() {
  const {
    applications,
    stats,
    loading,
    error,
    createApplication,
    transitionStatus,
    deleteApplication,
  } = useJobApplications()

  const [showModal, setShowModal] = useState(false)

  const handleAdvance = useCallback(
    (id: number, status: ApplicationStatus) => {
      transitionStatus(id, status)
    },
    [transitionStatus],
  )

  const handleDelete = useCallback(
    (id: number) => {
      deleteApplication(id)
    },
    [deleteApplication],
  )

  if (loading) {
    return (
      <div className="app-tracker">
        <div className="app-tracker__loading">
          <div className="app-tracker__spinner" />
          Loading applications…
        </div>
      </div>
    )
  }

  return (
    <section className="app-tracker" aria-label="Job application tracker">
      <div className="app-tracker__header">
        <div>
          <h2 className="app-tracker__title">Application Tracker</h2>
          <p className="app-tracker__subtitle">
            Track your job search pipeline from application to offer
          </p>
        </div>
        <button className="app-tracker__add-btn" onClick={() => setShowModal(true)}>
          + Add Application
        </button>
      </div>

      {error && (
        <div className="app-tracker__stat-card" style={{ marginBottom: '1rem', color: '#f87171' }}>
          {error}
        </div>
      )}

      {applications.length === 0 ? (
        <EmptyState onAdd={() => setShowModal(true)} />
      ) : (
        <>
          {stats && <StatsBar stats={stats} />}
          {stats && <Funnel stats={stats} />}
          <KanbanBoard
            applications={applications}
            onAdvance={handleAdvance}
            onDelete={handleDelete}
          />
          <TransitionLegend />
        </>
      )}

      {showModal && (
        <AddApplicationModal
          onClose={() => setShowModal(false)}
          onSave={createApplication}
        />
      )}
    </section>
  )
}

export default ApplicationTracker
