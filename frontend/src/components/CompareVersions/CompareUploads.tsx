import React, { useState } from 'react'
import { X, GitCompare, TrendingUp, TrendingDown, Minus, Download, Loader2 } from 'lucide-react'
import axios from 'axios'
import { exportComparisonPdf } from '../../utils/exportComparisonPdf'
import type { VersionComparison } from '../../hooks/useCompareVersions'
import './CompareVersions.css'

interface CompareUploadsProps {
  onClose: () => void
  targetRole: string
  jobDesc: string
}

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

export const CompareUploads: React.FC<CompareUploadsProps> = ({ onClose, targetRole, jobDesc }) => {
  const [file1, setFile1] = useState<File | null>(null)
  const [file2, setFile2] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [comparison, setComparison] = useState<VersionComparison | null>(null)

  const handleCompare = async () => {
    if (!file1 || !file2) return
    setLoading(true)
    setError(null)
    setComparison(null)

    try {
      const formData = new FormData()
      formData.append('file1', file1)
      formData.append('file2', file2)
      formData.append('role', targetRole)
      formData.append('job_description', jobDesc)

      const res = await axios.post<VersionComparison>(`${BACKEND}/api/compare-uploads/`, formData)
      setComparison(res.data)
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : 'Failed to compare these files.'
      setError(message)
    } finally {
      setLoading(false)
    }
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
      <div
        className="compare-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="compare-modal__header">
          <h3>
            <GitCompare size={18} /> Compare Resumes (Side-by-Side)
          </h3>
          <button className="compare-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {!comparison ? (
          <>
            <div
              className="compare-picker-row"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                alignItems: 'stretch',
              }}
            >
              <div
                className="compare-picker"
                style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
              >
                <label>Older Version (File 1)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setFile1(e.target.files ? e.target.files[0] : null)}
                  style={{ padding: '0.5rem', border: '1px dashed #ccc', borderRadius: '4px' }}
                />
              </div>
              <div
                className="compare-picker"
                style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
              >
                <label>Newer Version (File 2)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setFile2(e.target.files ? e.target.files[0] : null)}
                  style={{ padding: '0.5rem', border: '1px dashed #ccc', borderRadius: '4px' }}
                />
              </div>

              <button
                className="app-btn app-btn--accent"
                onClick={handleCompare}
                disabled={loading || !file1 || !file2}
                style={{ alignSelf: 'flex-start', marginTop: '1rem' }}
              >
                {loading ? <Loader2 size={15} className="spin" /> : <GitCompare size={15} />}
                Compare Resumes
              </button>
            </div>
            {error && <p className="compare-warning">{error}</p>}
          </>
        ) : (
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
                    <div key={i} className={`compare-diff-line compare-diff-line--${line.type}`}>
                      {line.type === 'added' ? '+ ' : '- '}
                      {line.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="compare-actions">
              <button className="app-btn app-btn--secondary" onClick={() => setComparison(null)}>
                Compare Another Pair
              </button>
              <button
                className="app-btn app-btn--secondary"
                onClick={() => exportComparisonPdf(comparison)}
              >
                <Download size={15} /> Export Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
