/* eslint-disable @typescript-eslint/no-explicit-any */
export const updateLocalHistory = (newEntry: any) => {
  const STORAGE_KEY = 'anonymous_resume_history'
  const existingHistory = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')

  const isDuplicate = existingHistory.some(
    (item: any) => item.fileName === newEntry.fileName && item.score === newEntry.score
  )

  if (!isDuplicate) {
    const updatedHistory = [newEntry, ...existingHistory]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory))
    return updatedHistory
  }

  return existingHistory
}
