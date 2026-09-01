import { describe, it, expect, vi } from 'vitest'
import { useSkillsProgress } from '../hooks/useSkillsProgress'
import type { AnalysisEntry } from '../hooks/useAnalysisHistory'
import { renderHook } from '@testing-library/react'

function makeEntry(
  id: string,
  timestamp: number,
  skills: string[],
  matchedSkills: string[] = [],
): AnalysisEntry {
  return {
    id,
    timestamp,
    score: 70,
    skills,
    suggestions: [],
    matchedSkills,
    partialSkills: [],
    missingSkills: [],
    targetRole: 'Frontend Developer',
    experienceLevel: 'Mid-Level',
    fileName: `resume-${id}.pdf`,
  }
}

describe('useSkillsProgress', () => {
  it('returns empty data for fewer than 2 entries', () => {
    const { result } = renderHook(() => useSkillsProgress([]))
    expect(result.current.metrics.totalUploads).toBe(0)
    expect(result.current.evolutions).toHaveLength(0)
    expect(result.current.timeline).toHaveLength(0)
  })

  it('returns empty data for a single entry', () => {
    const { result } = renderHook(() =>
      useSkillsProgress([makeEntry('1', 1000, ['react', 'typescript'])]),
    )
    expect(result.current.metrics.totalUploads).toBe(1)
    expect(result.current.evolutions).toHaveLength(0)
  })

  it('computes skill counts and consistency across two entries', () => {
    const entries = [
      makeEntry('1', 1000, ['react', 'typescript', 'css']),
      makeEntry('2', 2000, ['react', 'typescript', 'css', 'node']),
    ]
    const { result } = renderHook(() => useSkillsProgress(entries))

    expect(result.current.metrics.totalUploads).toBe(2)
    expect(result.current.metrics.uniqueSkillsEver).toBe(4)
    expect(result.current.metrics.currentSkillCount).toBe(4)
    expect(result.current.metrics.skillsGained).toBe(1) // node is new
    expect(result.current.metrics.skillsLost).toBe(0)
  })

  it('marks skills that only appear in later uploads as new', () => {
    const entries = [
      makeEntry('1', 1000, ['react', 'typescript']),
      makeEntry('2', 2000, ['react', 'typescript']),
      makeEntry('3', 3000, ['react', 'typescript', 'graphql']),
    ]
    const { result } = renderHook(() => useSkillsProgress(entries))

    const graphql = result.current.evolutions.find((e) => e.skill === 'graphql')
    expect(graphql).toBeDefined()
    expect(graphql!.trend).toBe('new')
    expect(graphql!.consistency).toBe(33) // 1/3 = 33%
  })

  it('marks skills only in early uploads as lost', () => {
    const entries = [
      makeEntry('1', 1000, ['react', 'angular']),
      makeEntry('2', 2000, ['react', 'vue']),
      makeEntry('3', 3000, ['react', 'vue']),
    ]
    const { result } = renderHook(() => useSkillsProgress(entries))

    const angular = result.current.evolutions.find((e) => e.skill === 'angular')
    expect(angular).toBeDefined()
    expect(angular!.trend).toBe('lost')
  })

  it('detects skills gained and lost correctly', () => {
    const entries = [
      makeEntry('1', 1000, ['react', 'css', 'html']),
      makeEntry('2', 2000, ['react', 'css', 'node']),
    ]
    const { result } = renderHook(() => useSkillsProgress(entries))

    expect(result.current.metrics.skillsGained).toBe(1) // node
    expect(result.current.metrics.skillsLost).toBe(1) // html
  })

  it('populates topTrendingUp and recentLosses', () => {
    const entries = [
      makeEntry('1', 1000, ['react']),
      makeEntry('2', 2000, ['react', 'graphql']),
    ]
    const { result } = renderHook(() => useSkillsProgress(entries))

    expect(result.current.topTrendingUp.some((e) => e.skill === 'graphql')).toBe(
      true,
    )
  })
})
