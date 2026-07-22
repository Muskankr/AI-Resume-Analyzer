import React, { useState } from 'react'
import { X, GitCompare, TrendingUp, TrendingDown, Minus, Download, Loader2 } from 'lucide-react'
import type { AnalysisEntry } from '../../hooks/useAnalysisHistory'
import { useCompareVersions } from '../../hooks/useCompareVersions'
import { exportComparisonPdf } from '../../utils/exportComparisonPdf'
import './CompareVersions.css'

interface CompareVersionsProps {
  entries: AnalysisEntry[]
  token: string | undefined
  onClose: () => void
}

/** Only entries that were saved to the backend (numeric DB id) are
 * comparable — locally-only guest entries don't have persisted resume
 * text on the server to diff against. */
function isComparable(entry: AnalysisEntry) {
  return /^\d+$/.test(entry.id)
}

export const CompareVersions: React.FC<CompareVersionsProps> = ({ entries, token, onClose }) => {
  const comparable = entries.filter(isComparable)
  const [olderId, setOlderId] = useState(comparable[1]?.id ?? '')
  const [newerId, setNewerId] = useState(comparable[0]?.id ?? '')

  const { comparison, loading, error, compare } = useCompareVersions(token)

  const handleCompare = () => {
    if (!olderId || !newerId) return
    compare(olderId, newerId)
  }

  const scoreIcon =
    comparison && comparison.score_delta > 0 ? (
      <TrendingUp size={20} className="compare-delta-icon compare-delta-icon--up" />
    ) : comparison && comparison.score_delta < 0 ? (
      <TrendingDown size={20} className="compare-delta-icon compare-delta-icon--down" />
    ) : (
      <Minus size={20} className="compare-delta-icon" />
    )

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="compare-modal" onClick={(e) => e.stopPropagation()}>
        <div className="compare-modal__header">
          <h3>
            <GitCompare size={18} /> Compare Resume Versions
          </h3>
          <button className="compare-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {!token ? (
          <p className="compare-empty">Sign in to compare your saved resume versions.</p>
        ) : comparable.length < 2 ? (
          <p className="compare-empty">
            You need at least two saved analyses to compare. Upload and analyze another version of
            your resume first.
          </p>
        ) : (
          <>
            <div className="compare-picker-row">
              <div className="compare-picker">
                <label htmlFor="compare-older">Older version</label>
                <select
                  id="compare-older"
                  value={olderId}
                  onChange={(e) => setOlderId(e.target.value)}
                >
                  {comparable.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.fileName} · {entry.score}% ·{' '}
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="compare-picker">
                <label htmlFor="compare-newer">Newer version</label>
                <select
                  id="compare-newer"
                  value={newerId}
                  onChange={(e) => setNewerId(e.target.value)}
                >
                  {comparable.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.fileName} · {entry.score}% ·{' '}
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="app-btn app-btn--accent"
                onClick={handleCompare}
                disabled={loading || olderId === newerId}
              >
                {loading ? <Loader2 size={15} className="spin" /> : <GitCompare size={15} />}
                Compare
              </button>
            </div>

            {olderId === newerId && (
              <p className="compare-warning">Choose two different versions.</p>
            )}
            {error && <p className="compare-warning">{error}</p>}

            {comparison && (
              <div className="compare-results">
                <div className="compare-score-banner">
                  {scoreIcon}
                  <span className="compare-score-old">{comparison.older_score}%</span>
                  <span className="compare-score-arrow">&rarr;</span>
                  <span className="compare-score-new">{comparison.newer_score}%</span>
                  <span
                    className={`compare-score-delta ${
                      comparison.score_delta > 0
                        ? 'is-positive'
                        : comparison.score_delta < 0
                          ? 'is-negative'
                          : ''
                    }`}
                  >
                    {comparison.score_delta > 0 ? '+' : ''}
                    {comparison.score_delta} pts
                  </span>
                </div>

                <div className="compare-section">
                  <h4>AI-Generated Insights</h4>
                  <ul className="compare-insight-list">
                    {comparison.insights.map((insight, i) => (
                      <li key={i}>{insight}</li>
                    ))}
                  </ul>
                </div>

                <div className="compare-skill-grid">
                  <div>
                    <h5 className="is-positive">Added Skills</h5>
                    {comparison.added_skills.length === 0 ? (
                      <p className="compare-none">None</p>
                    ) : (
                      <div className="compare-badges">
                        {comparison.added_skills.map((s) => (
                          <span key={s} className="badge bg-success">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h5 className="is-negative">Removed Skills</h5>
                    {comparison.removed_skills.length === 0 ? (
                      <p className="compare-none">None</p>
                    ) : (
                      <div className="compare-badges">
                        {comparison.removed_skills.map((s) => (
                          <span key={s} className="badge bg-danger">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h5>Still Missing For Role</h5>
                    {comparison.still_missing_skills.length === 0 ? (
                      <p className="compare-none">None</p>
                    ) : (
                      <div className="compare-badges">
                        {comparison.still_missing_skills.map((s) => (
                          <span key={s} className="badge bg-secondary">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {comparison.text_diff.length > 0 && (
                  <div className="compare-section">
                    <h4>Content Changes</h4>
                    <div className="compare-text-diff">
                      {comparison.text_diff.map((line, i) => (
                        <div
                          key={i}
                          className={`compare-diff-line compare-diff-line--${line.type}`}
                        >
                          {line.type === 'added' ? '+ ' : '- '}
                          {line.text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="compare-actions">
                  <button
                    className="app-btn app-btn--secondary"
                    onClick={() => exportComparisonPdf(comparison)}
                  >
                    <Download size={15} /> Export Report as PDF
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default CompareVersions
