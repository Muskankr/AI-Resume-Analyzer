import { describe, it, expect, beforeEach } from 'vitest'
import { skillsDictionaryManager, INITIAL_SKILL_ENTRIES } from './skillsDictionaryManager'

describe('skillsDictionaryManager', () => {
  beforeEach(() => {
    skillsDictionaryManager.resetToDefaults()
    if (typeof window !== 'undefined') {
      localStorage.clear()
    }
  })

  it('initializes with system default skills and categories', () => {
    const skills = skillsDictionaryManager.getSkills()
    expect(skills.length).toBeGreaterThan(0)
    expect(skills.find((s) => s.name === 'React.js')).toBeDefined()
  })

  it('allows adding a new skill entry dynamically', () => {
    const newSkill = skillsDictionaryManager.addSkill({
      name: 'GraphQL',
      category: 'backend',
      patterns: ['graphql', 'gql'],
      description: 'Query language for APIs.',
      demandScore: 85,
    })

    expect(newSkill.id).toContain('skill-')
    expect(skillsDictionaryManager.getSkillById(newSkill.id)).toBeDefined()
  })

  it('supports updating existing skills', () => {
    const existing = skillsDictionaryManager.getSkills()[0]
    const updated = skillsDictionaryManager.updateSkill(existing.id, { demandScore: 99 })

    expect(updated.demandScore).toBe(99)
    expect(skillsDictionaryManager.getSkillById(existing.id)?.demandScore).toBe(99)
  })

  it('deletes skills correctly', () => {
    const existing = skillsDictionaryManager.getSkills()[0]
    const deleted = skillsDictionaryManager.deleteSkill(existing.id)

    expect(deleted).toBe(true)
    expect(skillsDictionaryManager.getSkillById(existing.id)).toBeUndefined()
  })

  it('searches skills by pattern and category filter', () => {
    const results = skillsDictionaryManager.searchSkills('react', 'frontend')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].name).toBe('React.js')
  })
})
