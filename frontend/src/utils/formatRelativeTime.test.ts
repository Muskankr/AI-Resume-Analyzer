import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatRelativeTime } from './formatRelativeTime'

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty string for null/undefined input', () => {
    expect(formatRelativeTime(null)).toBe('')
    expect(formatRelativeTime(undefined)).toBe('')
    expect(formatRelativeTime('')).toBe('')
  })

  it('returns "Updated just now" for timestamps less than 1 minute ago', () => {
    const now = new Date()
    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000).toISOString()
    expect(formatRelativeTime(thirtySecondsAgo)).toBe('Updated just now')
  })

  it('returns "Updated X minute(s) ago" for timestamps less than 1 hour ago', () => {
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('Updated 5 minutes ago')

    const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000).toISOString()
    expect(formatRelativeTime(oneMinuteAgo)).toBe('Updated 1 minute ago')
  })

  it('returns "Updated X hour(s) ago" for timestamps less than 1 day ago', () => {
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(twoHoursAgo)).toBe('Updated 2 hours ago')

    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(oneHourAgo)).toBe('Updated 1 hour ago')
  })

  it('returns "Updated yesterday" for timestamps 1 day ago', () => {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(oneDayAgo)).toBe('Updated yesterday')
  })

  it('returns "Updated X days ago" for timestamps less than 1 week ago', () => {
    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(threeDaysAgo)).toBe('Updated 3 days ago')
  })

  it('returns formatted date for timestamps older than 1 week', () => {
    const now = new Date()
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const result = formatRelativeTime(twoWeeksAgo)
    expect(result).toMatch(/Updated on (\w{3} \d{1,2}|\d{1,2} \w{3})/)
  })
})
