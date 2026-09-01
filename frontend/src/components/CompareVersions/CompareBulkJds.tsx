import React, { useState } from 'react'
import { X, GitCompare, Loader2, Plus, Trash2, Archive } from 'lucide-react'
import axios from 'axios'
import { downloadBulkReportsZip, type BulkReportItem } from '../../utils/exportZipReports'

interface CompareBulkJdsProps {
  onClose: () => void
  username?: string
  isEmbed?: boolean
}

interface RecentJd {
  id: string
  text: string
  label: string
  timestamp: number
}

interface ComparisonResult {
  index: number
  job_description: string
  score: number
  matched_skills: string[]
  missing_skills: string[]
  suggestions: string[]
}

interface APIResponse {
  resume_skills: string[]
  comparisons: ComparisonResult[]
}

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

const BULK_JD_DRAFT_KEY = 'bulk_jd_drafts'

export const CompareBulkJds: React.FC<CompareBulkJdsProps> = ({onClose,username,isEmbed = false}) => {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [resumeUrl, setResumeUrl] = useState('')
  const [jds, setJds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(BULK_JD_DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // ignore
    }
    return ['']
  })
  const [loading, setLoading] = useState(false)
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<APIResponse | null>(null)
  const [expandedJds, setExpandedJds] = useState<{ [key: number]: boolean }>({})
  const [recentJds, setRecentJds] = useState<RecentJd[]>(() => {
    try {
      const storageKey = username ? `recent_jds_${username}` : 'recent_jds_anon'
      const data = localStorage.getItem(storageKey)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  })

  // Debounced draft saving (#533)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const hasContent = jds.some((j) => j && j.trim())
        if (hasContent) {
          localStorage.setItem(BULK_JD_DRAFT_KEY, JSON.stringify(jds))
        } else {
          localStorage.removeItem(BULK_JD_DRAFT_KEY)
        }
      } catch {
        // ignore
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [jds])

  const toggleExpand = (index: number) => {
    setExpandedJds((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const handleAddJd = () => {
    if (jds.length >= 5) return
    setJds([...jds, ''])
  }

  const handleRemoveJd = (index: number) => {
    const newJds = jds.filter((_, i) => i !== index)
    setJds(newJds.length > 0 ? newJds : [''])
  }

  const handleJdChange = (index: number, value: string) => {
    const newJds = [...jds]
    newJds[index] = value
    setJds(newJds)
  }

  const handleCompare = async () => {
    const validJds = jds.map((jd) => jd.trim()).filter(Boolean)
    if (!file && !resumeUrl.trim()) {
      setError('Please provide a resume file or URL.')
      return
    }
    if (validJds.length === 0) {
      setError('Please provide at least one job description.')
      return
    }

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const formData = new FormData()
      if (file) {
        formData.append('file', file)
      } else {
        formData.append('resume_url', resumeUrl.trim())
      }
      formData.append('job_descriptions', JSON.stringify(validJds))

      const res = await axios.post<APIResponse>(`${BACKEND}/api/compare-bulk-jds/`, formData)
      setResults(res.data)

      // Update recently used JDs
      const storageKey = username ? `recent_jds_${username}` : 'recent_jds_anon'
      setRecentJds((prev) => {
        let updated = [...prev]
        for (const jdText of validJds) {
          // Remove duplicate if already exists (we'll move it to the front)
          updated = updated.filter((item) => item.text !== jdText)

          // Helper to generate a short label
          let label = jdText.replace(/[\r\n\t]+/g, ' ').trim()
          if (label.length > 40) {
            label = label.slice(0, 40) + '...'
          }

          updated.unshift({
            id: Math.random().toString(36).substring(2, 9),
            text: jdText,
            label,
            timestamp: Date.now(),
          })
        }
        // Limit to last 5
        const limited = updated.slice(0, 5)
        try {
          localStorage.setItem(storageKey, JSON.stringify(limited))
        } catch (e) {
          console.error('Failed to save recent JDs', e)
        }
        return limited
      })
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : 'Failed to run bulk comparison.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadZip = async () => {
    if (!results || !results.comparisons || results.comparisons.length === 0) return
    setDownloadingZip(true)
    try {
      const reports: BulkReportItem[] = results.comparisons.map((c, i) => ({
        id: c.index + 1,
        targetRole: `Role_Option_${i + 1}`,
        score: c.score,
        matchedSkills: c.matched_skills,
        missingSkills: c.missing_skills,
        suggestions: c.suggestions,
        jobDescription: c.job_description,
      }))
      await downloadBulkReportsZip(reports, 'bulk-job-comparison-reports.zip')
    } catch (err) {
      console.error('Failed to export ZIP package:', err)
      setError('Failed to download ZIP package.')
    } finally {
      setDownloadingZip(false)
    }
  }

  const innerContent = (
    <>
      {!results ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
          <p style={{ fontSize: '14.5px', opacity: 0.85, margin: 0 }}>
            Compare a single resume against multiple job descriptions side-by-side to find the best
            match and missing skills.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.02)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>1. Choose Resume</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              <div
                className={isDragging ? 'dragging' : ''}
                style={{
                  flex: 1,
                  minWidth: '250px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '1rem',
                  border: isDragging ? '2px dashed #4f46e5' : '1px solid transparent',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault(); setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    setFile(e.dataTransfer.files[0]);
                    setResumeUrl('');
                  }
                }}
              >
                <label style={{ fontSize: '12px', fontWeight: '600', opacity: 0.8 }}>
                  Upload Resume File
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => {
                    setFile(e.target.files ? e.target.files[0] : null)
                    if (e.target.files?.[0]) setResumeUrl('')
                  }}
                  style={{
                    padding: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.01)',
                    color: 'inherit',
                    cursor: 'pointer',
                  }}
                />
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: '250px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <label style={{ fontSize: '12px', fontWeight: '600', opacity: 0.8 }}>
                  Or Resume URL
                </label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/..."
                  value={resumeUrl}
                  onChange={(e) => {
                    setResumeUrl(e.target.value)
                    if (e.target.value) setFile(null)
                  }}
                  style={{
                    padding: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: 'inherit',
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>
                2. Job Descriptions ({jds.length}/5)
              </h4>
              <button
                className="app-btn"
                onClick={handleAddJd}
                disabled={jds.length >= 5}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                <Plus size={14} /> Add Job Description
              </button>
            </div>

            {recentJds.length > 0 && (
              <div style={{ margin: '4px 0 8px 0' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    opacity: 0.75,
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  Recently Used Job Descriptions (Click to fill first empty slot):
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {recentJds.map((recent) => (
                    <button
                      key={recent.id}
                      type="button"
                      onClick={() => {
                        const emptyIdx = jds.findIndex((val) => !val.trim())
                        const targetIdx = emptyIdx !== -1 ? emptyIdx : 0
                        handleJdChange(targetIdx, recent.text)
                      }}
                      style={{
                        fontSize: '11.5px',
                        padding: '4px 10px',
                        borderRadius: '16px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        color: '#a5b4fc',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        maxWidth: '220px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={recent.text}
                    >
                      📋 {recent.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {jds.map((jd, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                    flexDirection: 'column',
                    background: 'rgba(255, 255, 255, 0.01)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                    }}
                  >
                    <label style={{ fontSize: '12px', fontWeight: '600', opacity: 0.8 }}>
                      Job Description #{idx + 1}
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {recentJds.length > 0 && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleJdChange(idx, e.target.value)
                              e.target.value = ''
                            }
                          }}
                          style={{
                            padding: '2px 8px',
                            fontSize: '11.5px',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#a5b4fc',
                            cursor: 'pointer',
                            maxWidth: '180px',
                          }}
                        >
                          <option value="">📋 Select Recent...</option>
                          {recentJds.map((recent) => (
                            <option key={recent.id} value={recent.text} title={recent.text}>
                              {recent.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {jds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveJd(idx)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11.5px',
                          }}
                          title="Remove"
                        >
                          <Trash2
                            size={13}
                            style={{
                              marginRight: '2px',
                              display: 'inline-block',
                              verticalAlign: 'middle',
                            }}
                          />{' '}
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    placeholder={`Paste job description #${idx + 1} here...`}
                    value={jd}
                    onChange={(e) => handleJdChange(idx, e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '90px',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      color: 'inherit',
                      fontSize: '13.5px',
                      resize: 'vertical',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '14px', fontWeight: '500' }}>⚠️ {error}</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              className="app-btn app-btn--accent"
              onClick={handleCompare}
              disabled={loading}
              style={{ minWidth: '160px' }}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <GitCompare size={16} />}
              Compare Job Descriptions
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              padding: '16px',
            }}
          >
            <h4
              style={{
                margin: '0 0 12px 0',
                fontSize: '14.5px',
                fontWeight: '600',
                textTransform: 'uppercase',
                color: 'var(--color-primary, #6366f1)',
              }}
            >
              Extracted Resume Skills ({results.resume_skills.length})
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {results.resume_skills.map((skill) => (
                <span
                  key={skill}
                  style={{
                    fontSize: '12px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
              Match Results (Sorted by Best Match)
            </h4>

            {results.comparisons.map((item, idx) => {
              const isExpanded = expandedJds[idx]
              const jdSnippet =
                item.job_description.length > 120
                  ? item.job_description.slice(0, 120) + '...'
                  : item.job_description

              let scoreColor = '#ef4444'
              if (item.score >= 70) scoreColor = '#22c55e'
              else if (item.score >= 40) scoreColor = '#eab308'

              return (
                <div
                  key={idx}
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.015)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: 'var(--color-primary, #6366f1)',
                          textTransform: 'uppercase',
                        }}
                      >
                        Role Option #{idx + 1}
                      </span>
                      <div
                        onClick={() => toggleExpand(idx)}
                        style={{
                          fontSize: '13.5px',
                          cursor: 'pointer',
                          opacity: 0.9,
                          fontStyle: 'italic',
                          marginTop: '4px',
                          lineHeight: '1.4',
                        }}
                        title="Click to view full job description"
                      >
                        "{isExpanded ? item.job_description : jdSnippet}"
                        {item.job_description.length > 120 && (
                          <span
                            style={{
                              color: 'var(--color-primary, #6366f1)',
                              marginLeft: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                            }}
                          >
                            {isExpanded ? 'Show Less' : 'Show More'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: '50%',
                          border: `3px solid ${scoreColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '15px',
                          fontWeight: '700',
                          color: scoreColor,
                          background: 'rgba(0, 0, 0, 0.1)',
                        }}
                      >
                        {item.score}%
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '16px',
                      marginTop: '4px',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          color: '#22c55e',
                          display: 'block',
                          marginBottom: '6px',
                        }}
                      >
                        Matched Skills ({item.matched_skills.length})
                      </span>
                      {item.matched_skills.length === 0 ? (
                        <span style={{ fontSize: '12px', opacity: 0.5 }}>None</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {item.matched_skills.map((s) => (
                            <span
                              key={s}
                              style={{
                                fontSize: '11px',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                background: 'rgba(34, 197, 94, 0.15)',
                                color: '#22c55e',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                              }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          color: '#ef4444',
                          display: 'block',
                          marginBottom: '6px',
                        }}
                      >
                        Missing Skills ({item.missing_skills.length})
                      </span>
                      {item.missing_skills.length === 0 ? (
                        <span style={{ fontSize: '12px', opacity: 0.5 }}>None</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {item.missing_skills.map((s) => (
                            <span
                              key={s}
                              style={{
                                fontSize: '11px',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                              }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {item.suggestions.length > 0 && (
                    <div
                      style={{
                        marginTop: '8px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        paddingTop: '10px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          opacity: 0.8,
                          display: 'block',
                          marginBottom: '4px',
                        }}
                      >
                        Recommendations:
                      </span>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: '16px',
                          fontSize: '12.5px',
                          opacity: 0.85,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                        }}
                      >
                        {item.suggestions.slice(0, 3).map((sug, i) => (
                          <li key={i}>{sug}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '12px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <button
              className="app-btn app-btn--secondary"
              onClick={() => {
                setResults(null)
                setError(null)
              }}
            >
              Compare Another Set
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="app-btn app-btn--accent"
                onClick={handleDownloadZip}
                disabled={downloadingZip}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {downloadingZip ? <Loader2 size={16} className="spin" /> : <Archive size={16} />}
                Download All (.ZIP)
              </button>
              <button className="app-btn" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )

  if (isEmbed) {
    return innerContent
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div
        className="compare-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '840px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="compare-modal__header">
          <h3
            style={{
              fontSize: '20px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <GitCompare size={22} style={{ color: 'var(--color-primary, #6366f1)' }} /> Bulk Job
            Description Comparison
          </h3>
          <button className="compare-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {!results ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
            <p style={{ fontSize: '14.5px', opacity: 0.85, margin: 0 }}>
              Compare a single resume against multiple job descriptions side-by-side to find the
              best match and missing skills.
            </p>

            {/* Resume Upload / Input */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>1. Choose Resume</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                <div
                  style={{
                    flex: 1,
                    minWidth: '250px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <label style={{ fontSize: '12px', fontWeight: '600', opacity: 0.8 }}>
                    Upload Resume File
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      setFile(e.target.files ? e.target.files[0] : null)
                      if (e.target.files?.[0]) setResumeUrl('')
                    }}
                    style={{
                      padding: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.01)',
                      color: 'inherit',
                      cursor: 'pointer',
                    }}
                  />
                </div>
                <div
                  style={{
                    flex: 1,
                    minWidth: '250px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <label style={{ fontSize: '12px', fontWeight: '600', opacity: 0.8 }}>
                    Or Resume URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://drive.google.com/..."
                    value={resumeUrl}
                    onChange={(e) => {
                      setResumeUrl(e.target.value)
                      if (e.target.value) setFile(null)
                    }}
                    style={{
                      padding: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      color: 'inherit',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* JDs List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>
                  2. Job Descriptions ({jds.length}/5)
                </h4>
                <button
                  className="app-btn"
                  onClick={handleAddJd}
                  disabled={jds.length >= 5}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  <Plus size={14} /> Add Job Description
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {jds.map((jd, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', opacity: 0.8 }}>
                          Job Description #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleUrlInput(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-primary, #6366f1)',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: 0
                          }}
                        >
                          🔗 Import from URL
                        </button>
                      </div>

                      {activeUrlInputs[idx] && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                          <input
                            type="text"
                            placeholder="Paste job URL here (LinkedIn, Indeed, etc.)..."
                            value={urlInputs[idx] || ''}
                            onChange={(e) => handleUrlInputChange(idx, e.target.value)}
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              borderRadius: '4px',
                              border: '1px solid rgba(255,255,255,0.15)',
                              background: 'rgba(0,0,0,0.2)',
                              color: '#fff',
                              fontSize: '12.5px'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleImportFromUrl(idx)}
                            disabled={importingIdx === idx}
                            className="app-btn"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                          >
                            {importingIdx === idx ? 'Fetching...' : 'Import'}
                          </button>
                        </div>
                      )}

                      {urlErrors[idx] && (
                        <p style={{ color: '#ef4444', fontSize: '11.5px', margin: '0 0 6px 0', fontWeight: '500' }}>
                          ⚠️ {urlErrors[idx]}
                        </p>
                      )}

                      <textarea
                        placeholder={`Paste job description #${idx + 1} here...`}
                        value={jd}
                        onChange={(e) => handleJdChange(idx, e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '90px',
                          padding: '10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          background: 'rgba(255, 255, 255, 0.02)',
                          color: 'inherit',
                          fontSize: '13.5px',
                          resize: 'vertical',
                        }}
                      />
                    </div>
                    {jds.length > 1 && (
                      <button
                        onClick={() => handleRemoveJd(idx)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          padding: '8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          marginTop: '4px',
                        }}
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ color: '#ef4444', fontSize: '14px', fontWeight: '500' }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                className="app-btn app-btn--accent"
                onClick={handleCompare}
                disabled={loading}
                style={{ minWidth: '160px' }}
              >
                {loading ? <Loader2 size={16} className="spin" /> : <GitCompare size={16} />}
                Compare Job Descriptions
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Resume Skills Panel */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <h4
                style={{
                  margin: '0 0 10px 0',
                  fontSize: '14px',
                  textTransform: 'uppercase',
                  opacity: 0.75,
                  letterSpacing: '0.04em',
                }}
              >
                Skills Found in Resume
              </h4>
              {results.resume_skills.length === 0 ? (
                <p style={{ margin: 0, opacity: 0.5, fontSize: '13px' }}>
                  No skills detected in your resume.
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {results.resume_skills.map((skill) => (
                    <span
                      key={skill}
                      className="badge bg-secondary"
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'inherit',
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Comparisons List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                Match Results (Sorted by Best Match)
              </h4>

              {results.comparisons.map((item, idx) => {
                const isExpanded = expandedJds[idx]
                const jdSnippet =
                  item.job_description.length > 120
                    ? item.job_description.slice(0, 120) + '...'
                    : item.job_description

                // Determine score color
                let scoreColor = '#ef4444' // red
                if (item.score >= 70)
                  scoreColor = '#22c55e' // green
                else if (item.score >= 40) scoreColor = '#eab308' // yellow

                return (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.015)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    {/* Header Row */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: '700',
                            color: 'var(--color-primary, #6366f1)',
                            textTransform: 'uppercase',
                          }}
                        >
                          Role Option #{idx + 1}
                        </span>
                        <div
                          onClick={() => toggleExpand(idx)}
                          style={{
                            fontSize: '13.5px',
                            cursor: 'pointer',
                            opacity: 0.9,
                            fontStyle: 'italic',
                            marginTop: '4px',
                            lineHeight: '1.4',
                          }}
                          title="Click to view full job description"
                        >
                          "{isExpanded ? item.job_description : jdSnippet}"
                          {item.job_description.length > 120 && (
                            <span
                              style={{
                                color: 'var(--color-primary, #6366f1)',
                                marginLeft: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                              }}
                            >
                              {isExpanded ? 'Show Less' : 'Show More'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '50%',
                            border: `3px solid ${scoreColor}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '15px',
                            fontWeight: '700',
                            color: scoreColor,
                            background: 'rgba(0, 0, 0, 0.1)',
                          }}
                        >
                          {item.score}%
                        </div>
                      </div>
                    </div>

                    {/* Skills Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '16px',
                        marginTop: '4px',
                      }}
                    >
                      {/* Matched */}
                      <div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            color: '#22c55e',
                            display: 'block',
                            marginBottom: '6px',
                          }}
                        >
                          Matched Skills ({item.matched_skills.length})
                        </span>
                        {item.matched_skills.length === 0 ? (
                          <span style={{ fontSize: '12px', opacity: 0.5 }}>None</span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {item.matched_skills.map((s) => (
                              <span
                                key={s}
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  background: 'rgba(34, 197, 94, 0.15)',
                                  color: '#22c55e',
                                  border: '1px solid rgba(34, 197, 94, 0.2)',
                                }}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Missing */}
                      <div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            color: '#ef4444',
                            display: 'block',
                            marginBottom: '6px',
                          }}
                        >
                          Missing Skills ({item.missing_skills.length})
                        </span>
                        {item.missing_skills.length === 0 ? (
                          <span style={{ fontSize: '12px', opacity: 0.5 }}>None</span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {item.missing_skills.map((s) => (
                              <span
                                key={s}
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.2)',
                                }}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Suggestions */}
                    {item.suggestions.length > 0 && (
                      <div
                        style={{
                          marginTop: '8px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                          paddingTop: '10px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            opacity: 0.8,
                            display: 'block',
                            marginBottom: '4px',
                          }}
                        >
                          Recommendations:
                        </span>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: '16px',
                            fontSize: '12.5px',
                            opacity: 0.85,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                          }}
                        >
                          {item.suggestions.slice(0, 3).map((sug, i) => (
                            <li key={i}>{sug}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '12px',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <button
                className="app-btn app-btn--secondary"
                onClick={() => {
                  setResults(null)
                  setError(null)
                }}
              >
                Compare Another Set
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="app-btn app-btn--accent"
                  onClick={handleDownloadZip}
                  disabled={downloadingZip}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {downloadingZip ? <Loader2 size={16} className="spin" /> : <Archive size={16} />}
                  Download All (.ZIP)
                </button>
                <button className="app-btn" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
