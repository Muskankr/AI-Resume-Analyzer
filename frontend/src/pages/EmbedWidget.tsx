import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import { api } from '../api/client'
import { Button } from '../components/Button'
import { AtsScore } from '../AtsScore'
import {
  RESUME_ACCEPT_ATTRIBUTE,
  describeUploadLimits,
  validateResumeFile,
} from '../utils/fileValidation'
import { AnalysisAbortedError, abortableSleep, pollAnalysisTask } from '../utils/pollAnalysisTask'
import { analysisTokenHeaders } from '../utils/analysisToken'

interface EmbedAnalysisResult {
  score: number
  readability_label?: string | null
  skills_found?: string[]
  suggestions?: string[]
  matched_skills?: string[]
  missing_skills?: string[]
}

export default function EmbedWidget() {
  const location = useLocation()

  // Parse configurations from query parameters
  const searchParams = new URLSearchParams(location.search)
  const theme = searchParams.get('theme') || 'light'
  const brandName = searchParams.get('brandName') || 'AI Resume Analyzer'
  const logoUrl = searchParams.get('logoUrl') || ''
  const primaryColor = searchParams.get('primaryColor') || ''
  const hideTargetRole = searchParams.get('hideTargetRole') === 'true'
  const defaultRole = searchParams.get('defaultRole') || 'Frontend Developer'
  const defaultLevel = searchParams.get('defaultLevel') || 'Mid-Level'
  const hideJd = searchParams.get('hideJd') === 'true'
  const minHeight = searchParams.get('minHeight') || 'auto'
  const maxHeight = searchParams.get('maxHeight') || 'auto'

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

  // Component States
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [targetRole, setTargetRole] = useState(defaultRole)
  const [experienceLevel, setExperienceLevel] = useState(defaultLevel)
  const [jobDescription, setJobDescription] = useState('')

  // Results States
  const [result, setResult] = useState<EmbedAnalysisResult | null>(null)

  const pollAbortRef = useRef<AbortController | null>(null)

  // Force specified theme in document body/element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    return () => {
      pollAbortRef.current?.abort()
    }
  }, [theme])

  const runAnalysis = async (fileToAnalyze: File) => {
    try {
      setLoading(true)
      setUploadError(null)
      setResult(null)

      const formData = new FormData()
      formData.append('file', fileToAnalyze)
      formData.append('role', targetRole)
      formData.append('experience_level', experienceLevel)
      if (jobDescription.trim()) {
        formData.append('job_description', jobDescription.trim())
      }

      const res = await api.post('/api/upload/', formData)
      const taskId = res.data.task_id
      const analysisHeaders = analysisTokenHeaders(res.data.analysis_token)

      pollAbortRef.current?.abort()
      const pollController = new AbortController()
      pollAbortRef.current = pollController

      const analysisResult = (await pollAnalysisTask(
        taskId,
        {
          fetchStatus: async (id, signal) => {
            const statusRes = await api.get(`/api/status/${id}/`, {
              signal,
              headers: analysisHeaders,
            })
            return statusRes.data
          },
          sleep: abortableSleep,
          now: () => Date.now(),
        },
        { signal: pollController.signal }
      )) as EmbedAnalysisResult

      setResult(analysisResult)
      setLoading(false)
    } catch (error: unknown) {
      if (error instanceof AnalysisAbortedError) {
        return
      }
      console.error(error)
      let errorMsg = 'Unknown error'
      if (axios.isAxiosError(error)) {
        errorMsg = error.response?.data?.error ?? error.message
      } else if (error instanceof Error) {
        errorMsg = error.message
      }
      setUploadError(`Analysis failed: ${errorMsg}`)
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setUploadError('Please select or drop a resume file first.')
      return
    }
    await runAnalysis(file)
  }

  const handleReset = () => {
    setFile(null)
    setUploadError(null)
    setResult(null)
    setJobDescription('')
  }

  // Generate dynamic custom styles
  const widgetStyles: React.CSSProperties = {
    minHeight,
    maxHeight,
    ...(primaryColor
      ? {
          '--color-primary': primaryColor,
          '--upload-icon-color': primaryColor,
          '--upload-file-name': primaryColor,
          '--btn-accent-bg': primaryColor,
          '--widget-primary': primaryColor,
        }
      : {}),
  } as React.CSSProperties

  return (
    <div
      className="embed-widget-container p-4 font-sans text-neutral-800 dark:text-neutral-100 bg-surface-bg dark:bg-card-bg"
      style={widgetStyles}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b pb-3 mb-4 border-surface-border">
        <div className="flex items-center gap-2">
          {logoUrl && <img src={logoUrl} alt="Logo" className="h-8 max-w-[120px] object-contain" />}
          <h2 className="text-lg font-bold text-heading-text">{brandName}</h2>
        </div>
      </div>

      {!result ? (
        <div className="space-y-4">
          {/* Target Role & Experience Selectors */}
          {!hideTargetRole && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="embedRoleSelect" className="text-xs font-semibold text-muted-text">
                  Target Career Track:
                </label>
                <select
                  id="embedRoleSelect"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="p-2 border rounded-md text-sm border-surface-border bg-control-bg text-control-text"
                >
                  <option value="Frontend Developer">Frontend Developer</option>
                  <option value="Backend Developer">Backend Developer</option>
                  <option value="Full Stack Developer">Full Stack Developer</option>
                  <option value="Data Scientist">Data Scientist</option>
                  <option value="Data Analyst">Data Analyst</option>
                  <option value="DevOps Engineer">DevOps Engineer</option>
                  <option value="Product Manager">Product Manager</option>
                  <option value="QA Engineer">QA Engineer</option>
                  <option value="UX/UI Designer">UX/UI Designer</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="embedLevelSelect" className="text-xs font-semibold text-muted-text">
                  Experience Level:
                </label>
                <select
                  id="embedLevelSelect"
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="p-2 border rounded-md text-sm border-surface-border bg-control-bg text-control-text"
                >
                  <option value="Junior">Junior (0-2 yrs)</option>
                  <option value="Mid-Level">Mid-Level (2-5 yrs)</option>
                  <option value="Senior">Senior (5+ yrs)</option>
                </select>
              </div>
            </div>
          )}

          {/* Optional Job Description Input */}
          {!hideJd && (
            <div className="flex flex-col gap-1">
              <label htmlFor="embedJdInput" className="text-xs font-semibold text-muted-text">
                Job Description (Optional):
              </label>
              <textarea
                id="embedJdInput"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here to check for keyword matching..."
                rows={3}
                maxLength={2000}
                className="p-2 border rounded-md text-sm border-surface-border bg-control-bg text-control-text resize-y"
              />
            </div>
          )}

          {/* Upload Zone */}
          <div
            className={`upload-box border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-primary bg-upload-bg-hover'
                : 'border-surface-border bg-upload-bg'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const f = e.dataTransfer.files[0]
                const validation = validateResumeFile(f, {
                  maxSizeBytes: MAX_FILE_SIZE,
                  label: 'resume',
                })
                if (validation.ok) {
                  setFile(f)
                  setUploadError(null)
                } else {
                  setUploadError(validation.error)
                  setFile(null)
                }
              }
            }}
          >
            <input
              type="file"
              id="embedFileUpload"
              className="sr-only"
              accept={RESUME_ACCEPT_ATTRIBUTE}
              onChange={(e) => {
                const f = e.target.files && e.target.files[0] ? e.target.files[0] : null
                if (f) {
                  const validation = validateResumeFile(f, {
                    maxSizeBytes: MAX_FILE_SIZE,
                    label: 'resume',
                  })
                  if (validation.ok) {
                    setFile(f)
                    setUploadError(null)
                  } else {
                    setUploadError(validation.error)
                    setFile(null)
                  }
                }
              }}
            />
            <label htmlFor="embedFileUpload" className="cursor-pointer w-full h-full block">
              <div
                className="text-3xl mb-2"
                style={{ color: primaryColor || 'var(--upload-icon-color)' }}
              >
                📄
              </div>
              <p className="text-sm font-semibold mb-1">
                Drag & Drop Resume or <span className="text-primary hover:underline">Browse</span>
              </p>
              <p className="text-xs text-muted-text">
                {file ? `Selected: ${file.name}` : describeUploadLimits(MAX_FILE_SIZE)}
              </p>
            </label>
          </div>

          {/* Action button & status */}
          {uploadError && (
            <div className="p-2 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-md">
              {uploadError}
            </div>
          )}

          <div className="flex justify-center pt-2">
            <Button
              variant="accent"
              size="lg"
              onClick={handleUpload}
              disabled={loading || !file}
              className="w-full max-w-xs"
              style={
                primaryColor
                  ? { backgroundColor: primaryColor, borderColor: primaryColor }
                  : undefined
              }
            >
              {loading ? 'Analyzing...' : '🚀 Analyze Resume'}
            </Button>
          </div>
        </div>
      ) : (
        /* Results Section */
        <div className="space-y-5">
          <div className="flex flex-col items-center text-center">
            <AtsScore score={result.score} readabilityLabel={result.readability_label} />
          </div>

          {/* Matched Skills */}
          {result.matched_skills && result.matched_skills.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-muted-text uppercase tracking-wider mb-2">
                Matched Skills ({result.matched_skills.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {result.matched_skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs font-semibold rounded"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Skills */}
          {result.missing_skills && result.missing_skills.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-muted-text uppercase tracking-wider mb-2">
                Missing Skills ({result.missing_skills.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {result.missing_skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs font-semibold rounded"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-muted-text uppercase tracking-wider mb-2">
                Key Recommendations
              </h4>
              <ul className="text-xs space-y-1.5 list-disc pl-4 text-neutral-700 dark:text-neutral-300">
                {result.suggestions.slice(0, 5).map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-center pt-2 border-t border-surface-border">
            <Button variant="outline" size="md" onClick={handleReset}>
              🔄 Analyze Another Resume
            </Button>
          </div>
        </div>
      )}

      {/* Attribution */}
      <div className="text-center mt-6 pt-3 border-t border-surface-border text-[10px] text-muted-text">
        Powered by{' '}
        <a
          href={window.location.origin}
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold hover:text-primary"
        >
          AI Resume Analyzer
        </a>
      </div>
    </div>
  )
}
