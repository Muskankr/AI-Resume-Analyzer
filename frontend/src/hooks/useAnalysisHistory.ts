import { useState, useEffect, useCallback, useRef } from 'react'

import { loadSession, subscribeToSession } from '../api/session'

export interface PartialSkillItem {
  skill: string
  matched_variant?: string
  note?: string
}

export interface AnalysisEntry {
  id: string
  timestamp: number
  score: number
  skills: string[]
  suggestions: string[]
  matchedSkills: string[]
  partialSkills?: PartialSkillItem[]
  missingSkills: string[]
  targetRole: string
  experienceLevel?: string
  fileName: string
  source?: 'sample' | 'upload'
  share_id?: string
  coverLetterText?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  coverLetterFeedback?: any
  interviewQuestions?: string[]
  jobMatchScore?: number | null
}

const STORAGE_KEY = 'resume_analysis_history'
const LAST_VIEWED_KEY = 'resume_analysis_last_viewed'

function loadHistory(): AnalysisEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function saveHistory(entries: AnalysisEntry[]): void {
  try {
    if (entries.length === 0) {
      // Remove the key rather than writing `[]`. An empty array is not a leak,
      // but leaving the key behind means "signed out and cleared" and "never
      // used this browser" look different in storage for no reason, and it is
      // one more thing for the next reader to wonder about.
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // localStorage may be unavailable in restricted modes
  }
}

/**
 * Remove every trace of the browser-local history.
 *
 * Exported because signing out has to be able to do this even from code that
 * is not rendering the hook, and because it is the thing worth asserting on in
 * a test — the observable claim is "storage is empty", not "some state
 * variable was reset".
 */
export function clearStoredHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(LAST_VIEWED_KEY)
  } catch {
    // Nothing to clean up if storage was never reachable.
  }
}

function loadLastViewed(): number {
  try {
    const raw = localStorage.getItem(LAST_VIEWED_KEY)
    if (!raw) return 0
    const val = Number(raw)
    return isNaN(val) ? 0 : val
  } catch {
    return 0
  }
}

function saveLastViewed(ts: number): void {
  try {
    localStorage.setItem(LAST_VIEWED_KEY, ts.toString())
  } catch {
    // localStorage may be unavailable
  }
}

export function useAnalysisHistory() {
  const [entries, setEntries] = useState<AnalysisEntry[]>(() => loadHistory())
  const [lastViewedTimestamp, setLastViewedTimestamp] = useState<number>(() => loadLastViewed())

  // Sync to localStorage whenever entries change
  useEffect(() => {
    saveHistory(entries)
  }, [entries])

  /**
   * Drop the history from memory and from storage.
   *
   * Both halves matter. Clearing storage alone leaves the sidebar rendering
   * the rows until the page is reloaded; clearing state alone lets the mirror
   * effect below write them straight back.
   */
  const resetHistory = useCallback(() => {
    setEntries([])
    setLastViewedTimestamp(0)
    clearStoredHistory()
  }, [])

  /**
   * Signing out has to take the history with it.
   *
   * `App` fills `entries` from `/api/history/` for a signed-in user, and the
   * effect above mirrors whatever is in `entries` into localStorage so the
   * sidebar renders instantly on the next load. That is fine while the account
   * is signed in and not fine afterwards: `clearSession()` only removes the
   * `auth_user` key, so the previous account's file names, scores, target
   * roles and skill lists stayed in the browser and were rendered to whoever
   * opened the app next (#864).
   *
   * Subscribing to the session rather than taking an `onLogout` callback
   * covers the other way a session ends: the axios interceptor calls
   * `clearSession()` itself when a token refresh fails, and that path never
   * goes near the Logout button.
   *
   * The transition is what triggers the reset, not the absence of a session.
   * A visitor who has never signed in is signed out too, and their locally
   * held history is theirs to keep.
   */
  const hadSessionRef = useRef(loadSession() !== null)

  useEffect(() => {
    return subscribeToSession((session) => {
      const hasSession = session !== null
      if (hadSessionRef.current && !hasSession) {
        resetHistory()
      }
      hadSessionRef.current = hasSession
    })
  }, [resetHistory])

  const markAllAsViewed = useCallback(() => {
    const now = Date.now()
    setLastViewedTimestamp(now)
    saveLastViewed(now)
  }, [])

  const unreadCount = entries.filter((entry) => entry.timestamp > lastViewedTimestamp).length

  const addEntry = useCallback((entry: Omit<AnalysisEntry, 'id' | 'timestamp'>) => {
    setEntries((prev) => {
      const filteredEntries = prev.filter((e) => e.fileName !== entry.fileName)

      const updated: AnalysisEntry[] = [
        {
          ...entry,
          id: Date.now().toString(),
          timestamp: Date.now(),
        },
        ...filteredEntries,
      ]
      return updated
    })
  }, [])

  const deleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const clearHistory = () => {
    setEntries([])
  }

  return {
    entries,
    unreadCount,
    lastViewedTimestamp,
    markAllAsViewed,
    addEntry,
    deleteEntry,
    clearHistory,
    resetHistory,
    setEntries,
  }
}
