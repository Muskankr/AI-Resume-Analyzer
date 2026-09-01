import { describe, it, expect } from 'vitest'
import {
  STATUS_ORDER,
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_ICONS,
  type ApplicationStatus,
} from '../hooks/useJobApplications'

describe('useJobApplications constants', () => {
  it('defines all five statuses', () => {
    expect(STATUS_ORDER).toHaveLength(5)
    expect(STATUS_ORDER).toContain('applied')
    expect(STATUS_ORDER).toContain('screening')
    expect(STATUS_ORDER).toContain('interviewed')
    expect(STATUS_ORDER).toContain('rejected')
    expect(STATUS_ORDER).toContain('offered')
  })

  it('has labels for every status', () => {
    for (const status of STATUS_ORDER) {
      expect(STATUS_LABELS[status]).toBeTruthy()
      expect(typeof STATUS_LABELS[status]).toBe('string')
    }
  })

  it('has colors for every status', () => {
    for (const status of STATUS_ORDER) {
      expect(STATUS_COLORS[status]).toMatch(/^#/)
    }
  })

  it('has icons for every status', () => {
    for (const status of STATUS_ORDER) {
      expect(STATUS_ICONS[status]).toBeTruthy()
    }
  })
})
