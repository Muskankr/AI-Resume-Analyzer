import React from 'react'
import { Briefcase, ChevronRight } from 'lucide-react'
import './TrackMatrix.css'

export type TrackComparison = {
  score: number
  matched_skills: string[]
  missing_skills: string[]
  suggestions: string[]
}

export type TrackComparisons = Record<string, TrackComparison>

interface TrackMatrixProps {
  trackComparisons: TrackComparisons
  activeRole: string
  onRowClick: (roleName: string) => void
}

export const TrackMatrix: React.FC<TrackMatrixProps> = ({
  trackComparisons,
  activeRole,
  onRowClick,
}) => {
  const tracks = Object.keys(trackComparisons).sort((a, b) => {
    // Sort by score descending
    return trackComparisons[b].score - trackComparisons[a].score
  })

  if (tracks.length === 0) {
    return (
      <div className="track-matrix-container text-center p-4">
        <p>No track comparison data available.</p>
      </div>
    )
  }

  const getScoreBadgeClass = (score: number) => {
    if (score >= 75) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }

  return (
    <div className="track-matrix-container" data-testid="track-matrix">
      <table className="track-matrix-table" aria-label="Compare Across All Career Tracks">
        <thead>
          <tr>
            <th scope="col">Career Track</th>
            <th scope="col">Match %</th>
            <th scope="col">Status</th>
            <th scope="col"></th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((track) => {
            const data = trackComparisons[track]
            const isSelected = track === activeRole

            return (
              <tr
                key={track}
                onClick={() => onRowClick(track)}
                aria-selected={isSelected}
                role="row"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onRowClick(track)
                  }
                }}
              >
                <td className="track-name-cell">
                  <Briefcase size={16} />
                  {track}
                  {isSelected && (
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '11px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        color: '#818cf8',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      Selected
                    </span>
                  )}
                </td>
                <td className="track-score-cell">
                  <span className={`score-badge ${getScoreBadgeClass(data.score)}`}>
                    {data.score}%
                  </span>
                </td>
                <td className="track-status-cell">
                  {data.score >= 75
                    ? 'Strong Match'
                    : data.score >= 40
                      ? 'Potential Match'
                      : 'Needs Improvement'}
                </td>
                <td style={{ textAlign: 'right', color: 'rgba(255,255,255,0.4)' }}>
                  <ChevronRight size={18} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
