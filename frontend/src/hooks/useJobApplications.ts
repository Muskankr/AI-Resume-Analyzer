import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'

export interface JobApplication {
  id: number
  company_name: string
  job_title: string
  status: ApplicationStatus
  applied_date: string
  notes: string
  resume_analysis: number | null
}

export type ApplicationStatus =
  | 'applied'
  | 'screening'
  | 'interviewed'
  | 'rejected'
  | 'offered'

export const STATUS_ORDER: ApplicationStatus[] = [
  'applied',
  'screening',
  'interviewed',
  'rejected',
  'offered',
]

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interviewed: 'Interviewed',
  rejected: 'Rejected',
  offered: 'Offered',
}

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  applied: '#60a5fa',
  screening: '#a78bfa',
  interviewed: '#34d399',
  rejected: '#f87171',
  offered: '#fbbf24',
}

export const STATUS_ICONS: Record<ApplicationStatus, string> = {
  applied: '📤',
  screening: '🔍',
  interviewed: '🎤',
  rejected: '❌',
  offered: '🎉',
}

export interface ApplicationStats {
  total: number
  by_status: Record<ApplicationStatus, number>
  interview_rate: number
  offer_rate: number
  rejection_rate: number
  average_response_days: number
  applications_this_week: number
  applications_this_month: number
}

export interface CreateApplicationPayload {
  company_name: string
  job_title: string
  status?: ApplicationStatus
  notes?: string
  resume_analysis?: number | null
}

export interface UpdateApplicationPayload {
  company_name?: string
  job_title?: string
  status?: ApplicationStatus
  notes?: string
}

/**
 * Manages the full lifecycle of a user's job application tracker.
 *
 * Provides CRUD operations backed by the Django API, local stats
 * computation, and optimistic status transitions for the kanban-style
 * pipeline view.
 */
export function useJobApplications() {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [stats, setStats] = useState<ApplicationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/api/applications/')
      setApplications(response.data.results ?? response.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/api/applications/stats/')
      setStats(response.data)
    } catch {
      // Stats endpoint is optional; compute locally if unavailable
      computeLocalStats(applications)
    }
  }, [applications])

  const createApplication = useCallback(
    async (payload: CreateApplicationPayload) => {
      const response = await api.post('/api/applications/', payload)
      const created: JobApplication = response.data
      setApplications((prev) => [created, ...prev])
      return created
    },
    [],
  )

  const updateApplication = useCallback(
    async (id: number, payload: UpdateApplicationPayload) => {
      // Optimistic update
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, ...payload } : app)),
      )
      try {
        const response = await api.patch(`/api/applications/${id}/`, payload)
        const updated: JobApplication = response.data
        setApplications((prev) =>
          prev.map((app) => (app.id === id ? updated : app)),
        )
        return updated
      } catch (err: any) {
        // Revert on failure
        fetchApplications()
        throw err
      }
    },
    [fetchApplications],
  )

  const transitionStatus = useCallback(
    async (id: number, newStatus: ApplicationStatus) => {
      return updateApplication(id, { status: newStatus })
    },
    [updateApplication],
  )

  const deleteApplication = useCallback(async (id: number) => {
    // Optimistic removal
    setApplications((prev) => prev.filter((app) => app.id !== id))
    try {
      await api.delete(`/api/applications/${id}/`)
    } catch {
      fetchApplications()
    }
  }, [fetchApplications])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  useEffect(() => {
    if (applications.length > 0) {
      fetchStats()
    }
  }, [applications, fetchStats])

  // Compute local stats as a fallback / supplement
  function computeLocalStats(apps: JobApplication[]): ApplicationStats {
    const byStatus = {} as Record<ApplicationStatus, number>
    STATUS_ORDER.forEach((s) => (byStatus[s] = 0))
    apps.forEach((app) => {
      byStatus[app.status]++
    })

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const thisWeek = apps.filter(
      (a) => new Date(a.applied_date) >= weekAgo,
    ).length
    const thisMonth = apps.filter(
      (a) => new Date(a.applied_date) >= monthAgo,
    ).length

    const total = apps.length
    const interviewRate =
      total > 0 ? Math.round((byStatus.interviewed / total) * 100) : 0
    const offerRate =
      total > 0 ? Math.round((byStatus.offered / total) * 100) : 0
    const rejectionRate =
      total > 0 ? Math.round((byStatus.rejected / total) * 100) : 0

    const localStats: ApplicationStats = {
      total,
      by_status: byStatus,
      interview_rate: interviewRate,
      offer_rate: offerRate,
      rejection_rate: rejectionRate,
      average_response_days: 0,
      applications_this_week: thisWeek,
      applications_this_month: thisMonth,
    }
    setStats(localStats)
    return localStats
  }

  const applicationsByStatus = useCallback(
    (status: ApplicationStatus) => {
      return applications.filter((app) => app.status === status)
    },
    [applications],
  )

  return {
    applications,
    stats,
    loading,
    error,
    fetchApplications,
    createApplication,
    updateApplication,
    transitionStatus,
    deleteApplication,
    applicationsByStatus,
  }
}
