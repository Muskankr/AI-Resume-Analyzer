import { useMemo } from 'react'
import type { AnalysisEntry } from '../hooks/useAnalysisHistory'

/* ── Types ─────────────────────────────────────────────────── */

export interface SkillTimelinePoint {
  label: string
  timestamp: number
  detectedSkills: string[]
}

export interface SkillEvolution {
  /** Canonical skill name (lowercased) */
  skill: string
  /** Display name (first-seen casing) */
  displayName: string
  /** How many uploads detected this skill */
  detectionCount: number
  /** Percentage of uploads that include this skill */
  consistency: number
  /** 'new' if only in recent uploads, 'stable' if always present, 'lost' if dropped */
  trend: 'new' | 'stable' | 'lost' | 'declining'
  /** Upload indices where this skill was detected (0-indexed, chronological) */
  detectedAtIndices: number[]
}

export interface ProgressMetrics {
  totalUploads: number
  uniqueSkillsEver: number
  currentSkillCount: number
  skillsGained: number
  skillsLost: number
  averageSkillCount: number
  mostConsistentSkill: string
  consistencyScore: number
}

export interface SkillsProgressData {
  timeline: SkillTimelinePoint[]
  evolutions: SkillEvolution[]
  metrics: ProgressMetrics
  topTrendingUp: SkillEvolution[]
  recentLosses: SkillEvolution[]
}

/* ── Pure computation helpers ───────────────────────────────── */

function normaliseSkill(raw: string): string {
  return raw.trim().toLowerCase()
}

function computeSkillsProgress(entries: AnalysisEntry[]): SkillsProgressData {
  // Chronological timeline
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp)

  const timeline: SkillTimelinePoint[] = sorted.map((entry) => {
    const detected = new Set<string>()
    for (const s of entry.skills) detected.add(normaliseSkill(s))
    for (const s of entry.matchedSkills) detected.add(normaliseSkill(s))
    return {
      label: new Date(entry.timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
      }),
      timestamp: entry.timestamp,
      detectedSkills: Array.from(detected),
    }
  })

  const total = timeline.length || 1

  // Build per-skill map: skill → display name, detection indices
  const skillMap = new Map<
    string,
    { displayName: string; indices: Set<number> }
  >()

  for (let i = 0; i < timeline.length; i++) {
    for (const raw of sorted[i].skills) {
      const key = normaliseSkill(raw)
      const existing = skillMap.get(key)
      if (existing) {
        existing.indices.add(i)
      } else {
        skillMap.set(key, { displayName: raw, indices: new Set([i]) })
      }
    }
    for (const raw of sorted[i].matchedSkills) {
      const key = normaliseSkill(raw)
      const existing = skillMap.get(key)
      if (existing) {
        existing.indices.add(i)
      } else {
        skillMap.set(key, { displayName: raw, indices: new Set([i]) })
      }
    }
  }

  const half = Math.floor(total / 2)
  const evolutions: SkillEvolution[] = Array.from(skillMap.entries()).map(
    ([skill, data]) => {
      const consistency = Math.round((data.indices.size / total) * 100)
      const inFirst = data.indices.has(0)
      const inLast = data.indices.has(total - 1)
      const recentCount = Array.from(data.indices).filter(
        (idx) => idx >= half,
      ).length
      const earlyCount = data.indices.size - recentCount

      let trend: SkillEvolution['trend'] = 'stable'
      if (!inLast && data.indices.size > 0) {
        trend = 'lost'
      } else if (inLast && !inFirst && data.indices.size <= Math.ceil(total / 3)) {
        trend = 'new'
      } else if (inLast && inFirst && recentCount < earlyCount * 0.6 && data.indices.size > 1) {
        trend = 'declining'
      }

      return {
        skill,
        displayName: data.displayName,
        detectionCount: data.indices.size,
        consistency,
        trend,
        detectedAtIndices: Array.from(data.indices).sort((a, b) => a - b),
      }
    },
  )

  evolutions.sort((a, b) => b.detectionCount - a.detectionCount)

  // Metrics
  const allSkillsEver = new Set<string>()
  for (const t of timeline) {
    for (const s of t.detectedSkills) allSkillsEver.add(s)
  }
  const currentSkills = new Set(
    timeline.length > 0
      ? timeline[timeline.length - 1].detectedSkills
      : [],
  )
  const firstSkills = new Set(
    timeline.length > 0 ? timeline[0].detectedSkills : [],
  )

  const skillsGained = Array.from(currentSkills).filter(
    (s) => !firstSkills.has(s),
  ).length
  const skillsLost = Array.from(firstSkills).filter(
    (s) => !currentSkills.has(s),
  ).length

  const avgSkillCount = timeline.length
    ? Math.round(
        timeline.reduce((sum, t) => sum + t.detectedSkills.length, 0) /
          timeline.length,
      )
    : 0

  const mostConsistent = evolutions.length > 0 ? evolutions[0].displayName : '—'

  const consistencyScore = evolutions.length
    ? Math.round(
        evolutions.reduce((sum, e) => sum + e.consistency, 0) /
          evolutions.length,
      )
    : 0

  const metrics: ProgressMetrics = {
    totalUploads: timeline.length,
    uniqueSkillsEver: allSkillsEver.size,
    currentSkillCount: currentSkills.size,
    skillsGained,
    skillsLost,
    averageSkillCount: avgSkillCount,
    mostConsistentSkill: mostConsistent,
    consistencyScore,
  }

  const topTrendingUp = evolutions
    .filter((e) => e.trend === 'new')
    .slice(0, 5)
  const recentLosses = evolutions
    .filter((e) => e.trend === 'lost')
    .slice(0, 5)

  return { timeline, evolutions, metrics, topTrendingUp, recentLosses }
}

/* ── React hook ────────────────────────────────────────────── */

export function useSkillsProgress(entries: AnalysisEntry[]): SkillsProgressData {
  return useMemo(() => computeSkillsProgress(entries), [entries])
}
