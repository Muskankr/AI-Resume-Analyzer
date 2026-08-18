import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  loadSession,
  saveSession,
  subscribeToSession,
  updateTokens,
} from './session'

/**
 * The stored session gained a `refresh` field. These pin down that it round
 * trips, that a refresh does not move a session between storages, and that
 * sessions written by an older build still load.
 */

describe('session storage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('round trips a session through localStorage when remembering', () => {
    saveSession({ username: 'ada', token: 'access-1', refresh: 'refresh-1' }, true)

    expect(loadSession()).toEqual({
      username: 'ada',
      token: 'access-1',
      refresh: 'refresh-1',
    })
    expect(localStorage.getItem('auth_user')).not.toBeNull()
    expect(sessionStorage.getItem('auth_user')).toBeNull()
  })

  it('uses sessionStorage when not remembering', () => {
    saveSession({ username: 'ada', token: 'access-1', refresh: 'refresh-1' }, false)

    expect(sessionStorage.getItem('auth_user')).not.toBeNull()
    expect(localStorage.getItem('auth_user')).toBeNull()
    expect(getAccessToken()).toBe('access-1')
  })

  it('exposes both tokens', () => {
    saveSession({ username: 'ada', token: 'access-1', refresh: 'refresh-1' })

    expect(getAccessToken()).toBe('access-1')
    expect(getRefreshToken()).toBe('refresh-1')
  })

  it('returns null tokens when signed out', () => {
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('loads a session written before refresh tokens were stored', () => {
    // No `refresh` key. It should load, just without the ability to renew.
    localStorage.setItem('auth_user', JSON.stringify({ username: 'ada', token: 'old' }))

    expect(loadSession()).toEqual({ username: 'ada', token: 'old' })
    expect(getRefreshToken()).toBeNull()
  })

  it('ignores a corrupt stored value', () => {
    localStorage.setItem('auth_user', 'not json{{')
    expect(loadSession()).toBeNull()
  })

  it('ignores a stored value with no access token', () => {
    localStorage.setItem('auth_user', JSON.stringify({ username: 'ada' }))
    expect(loadSession()).toBeNull()
  })

  describe('updateTokens', () => {
    it('replaces the access token and keeps the rest of the session', () => {
      saveSession({
        username: 'ada',
        token: 'access-1',
        refresh: 'refresh-1',
        avatarUrl: 'http://example.com/a.png',
      })

      updateTokens('access-2')

      expect(loadSession()).toEqual({
        username: 'ada',
        token: 'access-2',
        refresh: 'refresh-1',
        avatarUrl: 'http://example.com/a.png',
      })
    })

    it('stores a rotated refresh token when one is supplied', () => {
      saveSession({ username: 'ada', token: 'access-1', refresh: 'refresh-1' })

      updateTokens('access-2', 'refresh-2')

      expect(getRefreshToken()).toBe('refresh-2')
    })

    it('does not promote a sessionStorage session into localStorage', () => {
      // Refreshing must not quietly turn "don't remember me" into "remember me".
      saveSession({ username: 'ada', token: 'access-1', refresh: 'refresh-1' }, false)

      updateTokens('access-2')

      expect(localStorage.getItem('auth_user')).toBeNull()
      expect(sessionStorage.getItem('auth_user')).not.toBeNull()
      expect(getAccessToken()).toBe('access-2')
    })

    it('does nothing when there is no session', () => {
      updateTokens('access-2')
      expect(loadSession()).toBeNull()
    })
  })

  describe('subscribers', () => {
    it('notifies on save and on clear', () => {
      const listener = vi.fn()
      const unsubscribe = subscribeToSession(listener)

      const session = { username: 'ada', token: 'access-1', refresh: 'refresh-1' }
      saveSession(session)
      expect(listener).toHaveBeenCalledWith(session)

      clearSession()
      expect(listener).toHaveBeenCalledWith(null)

      unsubscribe()
    })

    it('stops notifying after unsubscribe', () => {
      const listener = vi.fn()
      subscribeToSession(listener)()

      saveSession({ username: 'ada', token: 'access-1' })

      expect(listener).not.toHaveBeenCalled()
    })

    it('notifies on a token refresh, so the UI can follow the session', () => {
      saveSession({ username: 'ada', token: 'access-1', refresh: 'refresh-1' })

      const listener = vi.fn()
      const unsubscribe = subscribeToSession(listener)

      updateTokens('access-2')

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ token: 'access-2' }))
      unsubscribe()
    })
  })
})
