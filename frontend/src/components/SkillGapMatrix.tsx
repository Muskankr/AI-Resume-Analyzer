import React, { useState, useMemo } from 'react'
import type { ClassifiedSkill, SkillPriority } from '../utils/jdSkillParser'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Sparkles,
  Inbox,
  Filter,
  Check,
  Zap,
} from 'lucide-react'
import './SkillGapMatrix.css'

interface SkillGapMatrixProps {
  extractedSkills: ClassifiedSkill[]
  candidateSkills: string[]
  title?: string
  subtitle?: string
}

export type ViewMode = 'grid' | 'table' | 'cards'
export type MatchStatusFilter = 'ALL' | 'MATCHED' | 'MISSING'

export const SkillGapMatrix: React.FC<SkillGapMatrixProps> = ({
  extractedSkills = [],
  candidateSkills = [],
  title = 'Skill Gap Priority Matrix',
  subtitle = 'Automated skill mapping comparing job description requirements against candidate competencies.',
}) => {
  const [filterPriority, setFilterPriority] = useState<SkillPriority | 'ALL'>('ALL')
  const [matchStatusFilter, setMatchStatusFilter] = useState<MatchStatusFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedSkill, setSelectedSkill] = useState<ClassifiedSkill | null>(null)

  // Normalize candidate skills for O(1) set lookup
  const candidateSkillSet = useMemo(() => {
    return new Set(candidateSkills.map((s) => s.trim().toLowerCase()))
  }, [candidateSkills])

  // Process skill match data
  const processedSkills = useMemo(() => {
    return extractedSkills.map((skill) => {
      const isMatched = candidateSkillSet.has(skill.name.trim().toLowerCase())
      return {
        ...skill,
        isMatched,
      }
    })
  }, [extractedSkills, candidateSkillSet])

  // Filter skills based on search, priority, and match status
  const filteredSkills = useMemo(() => {
    return processedSkills.filter((skill) => {
      // Search query filter
      if (
        searchQuery &&
        !skill.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !skill.contextPhrase.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }
      // Priority filter
      if (filterPriority !== 'ALL' && skill.priority !== filterPriority) {
        return false
      }
      // Match status filter
      if (matchStatusFilter === 'MATCHED' && !skill.isMatched) return false
      if (matchStatusFilter === 'MISSING' && skill.isMatched) return false

      return true
    })
  }, [processedSkills, searchQuery, filterPriority, matchStatusFilter])

  // Analytics aggregate metrics
  const totalSkills = processedSkills.length
  const matchedSkillsCount = processedSkills.filter((s) => s.isMatched).length
  const missingSkillsCount = totalSkills - matchedSkillsCount
  const matchPercentage = totalSkills > 0 ? Math.round((matchedSkillsCount / totalSkills) * 100) : 0

  const missingRequiredCount = processedSkills.filter(
    (s) => s.priority === 'REQUIRED' && !s.isMatched
  ).length

  const missingPreferredCount = processedSkills.filter(
    (s) => s.priority === 'PREFERRED' && !s.isMatched
  ).length

  return (
    <div className="skill-gap-matrix-container" data-testid="skill-gap-matrix">
      {/* Top Header Card */}
      <div className="sgm-header">
        <div className="sgm-header-info">
          <div className="sgm-title-badge">
            <Sparkles size={16} />
            <span>ATS Competency Insights</span>
          </div>
          <h2 className="sgm-title">{title}</h2>
          <p className="sgm-subtitle">{subtitle}</p>
        </div>

        {/* Aggregate Score Pill */}
        <div className="sgm-score-card">
          <div className="sgm-score-circle">
            <span className="sgm-score-value">{matchPercentage}%</span>
          </div>
          <div className="sgm-score-meta">
            <span className="sgm-score-label">Skill Coverage</span>
            <span className="sgm-score-detail">
              {matchedSkillsCount} of {totalSkills} skills verified
            </span>
          </div>
        </div>
      </div>

      {/* Critical Gap Alert Banner */}
      {missingRequiredCount > 0 && (
        <div className="sgm-alert-banner danger" role="alert">
          <AlertTriangle size={18} className="sgm-alert-icon" />
          <div className="sgm-alert-text">
            <strong>Critical Gap Alert:</strong> {missingRequiredCount} required skill
            {missingRequiredCount > 1 ? 's are' : ' is'} missing from your resume. Adding these can
            significantly boost your ATS score.
          </div>
        </div>
      )}

      {/* Control Bar: Filters & Search */}
      <div className="sgm-controls-bar">
        {/* Search Input */}
        <div className="sgm-search-wrapper">
          <Search size={16} className="sgm-search-icon" />
          <input
            type="text"
            className="sgm-search-input"
            placeholder="Search skills or context..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search skills"
          />
          {searchQuery && (
            <button
              className="sgm-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Priority Filter Tabs */}
        <div className="sgm-filter-group" role="tablist" aria-label="Skill Priority Filters">
          {(['ALL', 'REQUIRED', 'PREFERRED', 'STANDARD'] as const).map((priority) => (
            <button
              key={priority}
              type="button"
              role="tab"
              aria-selected={filterPriority === priority}
              className={`sgm-filter-chip ${filterPriority === priority ? 'active' : ''}`}
              onClick={() => setFilterPriority(priority)}
            >
              {priority === 'ALL' ? 'All Skills' : priority.toLowerCase()}
            </button>
          ))}
        </div>

        {/* Match Status & Layout View Toggles */}
        <div className="sgm-actions-wrapper">
          <div className="sgm-status-select-wrapper">
            <Filter size={14} />
            <select
              className="sgm-status-select"
              value={matchStatusFilter}
              onChange={(e) => setMatchStatusFilter(e.target.value as MatchStatusFilter)}
              aria-label="Filter by match status"
            >
              <option value="ALL">All Statuses</option>
              <option value="MATCHED">Matched Only ({matchedSkillsCount})</option>
              <option value="MISSING">Missing Gaps ({missingSkillsCount})</option>
            </select>
          </div>

          <div className="sgm-view-toggle">
            <button
              type="button"
              className={`sgm-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              className={`sgm-view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
              aria-label="Table View"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Skills Content View */}
      {filteredSkills.length === 0 ? (
        <div className="sgm-empty-state">
          <div className="sgm-empty-icon">
            <Inbox size={36} />
          </div>
          <h3 className="sgm-empty-title">No skills match your filters</h3>
          <p className="sgm-empty-desc">
            Try adjusting your search term, priority filters, or status toggles to view more skill
            breakdowns.
          </p>
          <button
            type="button"
            className="sgm-reset-btn"
            onClick={() => {
              setFilterPriority('ALL')
              setMatchStatusFilter('ALL')
              setSearchQuery('')
            }}
          >
            Reset All Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="sgm-grid-layout">
          {filteredSkills.map((skill) => (
            <div
              key={skill.name}
              className={`sgm-card ${skill.isMatched ? 'matched' : 'missing'} ${
                skill.priority === 'REQUIRED' ? 'priority-required' : ''
              }`}
              onClick={() => setSelectedSkill(skill)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedSkill(skill)}
            >
              <div className="sgm-card-header">
                <span className="sgm-skill-name">{skill.name}</span>
                <span
                  className={`sgm-badge priority-${skill.priority.toLowerCase()}`}
                  title={`Priority level: ${skill.priority}`}
                >
                  {skill.priority === 'REQUIRED' && <Zap size={10} />}
                  {skill.priority === 'STANDARD' ? 'Standard' : skill.priority.toLowerCase()}
                </span>
              </div>

              {skill.contextPhrase && (
                <p className="sgm-card-context" title={skill.contextPhrase}>
                  "{skill.contextPhrase}"
                </p>
              )}

              <div className="sgm-card-footer">
                <span className={`sgm-status-pill ${skill.isMatched ? 'matched' : 'missing'}`}>
                  {skill.isMatched ? (
                    <>
                      <CheckCircle2 size={12} /> Matched
                    </>
                  ) : (
                    <>
                      <XCircle size={12} /> Missing Gap
                    </>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="sgm-table-wrapper">
          <table className="sgm-table">
            <thead>
              <tr>
                <th>Skill Name</th>
                <th>Priority Level</th>
                <th>JD Context Excerpt</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSkills.map((skill) => (
                <tr
                  key={skill.name}
                  className={`sgm-table-row ${skill.isMatched ? 'matched' : 'missing'}`}
                >
                  <td className="sgm-table-name font-semibold">{skill.name}</td>
                  <td>
                    <span className={`sgm-badge priority-${skill.priority.toLowerCase()}`}>
                      {skill.priority === 'STANDARD' ? 'Standard' : skill.priority.toLowerCase()}
                    </span>
                  </td>
                  <td className="sgm-table-context">"{skill.contextPhrase || 'N/A'}"</td>
                  <td>
                    <span className={`sgm-status-pill ${skill.isMatched ? 'matched' : 'missing'}`}>
                      {skill.isMatched ? (
                        <>
                          <CheckCircle2 size={12} /> Matched
                        </>
                      ) : (
                        <>
                          <XCircle size={12} /> Missing
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected Skill Modal Detail */}
      {selectedSkill && (
        <div className="sgm-modal-backdrop" onClick={() => setSelectedSkill(null)}>
          <div className="sgm-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sgm-detail-header">
              <h3>{selectedSkill.name}</h3>
              <button
                className="sgm-detail-close"
                onClick={() => setSelectedSkill(null)}
                aria-label="Close detail modal"
              >
                ×
              </button>
            </div>
            <div className="sgm-detail-body">
              <div className="sgm-detail-row">
                <span className="label">Priority:</span>
                <span className={`sgm-badge priority-${selectedSkill.priority.toLowerCase()}`}>
                  {selectedSkill.priority}
                </span>
              </div>
              <div className="sgm-detail-row">
                <span className="label">ATS Status:</span>
                <span
                  className={`sgm-status-pill ${selectedSkill.isMatched ? 'matched' : 'missing'}`}
                >
                  {selectedSkill.isMatched ? 'Found in Resume' : 'Missing from Resume'}
                </span>
              </div>
              <div className="sgm-detail-row full">
                <span className="label">Job Description Context:</span>
                <blockquote className="sgm-detail-quote">
                  "{selectedSkill.contextPhrase || 'No context phrase captured.'}"
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
