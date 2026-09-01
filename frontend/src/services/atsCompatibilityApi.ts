/**
 * Client for the ten-point ATS compatibility check.
 *
 * Talks to `POST /api/ats-compatibility/` (see
 * `backend/analyzer/ats_simulator_views.py`). The endpoint is public, so this
 * works whether or not the visitor is signed in; it still goes through the
 * shared `api` axios instance so an authenticated session is attached when
 * one exists.
 */

import { api } from '../api/client'

/** One of the ten criteria the resume is scored against. */
export interface AtsCriterion {
  id: string
  label: string
  /** Points awarded, 0..10. */
  earned: number
  /** Always 10. */
  max: number
  status: 'pass' | 'warn' | 'fail'
  why_it_matters: string
  /** Concrete things the checker saw in the resume text. */
  evidence: string[]
  fixes: { text: string; points: number }[]
}

export interface AtsPrioritizedFix {
  category: string
  severity: 'high' | 'medium' | 'low'
  text: string
  /** Points this fix would recover. */
  points: number
}

export interface AtsCompatibilityReport {
  /** Sum of the ten criteria, 0..100. */
  overall_score: number
  /** Letter grade A–F derived from `overall_score`. */
  grade: string
  rating: string
  /** Estimated % chance of clearing a typical ATS filter. */
  estimated_ats_pass_rate: number
  word_count: number
  summary: { passed: number; warnings: number; failed: number }
  criteria: AtsCriterion[]
  prioritized_fixes: AtsPrioritizedFix[]
}

export interface AtsCompatibilityRequest {
  resume_text: string
  /** Optional: paste the target job posting to score real keyword overlap. */
  job_description?: string
  /** Set when the source document is known to contain tables / columns. */
  has_tables?: boolean
  has_columns?: boolean
}

export async function fetchAtsCompatibility(
  payload: AtsCompatibilityRequest,
): Promise<AtsCompatibilityReport> {
  const res = await api.post<AtsCompatibilityReport>(
    '/api/ats-compatibility/',
    payload,
  )
  return res.data
}
