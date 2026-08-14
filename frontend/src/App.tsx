import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, Link } from 'react-router-dom'
import axios from 'axios'
import './index.css'
import { AtsScore } from './AtsScore'
import {
  RESUME_ACCEPT_ATTRIBUTE,
  describeUploadLimits,
  validateResumeFile,
} from './utils/fileValidation'
import { useAnalysisHistory, type AnalysisEntry } from './hooks/useAnalysisHistory'
import { HistorySidebar } from './HistorySidebar'
import { useAuth } from './hooks/useAuth'
import { AuthModal } from './AuthModal'
import { SuggestionVote, type VoteValue } from './components/SuggestionVote'
import { Footer } from './Footer'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import { InterviewQuestionsPanel } from './components/InterviewQuestionsPanel'
import { ScoreBreakdown, type ScoreBreakdownData } from './components/ScoreBreakdown'
import {
  AnalysisAbortedError,
  abortableSleep,
  pollAnalysisTask,
} from './utils/pollAnalysisTask'

/** The subset of the analysis payload this screen reads. */
interface AnalysisResult {
  id?: number
  score: number
  score_breakdown?: ScoreBreakdownData | null
  skills_found?: string[]
  suggestions?: string[]
  matched_skills?: string[]
  missing_skills?: string[]
  resume_text?: string
}

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
  } catch {
    // localStorage / matchMedia can throw in restricted privacy modes
  }
  return 'light'
}

