export interface HistoryEntry {
  id?: string
  fileName: string
  score: number
  skills?: string[]
  suggestions?: string[]
  matchedSkills?: string[]
  missingSkills?: string[]
  targetRole?: string
  timestamp?: string
}

const STORAGE_KEY = 'anonymous_resume_history'

export const updateLocalHistory = (newEntry: HistoryEntry): HistoryEntry[] => {
  const existingHistoryRaw = localStorage.getItem(STORAGE_KEY)
  const existingHistory: HistoryEntry[] = existingHistoryRaw
    ? JSON.parse(existingHistoryRaw)
    : []

  const isDuplicate = existingHistory.some(
    (item) => item.fileName === newEntry.fileName && item.score === newEntry.score
  )

  if (!isDuplicate) {
    const updatedHistory = [newEntry, ...existingHistory]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory))
    return updatedHistory
  }

  return existingHistory
}
