import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useJobTracker } from '../hooks/useJobTracker'

describe('useJobTracker', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with empty state', () => {
    const { result } = renderHook(() => useJobTracker())
    expect(result.current.applications).toHaveLength(0)
    expect(result.current.stats.total).toBe(0)
  })

  it('adds a new application', () => {
    const { result } = renderHook(() => useJobTracker())

    act(() => {
      result.current.addApp('Google', 'Frontend Engineer')
    })

    expect(result.current.applications).toHaveLength(1)
    expect(result.current.applications[0].company).toBe('Google')
    expect(result.current.applications[0].role).toBe('Frontend Engineer')
    expect(result.current.applications[0].status).toBe('applied')
    expect(result.current.stats.total).toBe(1)
    expect(result.current.stats.active).toBe(1)
  })

  it('advances application status', () => {
    const { result } = renderHook(() => useJobTracker())

    act(() => {
      result.current.addApp('Meta', 'Backend Engineer')
    })

    const id = result.current.applications[0].id

    act(() => {
      result.current.updateStatus(id, 'screening')
    })

    expect(result.current.applications[0].status).toBe('screening')
    expect(result.current.stats.byStatus.screening).toBe(1)
  })

  it('computes pipeline stats correctly', () => {
    const { result } = renderHook(() => useJobTracker())

    act(() => {
      result.current.addApp('Company A', 'Role A')
      result.current.addApp('Company B', 'Role B')
      result.current.addApp('Company C', 'Role C')
    })

    const ids = result.current.applications.map((a) => a.id)

    act(() => {
      result.current.updateStatus(ids[0], 'interview')
      result.current.updateStatus(ids[1], 'rejected')
    })

    expect(result.current.stats.total).toBe(3)
    expect(result.current.stats.active).toBe(2) // A=interview, C=applied (B rejected, so 3-1=2)
    expect(result.current.stats.byStatus.applied).toBe(1)
    expect(result.current.stats.byStatus.interview).toBe(1)
    expect(result.current.stats.byStatus.rejected).toBe(1)
    expect(result.current.stats.interviewRate).toBe(33) // 1/3 ≈ 33%
  })

  it('removes an application', () => {
    const { result } = renderHook(() => useJobTracker())

    act(() => {
      result.current.addApp('Company X', 'Role X')
    })

    const id = result.current.applications[0].id

    act(() => {
      result.current.removeApp(id)
    })

    expect(result.current.applications).toHaveLength(0)
  })

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useJobTracker())

    act(() => {
      result.current.addApp('Startup', 'Dev')
    })

    // Read directly from localStorage
    const stored = JSON.parse(localStorage.getItem('job_applications') || '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].company).toBe('Startup')
  })

  it('loads from localStorage on mount', () => {
    // Pre-populate localStorage
    const mockData = [
      {
        id: 'test1',
        company: 'Preloaded',
        role: 'Senior Dev',
        status: 'interview',
        appliedAt: Date.now(),
        updatedAt: Date.now(),
        notes: '',
        url: '',
      },
    ]
    localStorage.setItem('job_applications', JSON.stringify(mockData))

    const { result } = renderHook(() => useJobTracker())
    expect(result.current.applications).toHaveLength(1)
    expect(result.current.applications[0].company).toBe('Preloaded')
  })
})
