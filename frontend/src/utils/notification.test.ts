// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  saveNotificationPreferences,
  sendAnalysisCompleteNotification,
} from './notification'

describe('notification preferences', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
  })

  it('uses opt-in browser notifications and opt-out in-app defaults', () => {
    expect(getNotificationPreferences()).toEqual(DEFAULT_NOTIFICATION_PREFERENCES)
  })

  it('persists preferences locally and emits a synchronization event', () => {
    const listener = vi.fn()
    window.addEventListener('notification-preferences-changed', listener)
    saveNotificationPreferences({ in_app: false, browser: true })
    expect(getNotificationPreferences()).toEqual({ in_app: false, browser: true })
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener('notification-preferences-changed', listener)
  })

  it('does not create a browser notification when the preference is off', () => {
    saveNotificationPreferences({ in_app: true, browser: false })
    const NotificationMock = vi.fn()
    Object.assign(NotificationMock, { permission: 'granted' })
    vi.stubGlobal('Notification', NotificationMock)
    sendAnalysisCompleteNotification('resume.pdf')
    expect(NotificationMock).not.toHaveBeenCalled()
  })

  it('creates a browser notification when opted in and permission is granted', () => {
    saveNotificationPreferences({ in_app: true, browser: true })
    const NotificationMock = vi.fn().mockImplementation(function() { return { close: vi.fn(), onclick: null }; })
    Object.assign(NotificationMock, { permission: 'granted' })
    vi.stubGlobal('Notification', NotificationMock)
    sendAnalysisCompleteNotification('resume.pdf')
    expect(NotificationMock).toHaveBeenCalledWith(
      'Resume Analysis Complete 🚀',
      expect.objectContaining({ body: expect.stringContaining('resume.pdf') })
    )
  })
})
