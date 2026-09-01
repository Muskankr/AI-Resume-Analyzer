import { describe, it, expect, beforeEach } from 'vitest'
import { careerTrackManager } from './careerTrackManager'

describe('careerTrackManager', () => {
  beforeEach(() => {
    careerTrackManager.resetToDefaults()
    if (typeof window !== 'undefined') {
      localStorage.clear()
    }
  })

  it('loads default system career tracks', () => {
    const tracks = careerTrackManager.getTracks()
    expect(tracks.length).toBeGreaterThan(0)
    expect(careerTrackManager.getTrackByName('Frontend Developer')).toBeDefined()
  })

  it('allows creating a new custom career track', () => {
    const created = careerTrackManager.addTrack({
      name: 'Fullstack Engineer',
      icon: '⚡',
      description: 'Combines frontend React and backend Python Node.js skill sets.',
      requiredSkills: ['React.js', 'Node.js', 'Python', 'TypeScript', 'SQL'],
      optionalSkills: ['Docker', 'AWS'],
      targetExperienceYears: 3,
      minScoreThreshold: 80,
    })

    expect(created.id).toContain('track-')
    expect(careerTrackManager.getTrackById(created.id)).toBeDefined()
  })

  it('updates existing career track definitions and skill requirements', () => {
    const track = careerTrackManager.getTracks()[0]
    const updated = careerTrackManager.updateTrack(track.id, {
      minScoreThreshold: 85,
    })

    expect(updated.minScoreThreshold).toBe(85)
    expect(careerTrackManager.getTrackById(track.id)?.minScoreThreshold).toBe(85)
  })

  it('deletes career tracks cleanly', () => {
    const track = careerTrackManager.getTracks()[0]
    const deleted = careerTrackManager.deleteTrack(track.id)

    expect(deleted).toBe(true)
    expect(careerTrackManager.getTrackById(track.id)).toBeUndefined()
  })

  it('calculates track match score against candidate skill set', () => {
    const result = careerTrackManager.calculateTrackMatch('track-frontend', [
      'React.js',
      'TypeScript',
      'JavaScript',
    ])

    expect(result.score).toBe(60) // 3 out of 5 required skills = 60%
    expect(result.missingRequired).toContain('HTML5')
    expect(result.matchedRequired).toContain('React.js')
  })
})
