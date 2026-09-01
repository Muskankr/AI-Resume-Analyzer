/**
 * What-If Score Simulator Engine
 * 
 * Computes projected score increases and domain coverage improvements when a candidate
 * hypothetically adds missing skills to their resume profile without requiring a re-upload.
 */

export interface SkillImpactEstimation {
  skillName: string
  category: string
  estimatedScoreDelta: number // e.g. +5
  impactLevel: 'High' | 'Medium' | 'Low'
  reasoning: string
}

export interface SimulationResult {
  baseScore: number
  projectedScore: number
  totalDelta: number
  projectedReadinessTier: 'Junior' | 'Mid-Level' | 'Senior' | 'Lead'
  skillBreakdown: SkillImpactEstimation[]
  disclaimer: string
  isEstimate: boolean
}

export const HIGH_IMPACT_SKILLS: Record<string, { category: string; impact: number; reasoning: string }> = {
  typescript: { category: 'frontend', impact: 8, reasoning: 'Strongly requested in modern frontend/fullstack roles.' },
  docker: { category: 'devops', impact: 7, reasoning: 'Standard containerization technology across backend engineering.' },
  kubernetes: { category: 'devops', impact: 9, reasoning: 'High-value cloud orchestration skill.' },
  react: { category: 'frontend', impact: 8, reasoning: 'Primary frontend framework demanded by recruiters.' },
  python: { category: 'backend', impact: 8, reasoning: 'Core backend, AI/ML, and automation language.' },
  postgresql: { category: 'database', impact: 6, reasoning: 'Most popular open-source relational database.' },
  aws: { category: 'cloud', impact: 9, reasoning: 'Leading cloud platform skill requested in 60%+ jobs.' },
  graphql: { category: 'backend', impact: 5, reasoning: 'Modern API architecture standard.' },
  jest: { category: 'testing', impact: 4, reasoning: 'Demonstrates automated testing discipline.' },
  ci_cd: { category: 'devops', impact: 7, reasoning: 'Essential for modern DevOps and agile engineering teams.' },
}

/**
 * Calculates simulated score increases for a list of hypothetically added skills
 */
export function simulateScoreImpact(
  baseScore: number,
  currentSkills: string[],
  selectedMissingSkills: string[]
): SimulationResult {
  const normalizedCurrent = currentSkills.map((s) => s.toLowerCase().trim())
  let currentTotalDelta = 0
  const breakdown: SkillImpactEstimation[] = []

  selectedMissingSkills.forEach((skill) => {
    const norm = skill.toLowerCase().trim()
    if (normalizedCurrent.includes(norm)) {
      return // Already present, no new impact
    }

    const info = HIGH_IMPACT_SKILLS[norm] || {
      category: 'general',
      impact: 4,
      reasoning: 'Adds domain breadth and keyword relevance to ATS matching.',
    }

    // Diminishing returns calculation: first skills give full impact, later skills scale down
    const scaleFactor = Math.max(0.4, 1 - breakdown.length * 0.1)
    const effectiveImpact = Math.round(info.impact * scaleFactor)

    currentTotalDelta += effectiveImpact
    breakdown.push({
      skillName: skill,
      category: info.category,
      estimatedScoreDelta: effectiveImpact,
      impactLevel: info.impact >= 8 ? 'High' : info.impact >= 5 ? 'Medium' : 'Low',
      reasoning: info.reasoning,
    })
  })

  // Cap maximum projected score at 99%
  const projectedScore = Math.min(99, baseScore + currentTotalDelta)

  let projectedReadinessTier: 'Junior' | 'Mid-Level' | 'Senior' | 'Lead' = 'Junior'
  if (projectedScore >= 88) projectedReadinessTier = 'Lead'
  else if (projectedScore >= 75) projectedReadinessTier = 'Senior'
  else if (projectedScore >= 60) projectedReadinessTier = 'Mid-Level'

  return {
    baseScore,
    projectedScore,
    totalDelta: projectedScore - baseScore,
    projectedReadinessTier,
    skillBreakdown: breakdown,
    disclaimer: 'Estimates are algorithmically projected based on market demand metrics and ATS keyword weighting. Actual results may vary upon real resume evaluation.',
    isEstimate: true,
  }
}
