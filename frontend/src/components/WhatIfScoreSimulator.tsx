import React, { useState } from 'react'
import {
  simulateScoreImpact,
  SimulationResult,
  HIGH_IMPACT_SKILLS,
} from '../utils/whatIfSimulatorEngine'
import './WhatIfScoreSimulator.css'

interface WhatIfScoreSimulatorProps {
  currentScore?: number
  detectedSkills?: string[]
  suggestedSkills?: string[]
}

const DEFAULT_SUGGESTED_SKILLS = [
  'TypeScript',
  'Docker',
  'AWS',
  'Kubernetes',
  'PostgreSQL',
  'GraphQL',
  'Jest',
]

export const WhatIfScoreSimulator: React.FC<WhatIfScoreSimulatorProps> = ({
  currentScore = 68,
  detectedSkills = ['React', 'JavaScript', 'HTML5', 'CSS3'],
  suggestedSkills = DEFAULT_SUGGESTED_SKILLS,
}) => {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [customInput, setCustomInput] = useState('')

  const simulation: SimulationResult = simulateScoreImpact(
    currentScore,
    detectedSkills,
    selectedSkills
  )

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )
  }

  const handleAddCustomSkill = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = customInput.trim()
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills((prev) => [...prev, trimmed])
      setCustomInput('')
    }
  }

  const clearAll = () => setSelectedSkills([])

  return (
    <div className="what-if-card">
      <div className="what-if-header">
        <div className="what-if-title-row">
          <span className="what-if-icon">🔮</span>
          <div>
            <h3>"What-If" Score Simulator</h3>
            <p>Preview projected score increases before editing & re-uploading your resume.</p>
          </div>
        </div>
        <span className="estimate-badge" title="Estimated score projection">
          ⚠️ Projected Estimate
        </span>
      </div>

      <div className="simulator-metrics-grid">
        <div className="metric-box base">
          <span className="metric-label">Current Score</span>
          <span className="metric-value">{currentScore}%</span>
        </div>

        <div className="metric-box delta">
          <span className="metric-label">Simulated Boost</span>
          <span className="metric-value boost">
            {simulation.totalDelta > 0 ? `+${simulation.totalDelta}%` : '0%'}
          </span>
        </div>

        <div className="metric-box projected">
          <span className="metric-label">Projected Score</span>
          <span className="metric-value highlight">{simulation.projectedScore}%</span>
        </div>

        <div className="metric-box tier">
          <span className="metric-label">Projected Level</span>
          <span className="metric-value tier-badge">{simulation.projectedReadinessTier}</span>
        </div>
      </div>

      <div className="skills-selector-section">
        <h4>Select Missing Skills to Simulate:</h4>
        <div className="skills-chips-cloud">
          {suggestedSkills.map((skill) => {
            const isSelected = selectedSkills.includes(skill)
            return (
              <button
                key={skill}
                type="button"
                className={`skill-sim-chip ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleSkill(skill)}
              >
                {isSelected ? '✓ ' : '+ '}
                {skill}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleAddCustomSkill} className="custom-skill-form">
          <input
            type="text"
            placeholder="Add custom skill (e.g. Terraform)..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
          />
          <button type="submit" className="btn-add-custom">
            Add
          </button>
          {selectedSkills.length > 0 && (
            <button type="button" className="btn-clear-sim" onClick={clearAll}>
              Clear All
            </button>
          )}
        </form>
      </div>

      {simulation.skillBreakdown.length > 0 && (
        <div className="simulation-breakdown-section">
          <h4>Simulated Impact Breakdown:</h4>
          <div className="breakdown-list">
            {simulation.skillBreakdown.map((item, idx) => (
              <div key={idx} className="breakdown-item">
                <div className="breakdown-item-main">
                  <span className="item-name">{item.skillName}</span>
                  <span className={`item-impact-badge ${item.impactLevel.toLowerCase()}`}>
                    +{item.estimatedScoreDelta}% ({item.impactLevel} Impact)
                  </span>
                </div>
                <p className="item-reasoning">{item.reasoning}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="disclaimer-footer">
        <span className="info-icon">ℹ️</span>
        <p>{simulation.disclaimer}</p>
      </div>
    </div>
  )
}
