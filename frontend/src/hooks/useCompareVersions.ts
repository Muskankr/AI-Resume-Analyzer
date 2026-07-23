import { useCallback, useState } from 'react'
import axios from 'axios'

export interface TextDiffLine {
  type: 'added' | 'removed'
  text: string
}

export interface VersionComparison {
  older_id: number
  newer_id: number
  older_label: string
  newer_label: string
  older_score: number
  newer_score: number
  score_delta: number
  added_skills: string[]
  removed_skills: string[]
  newly_matched_skills: string[]
  newly_missing_skills: string[]
  still_missing_skills: string[]
  text_diff: TextDiffLine[]
  insights: string[]
}

import { BACKEND_URL } from '../config'

export function useCompareVersions(token: string | undefined) {
  const [comparison, setComparison] = useState<VersionComparison | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const compare = useCallback(
    async (olderId: number | string, newerId: number | string) => {
      if (!token) {
        setError('Sign in to compare saved resume versions.')
        return
      }
      setLoading(true)
      setError(null)
      try {
        const res = await axios.get<VersionComparison>(`${BACKEND_URL}/api/compare/`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { older: olderId, newer: newerId },
        })
        setComparison(res.data)
      } catch (err) {
        const message =
          axios.isAxiosError(err) && err.response?.data?.error
            ? err.response.data.error
            : 'Failed to compare these versions.'
        setError(message)
        setComparison(null)
      } finally {
        setLoading(false)
      }
    },
    [token]
  )

  const reset = useCallback(() => {
    setComparison(null)
    setError(null)
  }, [])

  return { comparison, loading, error, compare, reset }
}
