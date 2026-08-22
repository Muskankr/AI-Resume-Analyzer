import React, { useState } from 'react'
import { X, Layers, Loader2, Trash2, ChevronRight, FileText, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import axios from 'axios'
import { ScoreBreakdown, type ScoreBreakdownData } from './ScoreBreakdown'

interface BulkResumeAnalysisModalProps {
  onClose: () => void
  initialTargetRole?: string
  initialExperienceLevel?: string
  initialJobDescription?: string
}

interface ResumeAnalysisResult {
  index: number
  file_name: string
  score: number
  matched_skills: string[]
  missing_skills: string[]
  partial_skills?: Array<{ skill: string; matched_variant: string; note?: string }>
  skills_found: string[]
  suggestions: string[]
  readability_score?: number
  readability_label?: string
  score_breakdown?: ScoreBreakdownData
  error?: string
  target_role: string
  experience_level: string
}

interface BulkApiResponse {
  target_role: string
  experience_level: string
  total_resumes: number
  resumes: ResumeAnalysisResult[]
}

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

export const BulkResumeAnalysisModal: React.FC<BulkResumeAnalysisModalProps> = ({
  onClose,
  initialTargetRole = 'Frontend Developer',
  initialExperienceLevel = 'Mid-Level',
  initialJobDescription = '',
}) => {
  const [files, setFiles] = useState<File[]>([])
  const [targetRole, setTargetRole] = useState(initialTargetRole)
  const [experienceLevel, setExperienceLevel] = useState(initialExperienceLevel)
  const [jobDescription, setJobDescription] = useState(initialJobDescription)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<BulkApiResponse | null>(null)
  const [selectedResume, setSelectedResume] = useState<ResumeAnalysisResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelection = (newFiles: FileList | null) => {
    if (!newFiles) return
    const validArray: File[] = []
    for (let i = 0; i < newFiles.length; i++) {
      const f = newFiles[i]
      const ext = f.name.toLowerCase()
      if (ext.endsWith('.pdf') || ext.endsWith('.docx') || ext.endsWith('.txt')) {
        validArray.push(f)
      }
    }
    if (validArray.length === 0) {
      setError('Please select valid resume files (.pdf, .docx, or .txt).')
      return
    }
    setError(null)
    setFiles((prev) => {
      const combined = [...prev, ...validArray]
      return combined.slice(0, 10)
    })
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAnalyzeBulk = async () => {
    if (files.length === 0) {
      setError('Please select or upload at least one resume.')
      return
    }

    setLoading(true)
    setError(null)
    setSelectedResume(null)

    try {
      const formData = new FormData()
      files.forEach((f) => {
        formData.append('files', f)
      })
      formData.append('target_role', targetRole)
      formData.append('experience_level', experienceLevel)
      if (jobDescription.trim()) {
        formData.append('job_description', jobDescription.trim())
      }

      const res = await axios.post<BulkApiResponse>(`${BACKEND}/api/compare-bulk-resumes/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      setResults(res.data)
    } catch (err: unknown) {
      let msg = 'Failed to analyze bulk resumes.'
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.error || err.message
      } else if (err instanceof Error) {
        msg = err.message
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="bulk-resume-modal-title">
      <div
        className="compare-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '900px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="compare-modal__header">
          <h3 id="bulk-resume-modal-title" style={{ fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={22} style={{ color: 'var(--color-primary, #6366f1)' }} /> Bulk Resume Analysis
          </h3>
          <button className="compare-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {!results ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
            <p style={{ fontSize: '14.5px', opacity: 0.85, margin: 0 }}>
              Upload and analyze multiple candidate resumes or variations at once (up to 10 files).
            </p>

            {/* Target Role & Level configuration */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', opacity: 0.85 }}>Target Role</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'inherit',
                  }}
                >
                  <option value="Frontend Developer">Frontend Developer</option>
                  <option value="Backend Developer">Backend Developer</option>
                  <option value="Data Analyst">Data Analyst</option>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', opacity: 0.85 }}>Experience Level</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'inherit',
                  }}
                >
                  <option value="Junior">Junior (0-2 yrs)</option>
                  <option value="Mid-Level">Mid-Level (2-5 yrs)</option>
                  <option value="Senior">Senior (5+ yrs)</option>
                </select>
              </div>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', opacity: 0.85 }}>
                  Target Job Description <span style={{ fontSize: '12px', opacity: 0.6, fontWeight: 'normal' }}>(Optional)</span>
                </label>
                <textarea
                  placeholder="Paste specific job description text to tailor keyword scoring across all candidate resumes..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'inherit',
                    fontSize: '13px',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            {/* Drag and Drop multi-file area */}
            <div
              className={`upload-box${isDragging ? ' dragging' : ''}`}
              style={{ padding: '24px 16px', textAlign: 'center' }}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                handleFileSelection(e.dataTransfer.files)
              }}
            >
              <input
                type="file"
                id="bulkFileUpload"
                multiple
                className="sr-only"
                accept=".pdf,.docx,.txt"
                onChange={(e) => handleFileSelection(e.target.files)}
              />
              <label htmlFor="bulkFileUpload" className="upload-label" style={{ cursor: 'pointer' }}>
                <span className="upload-icon-wrapper" aria-hidden="true">
                  📁
                </span>
                <span className="upload-text-primary">
                  Drag &amp; Drop Multiple Resumes or <span className="upload-text-browse">Browse Files</span>
                </span>
                <span className="upload-text-secondary">
                  Supports PDF, DOCX or TXT (up to 10 resumes at once)
                </span>
              </label>
            </div>

            {/* Selected files list */}
            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '600' }}>
                  Selected Files ({files.length}/10):
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {files.map((file, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        background: 'rgba(255, 255, 255, 0.07)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        fontSize: '13px',
                      }}
                    >
                      <FileText size={14} />
                      <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(i)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '0 2px',
                        }}
                        aria-label={`Remove ${file.name}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <div style={{ color: '#ef4444', fontSize: '14px', fontWeight: '500' }}>⚠️ {error}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                className="app-btn app-btn--accent"
                onClick={handleAnalyzeBulk}
                disabled={loading || files.length === 0}
                style={{ minWidth: '180px' }}
              >
                {loading ? <Loader2 size={16} className="spin" /> : <Layers size={16} />}
                Analyze {files.length > 0 ? `${files.length} Resume${files.length > 1 ? 's' : ''}` : 'Resumes'}
              </button>
            </div>
          </div>
        ) : selectedResume ? (
          /* Single Resume Detail View */
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <button
              type="button"
              className="app-btn app-btn--secondary"
              onClick={() => setSelectedResume(null)}
              style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={16} /> Back to Summary Table
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>{selectedResume.file_name}</h4>
                <span style={{ fontSize: '13px', opacity: 0.7 }}>
                  Track: {selectedResume.target_role} ({selectedResume.experience_level})
                </span>
              </div>
              <div
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontWeight: '800',
                  fontSize: '18px',
                  background: selectedResume.score >= 75 ? 'rgba(34, 197, 94, 0.15)' : selectedResume.score >= 50 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: selectedResume.score >= 75 ? '#22c55e' : selectedResume.score >= 50 ? '#eab308' : '#ef4444',
                  border: '1px solid currentColor',
                }}
              >
                ATS Match: {selectedResume.score}%
              </div>
            </div>

            {selectedResume.score_breakdown && (
              <ScoreBreakdown breakdown={selectedResume.score_breakdown} defaultExpanded={true} />
            )}

            {/* Matched & Missing Skills Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '14px', borderRadius: '8px' }}>
                <h5 style={{ color: '#22c55e', margin: '0 0 10px 0', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} /> Matched Skills ({selectedResume.matched_skills.length})
                </h5>
                {selectedResume.matched_skills.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '13px', opacity: 0.6 }}>No required skills matched.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedResume.matched_skills.map((s, idx) => (
                      <span key={idx} style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '14px', borderRadius: '8px' }}>
                <h5 style={{ color: '#ef4444', margin: '0 0 10px 0', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={16} /> Missing Skills ({selectedResume.missing_skills.length})
                </h5>
                {selectedResume.missing_skills.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '13px', color: '#22c55e' }}>All target skills covered!</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedResume.missing_skills.map((s, idx) => (
                      <span key={idx} style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Suggestions */}
            {selectedResume.suggestions.length > 0 && (
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <h5 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '700' }}>Recommendations</h5>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedResume.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          /* Summary Table View */
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
                  Analysis Summary ({results.total_resumes} Resumes Analyzed)
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.75 }}>
                  Target Track: <strong>{results.target_role}</strong> ({results.experience_level})
                </p>
              </div>
              <button
                type="button"
                className="app-btn app-btn--secondary"
                onClick={() => {
                  setResults(null)
                  setFiles([])
                  setSelectedResume(null)
                }}
              >
                Upload New Batch
              </button>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Rank</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Resume / Candidate</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>ATS Score</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Matched Skills</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Missing Skills</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {results.resumes.map((resume, idx) => {
                    const scoreColor = resume.score >= 75 ? '#22c55e' : resume.score >= 50 ? '#eab308' : '#ef4444'
                    return (
                      <tr
                        key={idx}
                        onClick={() => setSelectedResume(resume)}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: '700', opacity: 0.8 }}>#{idx + 1}</td>
                        <td style={{ padding: '12px 16px', fontWeight: '600' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={16} style={{ color: 'var(--color-primary, #6366f1)' }} />
                            <span>{resume.file_name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontWeight: '700',
                              color: scoreColor,
                              background: 'rgba(0, 0, 0, 0.2)',
                            }}
                          >
                            {resume.score}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ color: '#22c55e', fontWeight: '600' }}>{resume.matched_skills.length} matched</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ color: '#ef4444', fontWeight: '600' }}>{resume.missing_skills.length} missing</span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="app-btn app-btn--secondary"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedResume(resume)
                            }}
                            style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            View Details <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
