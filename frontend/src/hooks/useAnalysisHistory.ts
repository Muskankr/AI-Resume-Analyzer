import { useState, useEffect, useCallback } from 'react'

export interface CoverLetterFeedback {
  length?: { status?: string; feedback?: string }
  tone?: { suggestions?: string[] }
  relevance?: { suggestions?: string[] }
}

export interface AnalysisEntry {
  id: string
  timestamp: number
  score: number
  skills: string[]
  suggestions: string[]
  matchedSkills: string[]
  missingSkills: string[]
  targetRole: string
  fileName: string
  source?: 'sample' | 'upload'
  share_id?: string
  coverLetterText?: string
  coverLetterFeedback?: CoverLetterFeedback
  interviewQuestions?: string[]
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // localStorage may be unavailable in restricted modes
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

  const markAllAsViewed = useCallback(() => {
    const now = Date.now()
    setLastViewedTimestamp(now)
    saveLastViewed(now)
  }, [])

  const unreadCount = entries.filter((entry) => entry.timestamp > lastViewedTimestamp).length

  const addEntry = useCallback((entry: Omit<AnalysisEntry, 'id' | 'timestamp'>) => {
    setEntries((prev) => {
      const filteredEntries = prev.filter((e) => e.fileName !== entry.fileName)
      const generatedId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

      const updated: AnalysisEntry[] = [
        {
          ...entry,
          id: generatedId,
          timestamp: Date.now(),
        },
        ...filteredEntries,
      ]
      return updated
    })
  }, [])

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const clearHistory = useCallback(() => {
    setEntries([])
  }, [])

  return {
    entries,
    unreadCount,
    lastViewedTimestamp,
    markAllAsViewed,
    addEntry,
    deleteEntry,
    clearHistory,
    setEntries,
  }
}