function highlightSkills(text: string, skills: string[]): React.ReactNode[] {
  if (!text) return []
  if (skills.length === 0) return [text]

  // Sort longest first so multi-word skills (e.g. "machine learning") match before shorter ones
  const sorted = [...skills].sort((a, b) => b.length - a.length)
  const escaped = sorted.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  // \b works for alphanumeric boundaries; for symbols like c++ we use lookahead/lookbehind
  const pattern = new RegExp(`(?<![\\w])(${escaped.join('|')})(?![\\w])`, 'gi')
  const parts = text.split(pattern)
  const skillSet = new Set(skills.map((s) => s.toLowerCase()))

  return parts.map((part, i) =>
    skillSet.has(part.toLowerCase()) ? (
      <mark key={i} className="skill-highlight">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

/** Rows per request from `/api/history/`. */
const HISTORY_PAGE_SIZE = 20

interface HistoryRow {
  id: number
  file_name: string
  score: number
  skills_found: string[]
  suggestions: string[]
  matched_skills: string[]
  missing_skills: string[]
  target_role: string
  created_at: string
}

interface HistoryPage {
  count: number
  next: string | null
  results: HistoryRow[]
}

/** `/api/history/` answers with a bare array, or an envelope when paginated. */
function historyRowsOf(payload: HistoryRow[] | HistoryPage): HistoryRow[] {
  return Array.isArray(payload) ? payload : (payload?.results ?? [])
}

function nextPageUrl(payload: HistoryRow[] | HistoryPage): string | null {
  return Array.isArray(payload) ? null : (payload?.next ?? null)
}

function toAnalysisEntries(payload: HistoryRow[] | HistoryPage): AnalysisEntry[] {
  return historyRowsOf(payload).map((item) => ({
    id: String(item.id),
    timestamp: new Date(item.created_at).getTime(),
    score: item.score,
    skills: item.skills_found,
    suggestions: item.suggestions,
    matchedSkills: item.matched_skills,
    missingSkills: item.missing_skills,
    targetRole: item.target_role,
    fileName: item.file_name,
  }))
}

function ResumePreview({ text, skills }: { text: string; skills: string[] }) {
  if (!text) return null
  return (
    <div className="resume-preview mt-4">
      <h4>📄 Resume Text Preview</h4>
      <pre className="resume-preview__body">{highlightSkills(text, skills)}</pre>
    </div>
  )
}

function App() {
  const location = useLocation()
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  const [isDragging, setIsDragging] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdownData | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [roastMode, setRoastMode] = useState<boolean>(false)
  // Server-side id of the current analysis. Only set for signed-in users —
  // anonymous analyses are not persisted, so there is nothing to attach a vote to.
  const [analysisId, setAnalysisId] = useState<number | null>(null)
  const [suggestionVotes, setSuggestionVotes] = useState<Record<string, VoteValue>>({})

  // Component States
  const [targetRole, setTargetRole] = useState('Frontend Developer')
  const [matchedSkills, setMatchedSkills] = useState<string[]>([])
  const [missingSkills, setMissingSkills] = useState<string[]>([])
  const [showAllSkills, setShowAllSkills] = useState(false)
  const [copied, setCopied] = useState(false)
  const [analysisSource, setAnalysisSource] = useState<'sample' | 'upload' | null>(null)
  const [resumeText, setResumeText] = useState<string>('')
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([])

  // Retry state
  const [retryCount, setRetryCount] = useState(0)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  // Auth
  const { user, signup, login, logout } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  // History
  const { entries, deleteEntry, clearHistory, setEntries, unreadCount, lastViewedTimestamp, markAllAsViewed } = useAnalysisHistory()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyNextUrl, setHistoryNextUrl] = useState<string | null>(null)
  const [activeFileName, setActiveFileName] = useState('')

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

  const fetchDbHistory = useCallback(
    async (token: string) => {
      try {
        const res = await axios.get(
          `${backendUrl}/api/history/?page=1&page_size=${HISTORY_PAGE_SIZE}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        // The endpoint returns a bare array when asked for no particular page,
        // and a {count, next, results} envelope otherwise. Handle both so this
        // keeps working against a backend that has not been updated yet.
        setEntries(toAnalysisEntries(res.data))
        setHistoryNextUrl(nextPageUrl(res.data))
      } catch {
        /* silently ignore */
      }
    },
    [backendUrl, setEntries]
  )

  const loadMoreDbHistory = useCallback(async () => {
    if (!historyNextUrl || !user) return
    try {
      const res = await axios.get(historyNextUrl, {
        headers: { Authorization: `Bearer ${user.token}` },
      })
      const older = toAnalysisEntries(res.data)
      setEntries((previous) => {
        const seen = new Set(previous.map((entry) => entry.id))
        return [...previous, ...older.filter((entry) => !seen.has(entry.id))]
      })
      setHistoryNextUrl(nextPageUrl(res.data))
    } catch {
      /* silently ignore */
    }
  }, [historyNextUrl, setEntries, user])

  useEffect(() => {
    if (user) fetchDbHistory(user.token)
  }, [user, fetchDbHistory])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // persistence is best-effort; ignore if storage is unavailable
    }
  }, [theme])

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining((prev) => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldownRemaining])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  // Holds the in-flight analysis poll so it can be abandoned when a new run
  // starts or the component unmounts. Previously the loop had no owner and
  // simply kept polling after the user navigated away.
  const pollAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort()
    }
  }, [])

  const getRetryDelay = (attemptNumber: number): number => {
    // Exponential backoff: 2^attemptNumber seconds, capped at 30 seconds
    const delay = Math.pow(2, attemptNumber)
    return Math.min(delay, 30)
  }

  const runAnalysis = async (fileToAnalyze: File, source: 'sample' | 'upload') => {
    try {
      setLoading(true)
      setAnalysisSource(source)
      const formData = new FormData()
      formData.append('file', fileToAnalyze)
      formData.append('role', targetRole)

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'
      const headers = user ? { Authorization: `Bearer ${user.token}` } : {}
      const res = await axios.post(`${backendUrl}/api/upload/`, formData, { headers })
      const taskId = res.data.task_id

      // Any previous run is abandoned before this one starts, so two
      // analyses cannot race to write the result state.
      pollAbortRef.current?.abort()
      const pollController = new AbortController()
      pollAbortRef.current = pollController

      const result = (await pollAnalysisTask(
        taskId,
        {
          fetchStatus: async (id, signal) => {
            const statusRes = await axios.get(`${backendUrl}/api/status/${id}/`, { signal })
            return statusRes.data
          },
          sleep: abortableSleep,
          now: () => Date.now(),
        },
        { signal: pollController.signal }
      )) as AnalysisResult

      setScore(result.score)
      setScoreBreakdown(result.score_breakdown || null)
      setSkills(result.skills_found || [])
      setSuggestions(result.suggestions || [])
      setMatchedSkills(result.matched_skills || [])
      setMissingSkills(result.missing_skills || [])
      setResumeText(result.resume_text || '')
      setInterviewQuestions(result.interview_questions || [])
      setAnalysisId(typeof result.id === 'number' ? result.id : null)
      setSuggestionVotes({})
      setActiveFileName(fileToAnalyze.name)

      setLoading(false)

      // Reset retry state on success
      setRetryCount(0)
      setCooldownRemaining(0)

      if (user) {
        await fetchDbHistory(user.token)
      }
    } catch (error: unknown) {
      // The run was superseded or the component went away. There is nobody to
      // tell, and the state it would write belongs to a newer run.
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

      alert(
        source === 'sample' ? `Sample analysis failed: ${errorMsg}` : `Upload failed: ${errorMsg}`
      )

      setLoading(false)

      // Increment retry count and set cooldown
      const newRetryCount = retryCount + 1
      setRetryCount(newRetryCount)
      setCooldownRemaining(getRetryDelay(newRetryCount))
    }
  }

  const uploadResume = async () => {
    if (!file) {
      alert('Please upload resume')
      return
    }
    if (uploadError) {
      alert(uploadError)
      return
    }
    if (cooldownRemaining > 0) {
      return // Prevent retry during cooldown
    }
    await runAnalysis(file, 'upload')
  }

  const handleSampleResume = async () => {
    if (cooldownRemaining > 0) {
      return // Prevent retry during cooldown
    }

    try {
      setLoading(true)
      setAnalysisSource('sample')

      const response = await fetch('/sample-resume.pdf')

      if (!response.ok) {
        throw new Error('Failed to load sample resume PDF')
      }

      const blob = await response.blob()

      const sampleFile = new File([blob], 'sample-resume.pdf', { type: 'application/pdf' })

      await runAnalysis(sampleFile, 'sample')

      setActiveFileName(sampleFile.name)
    } catch (error: unknown) {
      console.error(error)
      alert('Could not load sample resume')
      setLoading(false)
    }
  }

  const resetAnalysis = () => {
    setFile(null)
    setScore(null)
    setScoreBreakdown(null)
    setSkills([])
    setSuggestions([])
    setMatchedSkills([])
    setMissingSkills([])
    setResumeText('')
    setInterviewQuestions([])
    setShowAllSkills(false)
    setCopied(false)
    setAnalysisSource(null)
    setAnalysisId(null)
    setSuggestionVotes({})
    setActiveFileName('')
    setRetryCount(0)
    setCooldownRemaining(0)
  }

  const submitSuggestionVote = useCallback(
    async (suggestion: string, vote: VoteValue | null) => {
      if (!user || analysisId === null) return

      // Update locally first so the control responds immediately, and roll
      // back if the request fails — a vote that silently vanishes is exactly
      // what this endpoint used to do.
      const previous = suggestionVotes[suggestion] ?? null
      setSuggestionVotes((current) => {
        const next = { ...current }
        if (vote === null) delete next[suggestion]
        else next[suggestion] = vote
        return next
      })

      const config = { headers: { Authorization: `Bearer ${user.token}` } }
      const payload = { analysis_id: analysisId, suggestion_text: suggestion }

      try {
        if (vote === null) {
          await axios.delete(`${backendUrl}/api/suggestion-feedback/`, {
            ...config,
            data: payload,
          })
        } else {
          await axios.post(`${backendUrl}/api/suggestion-feedback/`, { ...payload, vote }, config)
        }
      } catch {
        setSuggestionVotes((current) => {
          const rolledBack = { ...current }
          if (previous === null) delete rolledBack[suggestion]
          else rolledBack[suggestion] = previous
          return rolledBack
        })
      }
    },
    [analysisId, backendUrl, suggestionVotes, user]
  )

  // Restore votes already cast against this analysis, so returning to it does
  // not reset every control to neutral.
  useEffect(() => {
    if (!user || analysisId === null) return

    let cancelled = false
    axios
      .get(`${backendUrl}/api/suggestion-feedback/?analysis_id=${analysisId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      })
      .then((res) => {
        if (cancelled) return
        const stored: Record<string, VoteValue> = {}
        for (const row of res.data?.results ?? []) {
          stored[row.suggestion_text] = row.vote
        }
        setSuggestionVotes(stored)
      })
      .catch(() => {
        /* votes are a nice-to-have; leave the controls neutral */
      })

    return () => {
      cancelled = true
    }
  }, [analysisId, backendUrl, user])

  const copySuggestionsToClipboard = () => {
    if (suggestions.length === 0) return
    const plainTextSuggestions = suggestions.map((s: string) => `• ${s}`).join('\n')
    navigator.clipboard
      .writeText(plainTextSuggestions)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch((err) => console.error('Failed to copy text: ', err))
  }

  const selectHistoryEntry = (entry: AnalysisEntry) => {
    setScore(entry.score)
    // History entries predate the breakdown and do not carry one.
    setScoreBreakdown(null)
    setSkills(entry.skills)
    setSuggestions(entry.suggestions)
    setMatchedSkills(entry.matchedSkills)
    setMissingSkills(entry.missingSkills)
    setTargetRole(entry.targetRole)
    // History entries carry a client-side id, not the analysis id, so there is
    // nothing safe to attach a vote to when one is replayed.
    setAnalysisId(null)
    setSuggestionVotes({})
    setActiveFileName(entry.fileName)
    setShowAllSkills(false)
    setCopied(false)
    setHistoryOpen(false)
  }

  if (location.pathname === '/privacy') {
    return (
      <>
        <PrivacyPolicyPage />
        <Footer />
      </>
    )
  }

  return (
    <>
      <HistorySidebar
        entries={entries}
        onSelect={selectHistoryEntry}
        onDelete={deleteEntry}
        onClear={clearHistory}
        isOpen={historyOpen}
        onToggle={() => setHistoryOpen((v) => !v)}
        unreadCount={unreadCount}
        lastViewedTimestamp={lastViewedTimestamp}
        onMarkAllAsViewed={markAllAsViewed}
        hasMoreOnServer={historyNextUrl !== null}
        onLoadMoreFromServer={loadMoreDbHistory}
      />
      <div className="container mt-5">
        <div className="main-card text-center">
          {/* Theme toggle */}
          <button
            type="button"
            className="app-btn theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            aria-pressed={theme === 'dark'}
          >
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
          {/* Auth bar */}
          <div className="auth-bar">
            {user ? (
              <>
                <Link to="/profile" className="auth-username" style={{ textDecoration: 'none', color: 'inherit' }}>
                  👤 {user.username}
                </Link>
                <button className="auth-bar-btn" onClick={logout}>
                  Logout
                </button>
              </>
            ) : (
              <button className="auth-bar-btn" onClick={() => setShowAuthModal(true)}>
                🔐 Login / Sign Up
              </button>
            )}
          </div>
          {showAuthModal && (
            <AuthModal onSignup={signup} onLogin={login} onClose={() => setShowAuthModal(false)} />
          )}
          <h1 className="mb-4">🚀 AI Resume Analyzer</h1>
          {/* Role Selector Dropdown */}
          <div className="mb-4">
            <label
              htmlFor="roleSelect"
              style={{ marginRight: '10px', fontWeight: '600', color: '#fff' }}
            >
              Target Career Track:
            </label>
            <select
              id="roleSelect"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
            >
              <option value="Frontend Developer">Frontend Developer</option>
              <option value="Backend Developer">Backend Developer</option>
              <option value="Data Analyst">Data Analyst</option>
            </select>
          </div>
          <div
            className={`upload-box mb-3${isDragging ? ' dragging' : ''}`}
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
                setUploadError(null)
                const result = validateResumeFile(f, {
                  maxSizeBytes: MAX_FILE_SIZE,
                  label: 'resume',
                })
                if (!result.ok) {
                  setUploadError(result.error)
                  setFile(null)
                  return
                }
                setFile(f)
              }
            }}
          >
            <input
              type="file"
              id="fileUpload"
              className="sr-only"
              accept={RESUME_ACCEPT_ATTRIBUTE}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setUploadError(null)
                const f = e.target.files && e.target.files[0] ? e.target.files[0] : null
                if (!f) {
                  setFile(null)
                  return
                }
                const result = validateResumeFile(f, {
                  maxSizeBytes: MAX_FILE_SIZE,
                  label: 'resume',
                })
                if (!result.ok) {
                  setUploadError(result.error)
                  setFile(null)
                  return
                }
                setFile(f)
              }}
            />
            <label htmlFor="fileUpload" className="upload-label">
              <span className="upload-icon-wrapper" aria-hidden="true">
                📄
              </span>
              <span className="upload-text-primary">
                Drag &amp; Drop Resume or <span className="upload-text-browse">Click to Browse</span>
              </span>
              {file ? (
                <span className="upload-text-secondary" style={{ display: 'block', marginTop: '4px' }}>
                  Selected: {file.name}
                </span>
              ) : uploadError ? (
                <span className="upload-text-error" style={{ display: 'block', marginTop: '4px', color: '#ff6b6b' }}>
                  {uploadError}
                </span>
              ) : (
                <span className="upload-text-secondary">{describeUploadLimits(MAX_FILE_SIZE)}</span>
              )}
            </label>
          </div>
          <div
            style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center' }}
            className="mb-3"
          >
            <button
              className="analyze-btn"
              onClick={uploadResume}
              disabled={loading || cooldownRemaining > 0}
            >
              {loading && analysisSource === 'upload'
                ? '⏳ Extracting and analyzing resume text...'
                : cooldownRemaining > 0
                  ? `Retry available in ${cooldownRemaining}s`
                  : '🚀 Analyze Resume'}
            </button>
            <button
              className="secondary-btn"
              onClick={handleSampleResume}
              disabled={loading || cooldownRemaining > 0}
              type="button"
            >
              {loading && analysisSource === 'sample'
                ? '⏳ Loading Sample...'
                : cooldownRemaining > 0
                  ? `Retry available in ${cooldownRemaining}s`
                  : 'Try Sample Resume'}
            </button>
          </div>
          {/* Loading spinner — shown while the resume is being analyzed */}
          {loading && (
            <div
              className="loader"
              role="status"
              aria-live="polite"
              aria-label="Analyzing resume, please wait"
            >
              <span className="sr-only">Analyzing resume, please wait…</span>
            </div>
          )}
          {/* Results */}
          {score !== null && (
            <>
              {analysisSource === 'sample' && (
                <div className="sample-notice-banner mb-4">
                  <span>ℹ️ Viewing Sample Resume Analysis</span>
                  <span style={{ fontWeight: 'normal', fontSize: '13px' }}>
                    — This analysis is based on a bundled sample resume.
                  </span>
                </div>
              )}

              <AtsScore score={score} />

              <ScoreBreakdown breakdown={scoreBreakdown} />

              <ResumePreview text={resumeText} skills={skills} />

              <h5 className="analysis-done" role="status" aria-live="polite">
                ✅ Resume Analysis Complete
              </h5>
              {activeFileName && (
                <p style={{ fontSize: '13px', opacity: 0.7, marginTop: '-8px' }}>
                  📄 {activeFileName}
                </p>
              )}

              {/* Skills container */}
              <div className="mt-4">
                <h4>Skills Found ({skills.length})</h4>
                {skills.length === 0 && <p>No skills detected</p>}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    justifyContent: 'center',
                  }}
                >
                  {(showAllSkills ? skills : skills.slice(0, 15)).map(
                    (skill: string, i: number) => (
                      <span key={i} className="skill-badge">
                        {skill}
                      </span>
                    )
                  )}
                </div>
                {skills.length > 15 && (
                  <button
                    type="button"
                    className="app-btn app-btn--secondary"
                    style={{ marginTop: '16px' }}
                    onClick={() => setShowAllSkills(!showAllSkills)}
                  >
                    {showAllSkills ? 'Show Less ▲' : `Show More (${skills.length - 15} more) ▼`}
                  </button>
                )}
              </div>

              {/* Skill gap matrix */}
              <div
                className="mt-4 p-3"
                style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}
              >
                <h4>🎯 Skill Gap Matrix ({targetRole})</h4>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '12px' }}>
                  <div>
                    <h6 style={{ color: '#22c55e' }}>Matched Skills</h6>
                    {matchedSkills.length === 0 ? (
                      <p style={{ fontSize: '12px' }}>None</p>
                    ) : (
                      matchedSkills.map((s, i) => (
                        <span key={i} className="badge bg-success m-1">
                          {s}
                        </span>
                      ))
                    )}
                  </div>
                  <div>
                    <h6 style={{ color: '#ef4444' }}>Missing Skills</h6>
                    {missingSkills.length === 0 ? (
                      <p style={{ fontSize: '12px' }}>None</p>
                    ) : (
                      missingSkills.map((s, i) => (
                        <span key={i} className="badge bg-danger m-1">
                          {s}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* SUGGESTIONS BOX WITH THE UTILITY BUTTON & ROAST MODE TOGGLE */}
              <div className="suggestion-box mt-4">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h4 style={{ margin: 0 }}>{roastMode ? '🔥 Resume Roast' : '💡 Suggestions'}</h4>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: roastMode ? '#ef4444' : 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={roastMode}
                        onChange={(e) => setRoastMode(e.target.checked)}
                        aria-label="Toggle Resume Roast mode"
                        style={{ cursor: 'pointer' }}
                      />
                      🔥 Roast Mode {roastMode ? 'ON' : 'OFF'}
                    </label>
                  </div>
                  {suggestions.length > 0 && (
                    <button
                      type="button"
                      className={`app-btn app-btn--accent${copied ? ' is-success' : ''}`}
                      onClick={copySuggestionsToClipboard}
                    >
                      {copied ? '✅ Copied!' : '📋 Copy Suggestions'}
                    </button>
                  )}
                </div>

                {suggestions.map((s: string, i: number) => {
                  let displayText = s
                  if (roastMode) {
                    if (s.startsWith('Add projects or experience with ')) {
                      const skill = s.replace('Add projects or experience with ', '')
                      displayText = `Ghosting recruiters because ${skill} is nowhere to be found? Time to build a project with ${skill}!`
                    } else if (s.startsWith('Quantify bullet: ')) {
                      displayText = `Where are the numbers? '${s.replace('Quantify bullet: ', '')}' needs real impact stats, not vague fairy tales!`
                    } else {
                      displayText = `Spill the tea: ${s}`
                    }
                  }
                  return (
                    <div key={i} className="suggestion-item">
                      {roastMode ? '🔥' : '📌'} {displayText}
                      {user && analysisId !== null && (
                        <SuggestionVote
                          suggestion={s}
                          vote={suggestionVotes[s] ?? null}
                          onVote={(vote) => submitSuggestionVote(s, vote)}
                        />
                      )}
                    </div>
                  )
                })}

                {/* Reset Button */}
                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                  <button
                    type="button"
                    className="app-btn app-btn--secondary"
                    onClick={resetAnalysis}
                  >
                    🔄 Start New Analysis
                  </button>
                </div>
              </div>
              
              <InterviewQuestionsPanel questions={interviewQuestions} />
            </>
          )}{' '}
          {/* closes the conditional block */}
        </div>{' '}
        {/* closes .main-card */}
      </div>{' '}
      {/* closes .container */}
      <Footer /> {/* footer should be outside main container */}
    </>
  )
  {
    /* closes the return fragment */
  }
}
{
  /* closes App function */
}

export default App
