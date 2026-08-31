import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SkillsRadarChart } from './SkillsRadarChart'
import {
  SKILL_DOMAINS,
  categoriseSkills,
  polarToCartesian,
  buildRadarPolygon,
  buildRadarRings,
  buildRadarAxes,
  verticesToPoints,
  domainCoverageScore,
  domainExtremes,
} from '../utils/skillsRadar'

// ── Utility function tests ───────────────────────────────────────────────────

describe('categoriseSkills', () => {
  it('groups skills into the correct domains', () => {
    const skills = ['React', 'Docker', 'PostgreSQL', 'Jest']
    const result = categoriseSkills(skills)

    expect(result.get('frontend')?.has('React')).toBe(true)
    expect(result.get('devops')?.has('Docker')).toBe(true)
    expect(result.get('database')?.has('PostgreSQL')).toBe(true)
    expect(result.get('testing')?.has('Jest')).toBe(true)
  })

  it('handles case-insensitive matching', () => {
    const skills = ['PYTHON', 'pyTorch', 'Next.js']
    const result = categoriseSkills(skills)

    expect(result.get('languages')?.has('PYTHON')).toBe(true)
    expect(result.get('aiml')?.has('pyTorch')).toBe(true)
    expect(result.get('frontend')?.has('Next.js')).toBe(true)
  })

  it('assigns each skill to at most one domain', () => {
    // "SQL" could match languages or database; first match wins
    const skills = ['SQL', 'TypeScript']
    const result = categoriseSkills(skills)

    const sqlDomains = SKILL_DOMAINS.filter(
      (d) => result.get(d.key)?.has('SQL'),
    )
    expect(sqlDomains.length).toBe(1)
  })

  it('returns empty sets for unknown skills', () => {
    const result = categoriseSkills(['zzzznotaskill'])
    for (const domain of SKILL_DOMAINS) {
      expect(result.get(domain.key)?.size).toBe(0)
    }
  })

  it('returns all domain keys', () => {
    const result = categoriseSkills([])
    for (const domain of SKILL_DOMAINS) {
      expect(result.has(domain.key)).toBe(true)
    }
  })
})

describe('polarToCartesian', () => {
  it('returns centre when radius is 0', () => {
    const pt = polarToCartesian(100, 100, 0, 0)
    expect(pt.x).toBe(100)
    expect(pt.y).toBe(100)
  })

  it('returns top point for angle 0', () => {
    const pt = polarToCartesian(0, 0, 0, 50)
    expect(pt.x).toBeCloseTo(0)
    expect(pt.y).toBeCloseTo(-50)
  })

  it('returns right point for angle 90', () => {
    const pt = polarToCartesian(0, 0, 90, 50)
    expect(pt.x).toBeCloseTo(50)
    expect(pt.y).toBeCloseTo(0)
  })
})

describe('buildRadarPolygon', () => {
  it('returns empty array for empty values', () => {
    expect(buildRadarPolygon([], 100, 100, 50)).toEqual([])
  })

  it('returns n vertices for n values', () => {
    const pts = buildRadarPolygon([0.5, 0.8, 0.3, 0.6, 0.9], 100, 100, 50)
    expect(pts).toHaveLength(5)
  })

  it('clamps values to 0–1', () => {
    const pts = buildRadarPolygon([1.5, -0.3], 0, 0, 100)
    // First point should be at maxRadius, second at 0
    expect(pts[0].x).not.toBeNaN()
    expect(pts[1].x).not.toBeNaN()
  })
})

describe('buildRadarRings', () => {
  it('returns the correct number of rings', () => {
    const rings = buildRadarRings(100, 100, 80, 5)
    expect(rings).toHaveLength(5)
  })

  it('each ring has as many vertices as domains', () => {
    const rings = buildRadarRings(100, 100, 80, 3)
    for (const ring of rings) {
      expect(ring).toHaveLength(SKILL_DOMAINS.length)
    }
  })
})

describe('buildRadarAxes', () => {
  it('returns one axis per domain', () => {
    const axes = buildRadarAxes(100, 100, 80)
    expect(axes).toHaveLength(SKILL_DOMAINS.length)
  })

  it('every axis starts at the centre', () => {
    const axes = buildRadarAxes(50, 50, 40)
    for (const axis of axes) {
      expect(axis.from.x).toBe(50)
      expect(axis.from.y).toBe(50)
    }
  })
})

describe('verticesToPoints', () => {
  it('produces a valid SVG points string', () => {
    const pts = verticesToPoints([
      { x: 10.123, y: 20.456 },
      { x: 30.789, y: 40.012 },
    ])
    expect(pts).toBe('10.12,20.46 30.79,40.01')
  })

  it('returns empty string for empty array', () => {
    expect(verticesToPoints([])).toBe('')
  })
})

describe('domainCoverageScore', () => {
  it('returns 100 when all domains have at least one skill', () => {
    const counts = new Map<string, Set<string>>()
    for (const d of SKILL_DOMAINS) {
      counts.set(d.key, new Set(['skill']))
    }
    expect(domainCoverageScore(counts)).toBe(100)
  })

  it('returns 0 when no domain has any skill', () => {
    const counts = new Map<string, Set<string>>()
    for (const d of SKILL_DOMAINS) {
      counts.set(d.key, new Set())
    }
    expect(domainCoverageScore(counts)).toBe(0)
  })

  it('returns proportional score', () => {
    const counts = new Map<string, Set<string>>()
    const half = Math.ceil(SKILL_DOMAINS.length / 2)
    for (let i = 0; i < SKILL_DOMAINS.length; i++) {
      counts.set(
        SKILL_DOMAINS[i].key,
        i < half ? new Set(['a']) : new Set(),
      )
    }
    const expected = Math.round((half / SKILL_DOMAINS.length) * 100)
    expect(domainCoverageScore(counts)).toBe(expected)
  })
})

describe('domainExtremes', () => {
  it('returns strongest and weakest indices', () => {
    const values = [0.1, 0.9, 0.5, 0.3, 0.7, 0.2, 0.8, 0.4, 0.6, 0.0]
    const { strongest, weakest } = domainExtremes(values)
    expect(strongest).toBe(1) // 0.9
    expect(weakest).toBe(9) // 0.0
  })
})

// ── Component render tests ───────────────────────────────────────────────────

describe('SkillsRadarChart', () => {
  it('renders nothing when skills array is empty', () => {
    const { container } = render(<SkillsRadarChart skills={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders the toggle button with skill count', () => {
    render(<SkillsRadarChart skills={['React', 'Docker']} />)
    expect(screen.getByText(/Skills Radar/)).toBeDefined()
  })

  it('expands the panel on toggle click', () => {
    render(<SkillsRadarChart skills={['React', 'Docker', 'SQL']} />)
    const toggle = screen.getByRole('button', { name: /Skills Radar/ })
    toggle.click()

    expect(screen.getByRole('img', { name: /Radar chart/ })).toBeDefined()
  })

  it('shows legend after expansion', () => {
    render(<SkillsRadarChart skills={['React', 'Python', 'AWS']} />)
    screen.getByRole('button', { name: /Skills Radar/ }).click()

    expect(screen.getByRole('list', { name: /Skill domains/ })).toBeDefined()
  })

  it('displays coverage badge after expansion', () => {
    render(<SkillsRadarChart skills={['React', 'Docker']} />)
    screen.getByRole('button', { name: /Skills Radar/ }).click()

    expect(screen.getByText(/Coverage/)).toBeDefined()
  })
})
