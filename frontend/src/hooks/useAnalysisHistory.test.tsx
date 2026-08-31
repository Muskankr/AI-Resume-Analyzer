// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAnalysisHistory, clearStoredHistory, type AnalysisEntry } from './useAnalysisHistory'
import { clearSession, saveSession } from '../api/session'

const HISTORY_KEY = 'resume_analysis_history'
const LAST_VIEWED_KEY = 'resume_analysis_last_viewed'

const entry = (overrides: Partial<AnalysisEntry> = {}): AnalysisEntry => ({
  id: '1',
  timestamp: 1_000,
  score: 85,
  skills: ['React'],
  suggestions: [],
  matchedSkills: ['React'],
  missingSkills: ['Vue'],
  targetRole: 'Frontend Developer',
  fileName: 'resume.pdf',
  ...overrides,
})

const storedHistory = () => localStorage.getItem(HISTORY_KEY)

const signIn = () =>
  act(() => {
    saveSession({ username: 'ada', token: 'access-token', refresh: 'refresh-token' })
  })

const signOut = () => act(() => clearSession())

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('useAnalysisHistory sign-out (#864)', () => {
  it('wipes stored history when the session ends', () => {
    signIn()
    const { result } = renderHook(() => useAnalysisHistory())

    act(() => {
      result.current.setEntries([entry(), entry({ id: '2', fileName: 'resume-v2.pdf' })])
    })
    act(() => result.current.markAllAsViewed())

    expect(storedHistory()).toContain('resume-v2.pdf')
    expect(localStorage.getItem(LAST_VIEWED_KEY)).not.toBeNull()

    signOut()

    // The claim that matters is about storage, not about state: this is the
    // data that outlived the session and was shown to the next person.
    expect(storedHistory()).toBeNull()
    expect(localStorage.getItem(LAST_VIEWED_KEY)).toBeNull()
    expect(result.current.entries).toEqual([])
  })

  it('does not restore the previous account on the next mount', () => {
    signIn()
    const first = renderHook(() => useAnalysisHistory())
    act(() => first.result.current.setEntries([entry({ fileName: 'confidential.pdf' })]))
    expect(storedHistory()).toContain('confidential.pdf')

    signOut()
    first.unmount()

    const second = renderHook(() => useAnalysisHistory())
    expect(second.result.current.entries).toEqual([])
  })

  it('leaves a never-signed-in visitor alone', () => {
    // No session was ever saved, so nothing about a null session is a
    // transition. A guest's locally held history is theirs.
    const { result } = renderHook(() => useAnalysisHistory())

    act(() => result.current.setEntries([entry({ fileName: 'guest.pdf' })]))
    expect(storedHistory()).toContain('guest.pdf')

    signOut()

    expect(storedHistory()).toContain('guest.pdf')
    expect(result.current.entries).toHaveLength(1)
  })

  it('clears again when a second session ends', () => {
    signIn()
    const { result } = renderHook(() => useAnalysisHistory())
    act(() => result.current.setEntries([entry({ fileName: 'first.pdf' })]))
    signOut()

    signIn()
    act(() => result.current.setEntries([entry({ fileName: 'second.pdf' })]))
    expect(storedHistory()).toContain('second.pdf')

    signOut()
    expect(storedHistory()).toBeNull()
  })

  it('treats an expired session the same as an explicit sign-out', () => {
    // The axios interceptor calls clearSession() itself when a refresh fails,
    // which never touches the Logout button. Subscribing to the session rather
    // than to a logout callback is what makes both paths the same path.
    signIn()
    const { result } = renderHook(() => useAnalysisHistory())
    act(() => result.current.setEntries([entry({ fileName: 'expired.pdf' })]))

    act(() => clearSession())

    expect(storedHistory()).toBeNull()
    expect(result.current.entries).toEqual([])
  })
})

describe('useAnalysisHistory storage hygiene', () => {
  it('removes the key rather than storing an empty array', () => {
    const { result } = renderHook(() => useAnalysisHistory())

    act(() => result.current.setEntries([entry()]))
    expect(storedHistory()).not.toBeNull()

    act(() => result.current.clearHistory())
    expect(storedHistory()).toBeNull()
  })

  it('clearStoredHistory removes both keys', () => {
    localStorage.setItem(HISTORY_KEY, '[]')
    localStorage.setItem(LAST_VIEWED_KEY, '123')

    clearStoredHistory()

    expect(localStorage.getItem(HISTORY_KEY)).toBeNull()
    expect(localStorage.getItem(LAST_VIEWED_KEY)).toBeNull()
  })

  it('survives storage being unavailable', () => {
    const setItem = Storage.prototype.setItem
    const removeItem = Storage.prototype.removeItem
    Storage.prototype.setItem = () => {
      throw new Error('denied')
    }
    Storage.prototype.removeItem = () => {
      throw new Error('denied')
    }

    try {
      expect(() => clearStoredHistory()).not.toThrow()
    } finally {
      Storage.prototype.setItem = setItem
      Storage.prototype.removeItem = removeItem
    }
  })
})
