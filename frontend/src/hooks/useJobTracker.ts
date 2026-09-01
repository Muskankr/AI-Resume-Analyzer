import { useState, useEffect, useCallback, useMemo } from 'react'

/* ── Types ─────────────────────────────────────────────────── */

export type AppStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'rejected'

export interface JobApplication {
  id: string
  company: string
  role: string
  status: AppStatus
  appliedAt: number
  updatedAt: number
  notes: string
  url: string
}

export interface PipelineStats {
  total: number
  active: number
  byStatus: Record<AppStatus, number>
  responseRate: number
  interviewRate: number
  offerRate: number
  avgDaysToResponse: number
}

/* ── Constants ─────────────────────────────────────────────── */

const STORAGE_KEY = 'job_applications'

export const STATUS_CONFIG: Record<AppStatus, { label: string; color: string; icon: string; order: number }> = {
  applied: { label: 'Applied', color: '#60a5fa', icon: '📤', order: 0 },
  screening: { label: 'Screening', color: '#a78bfa', icon: '🔍', order: 1 },
  interview: { label: 'Interview', color: '#34d399', icon: '🎤', order: 2 },
  offer: { label: 'Offer', color: '#fbbf24', icon: '🎉', order: 3 },
  rejected: { label: 'Rejected', color: '#f87171', icon: '❌', order: 4 },
}

const PIPELINE: AppStatus[] = ['applied', 'screening', 'interview', 'offer']

/* ── Storage helpers ───────────────────────────────────────── */

function loadApps(): JobApplication[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveApps(apps: JobApplication[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps))
  } catch {
    // storage unavailable
  }
}

/* ── Pure helpers ───────────────────────────────────────────── */

function computeStats(apps: JobApplication[]): PipelineStats {
  const byStatus: Record<AppStatus, number> = {
    applied: 0, screening: 0, interview: 0, offer: 0, rejected: 0,
  }
  for (const app of apps) {
    byStatus[app.status]++
  }

  const total = apps.length
  const responded = byStatus.screening + byStatus.interview + byStatus.offer + byStatus.rejected
  const respondedApps = apps.filter((a) => a.status !== 'applied')
  const daysToResponse = respondedApps.map((a) =>
    Math.round((a.updatedAt - a.appliedAt) / (1000 * 60 * 60 * 24)),
  )
  const avgDaysToResponse = daysToResponse.length > 0
    ? Math.round(daysToResponse.reduce((s, d) => s + d, 0) / daysToResponse.length)
    : 0

  return {
    total,
    active: total - byStatus.offer - byStatus.rejected,
    byStatus,
    responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
    interviewRate: total > 0 ? Math.round((byStatus.interview / total) * 100) : 0,
    offerRate: total > 0 ? Math.round((byStatus.offer / total) * 100) : 0,
    avgDaysToResponse,
  }
}

/* ── Hook ──────────────────────────────────────────────────── */

export function useJobTracker() {
  const [applications, setApplications] = useState<JobApplication[]>(loadApps)

  useEffect(() => {
    saveApps(applications)
  }, [applications])

  const addApp = useCallback((company: string, role: string, url: string = '', notes: string = '') => {
    const now = Date.now()
    const app: JobApplication = {
      id: now.toString(36) + Math.random().toString(36).slice(2, 6),
      company: company.trim(),
      role: role.trim(),
      status: 'applied',
      appliedAt: now,
      updatedAt: now,
      notes: notes.trim(),
      url: url.trim(),
    }
    setApplications((prev) => [app, ...prev])
  }, [])

  const updateStatus = useCallback((id: string, newStatus: AppStatus) => {
    setApplications((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: newStatus, updatedAt: Date.now() } : a,
      ),
    )
  }, [])

  const updateNotes = useCallback((id: string, notes: string) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, notes, updatedAt: Date.now() } : a)),
    )
  }, [])

  const removeApp = useCallback((id: string) => {
    setApplications((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setApplications([])
  }, [])

  const stats = useMemo(() => computeStats(applications), [applications])

  const byStatus = useCallback(
    (status: AppStatus) => applications.filter((a) => a.status === status),
    [applications],
  )

  return { applications, stats, addApp, updateStatus, updateNotes, removeApp, clearAll, byStatus }
}
