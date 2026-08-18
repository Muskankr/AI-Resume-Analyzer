import React, { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useLocation, Link } from 'react-router-dom'
import NotFound from './components/NotFound'
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
import { api } from './api/client'
import { AuthModal } from './AuthModal'
import { SuggestionVote, type VoteValue } from './components/SuggestionVote'
import { Footer } from './Footer'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import AnalysisSkeleton from './components/AnalysisSkeleton/AnalysisSkeleton'
import { InfoTooltip } from './components/InfoTooltip'
import { SkillWordCloud } from './components/SkillWordCloud'
import { TrackMatrix } from './components/TrackMatrix'
import { CoverLetterFeedbackPanel } from './components/CoverLetterFeedbackPanel'
import { InterviewQuestionsPanel } from './components/InterviewQuestionsPanel'
import { JdVisualizerPanel } from './components/JdVisualizerPanel'
import { ResetPasswordConfirmPage } from './components/ResetPasswordConfirmPage'
import { VerifyEmailPage } from './components/VerifyEmailPage'
import type { TrackComparisons } from './components/TrackMatrix'
import {
  FileText,
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Target,
  Info,
  HelpCircle,
  GitCompare,
  X,
} from 'lucide-react'
import { Navbar } from './components/Navbar'
import { TemplateGallery } from './components/TemplateGallery'
import EmptyState from './components/EmptyState'
import { CuratedTips } from './components/CuratedTips'
import { StepProgress } from './components/StepProgress'
import { OnboardingTour } from './components/OnboardingTour'
import { HowItWorks } from './components/HowItWorks'
import { CompareVersions } from './components/CompareVersions/CompareVersions'
import { CompareUploads } from './components/CompareVersions/CompareUploads'
import { SkillChip } from './components/SkillChip'
import {
  requestNotificationPermission,
  sendAnalysisCompleteNotification,
} from './utils/notification'
import { ProgressBar } from './components/ProgressBar/ProgressBar'
import { UndoToast } from './components/UndoToast/UndoToast'
import { FilePreview } from './components/FilePreview/FilePreview'
import { ShareResult } from './components/ShareResult'
import { SharedResultView } from './SharedResultView'
import CookieConsentBanner from './components/CookieConsentBanner'
import AdminDashboard from './components/AdminDashboard'
import { ActionPlanChecklist } from './components/ActionPlanChecklist'
import { ScoreBreakdown, type ScoreBreakdownData } from './components/ScoreBreakdown'
import {
  exportActionPlanMarkdown,
  exportActionPlanPdf,
  generateActionPlan,
} from './utils/actionPlanUtils'

type Theme = 'light' | 'dark'

interface UndoState {
  file: File | null
  score: number | null
  skills: string[]
  suggestions: string[]
  matchedSkills: string[]
  missingSkills: string[]
  resumeText: string
  analysisSource: 'sample' | 'upload' | null
  activeFileName: string
  targetRole: string
  coverLetterText?: string
  coverLetterFeedback?: any
  interviewQuestions?: string[]
}

const DEFAULT_TITLE = 'AI Resume Analyzer'
const READY_TITLE = '✅ Analysis Ready — AI Resume Analyzer'

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
  experience_level?: string
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
    experienceLevel: item.experience_level || 'Mid-Level',
    fileName: item.file_name,
  }))
}

function ResumePreview({ text, skills }: { text: string; skills: string[] }) {
  if (!text) return null
  return (
    <div className="resume-preview mt-4">
      <h4>
        <FileText size={16} /> Resume Text Preview
      </h4>
      <pre className="resume-preview__body">{highlightSkills(text, skills)}</pre>
    </div>
  )
}

interface SuggestionCardProps {
  text: string
  index: number
  backendUrl?: string
  roastMode?: boolean
  vote?: VoteValue | null
  onVote?: (vote: VoteValue | null) => void
  userLoggedIn?: boolean
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  text,
  index,
  backendUrl = '',
  roastMode = false,
  vote = null,
  onVote,
  userLoggedIn = false,
}) => {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  let displayText = text
  if (roastMode) {
    if (text.startsWith('Add projects or experience with ')) {
      const skill = text.replace('Add projects or experience with ', '')
      displayText = `Ghosting recruiters because ${skill} is nowhere to be found? Time to build a project with ${skill}!`
    } else if (text.startsWith('Quantify bullet: ')) {
      displayText = `Where are the numbers? '${text.replace('Quantify bullet: ', '')}' needs real impact stats, not vague fairy tales!`
    } else {
      displayText = `Spill the tea: ${text}`
    }
  }

  return (
    <div className="suggestion-card">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '16px' }}>{roastMode ? '🔥' : '💡'}</span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: roastMode ? '#ef4444' : 'var(--color-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {roastMode ? `Roast #${index + 1}` : `Recommendation #${index + 1}`}
          </span>
        </div>
        <p className="suggestion-text">{displayText}</p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid var(--surface-border)',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        {/* Feedback Widget */}
        {userLoggedIn && onVote && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '0.78rem',
                color: 'var(--muted-text)',
                fontWeight: '500',
              }}
            >
              Was this helpful?
            </span>
            <button
              type="button"
              onClick={() => onVote(vote === 'up' ? null : 'up')}
              title="Helpful"
              aria-label="Vote helpful"
              style={{
                background: vote === 'up' ? 'rgba(74, 222, 128, 0.2)' : 'var(--surface-soft-bg)',
                border: `1px solid ${vote === 'up' ? '#4ade80' : 'var(--surface-border)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
                cursor: 'pointer',
                color: 'var(--body-text)',
                fontSize: '0.85rem',
                transition: 'all 0.2s ease',
              }}
            >
              👍
            </button>
            <button
              type="button"
              onClick={() => onVote(vote === 'down' ? null : 'down')}
              title="Not helpful"
              aria-label="Vote not helpful"
              style={{
                background: vote === 'down' ? 'rgba(248, 113, 113, 0.2)' : 'var(--surface-soft-bg)',
                border: `1px solid ${vote === 'down' ? '#f87171' : 'var(--surface-border)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
                cursor: 'pointer',
                color: 'var(--body-text)',
                fontSize: '0.85rem',
                transition: 'all 0.2s ease',
              }}
            >
              👎
            </button>
          </div>
        )}

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          className="suggestion-copy-btn"
          aria-label="Copy recommendation text"
        >
          {copied ? '✅ Copied' : '📋 Copy Text'}
        </button>
      </div>
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
  const [analysisId, setAnalysisId] = useState<number | null>(null)
  const [suggestionVotes, setSuggestionVotes] = useState<Record<string, VoteValue>>({})

  // Validation States
  const [fileError, setFileError] = useState<string | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)

  const [showShortcutHelp, setShowShortcutHelp] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [showExportDropdown, setShowExportDropdown] = useState(false)

  const [retryAfter, setRetryAfter] = useState<number | null>(null)
  const [retryDisabled, setRetryDisabled] = useState(false)

  const [readabilityLabel, setReadabilityLabel] = useState<string | null>(null)
  const [undoState, setUndoState] = useState<UndoState | null>(null)
  const [showUndoToast, setShowUndoToast] = useState(false)

  // Component States
  const [targetRole, setTargetRole] = useState('Frontend Developer')
  const [experienceLevel, setExperienceLevel] = useState(() => {
    try {
      return localStorage.getItem('selected_experience_level') || 'Mid-Level'
    } catch {
      return 'Mid-Level'
    }
  })
  const [matchedSkills, setMatchedSkills] = useState<string[]>([])
  const [missingSkills, setMissingSkills] = useState<string[]>([])
  const [showAllSkills, setShowAllSkills] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [copied, setCopied] = useState(false)
  const [analysisSource, setAnalysisSource] = useState<'sample' | 'upload' | null>(null)
  const [shareId, setShareId] = useState<string | null>(null)
  const [jobDesc, setJobDesc] = useState('')
  const [resumeText, setResumeText] = useState<string>('')
  const [activeFileName, setActiveFileName] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareUploadsOpen, setCompareUploadsOpen] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState<number>(0)
  const [analysisStageLabel, setAnalysisStageLabel] = useState<string>('')
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file')
  const [trackComparisons, setTrackComparisons] = useState<TrackComparisons | null>(null)
  const [activeTab, setActiveTab] = useState<
    'detailed' | 'matrix' | 'cover_letter' | 'interview_questions'
  >('detailed')
  const [resumeUrl, setResumeUrl] = useState<string>('')
  const [urlError, setUrlError] = useState<string | null>(null)

  // Cover Letter States
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null)
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null)
  const [coverLetterText, setCoverLetterText] = useState<string>('')
  const [coverLetterFeedback, setCoverLetterFeedback] = useState<any>(null)

  // Interview Questions States
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([])

  // Standalone Job Description States
  const [activeFlow, setActiveFlow] = useState<'resume' | 'jd'>('resume')
  const [jdInputText, setJdInputText] = useState('')
  const [jdKeywords, setJdKeywords] = useState<any[]>([])
  const [jdLoading, setJdLoading] = useState(false)
  const [jdError, setJdError] = useState<string | null>(null)

  // Retry state
  const [retryCount, setRetryCount] = useState(0)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  // Auth
  const { user, signup, login, logout, resendVerification, refreshUserStatus } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [resendMessage, setResendMessage] = useState('')

  const handleResendVerification = async () => {
    setResendingEmail(true)
    setResendStatus('idle')
    setResendMessage('')
    try {
      await resendVerification()
      setResendStatus('success')
      setResendMessage('Verification link sent!')
      setTimeout(() => setResendMessage(''), 5000)
    } catch (error: unknown) {
      setResendStatus('error')
      let msg = 'Failed to send verification email.'
      if (axios.isAxiosError(error)) {
        msg = error.response?.data?.error || msg
      }
      setResendMessage(msg)
      setTimeout(() => setResendMessage(''), 5000)
    } finally {
      setResendingEmail(false)
    }
  }

  // History
  const {
    entries,
    unreadCount,
    lastViewedTimestamp,
    markAllAsViewed,
    deleteEntry,
    clearHistory,
    setEntries,
  } = useAnalysisHistory()
  const [historyNextUrl, setHistoryNextUrl] = useState<string | null>(null)
  // Modal that diffs two saved uploads against each other.
  const [showCompare, setShowCompare] = useState(false)

  const fetchDbHistory = useCallback(async () => {
    try {
      const res = await api.get(`/api/history/?page=1&page_size=${HISTORY_PAGE_SIZE}`)
      setEntries(toAnalysisEntries(res.data))
      setHistoryNextUrl(nextPageUrl(res.data))
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 401) {
        console.error('Could not load analysis history', error)
      }
    }
  }, [setEntries])

  const loadMoreDbHistory = useCallback(async () => {
    if (!historyNextUrl || !user) return
    try {
      const res = await api.get(historyNextUrl)
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
    if (user) fetchDbHistory()
  }, [user, fetchDbHistory])

  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining((prev) => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldownRemaining])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // Ignore localStorage access restrictions in private browsing modes
    }
  }, [theme])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        document.title = DEFAULT_TITLE
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const resetAnalysis = useCallback(() => {
    if (score !== null || skills.length > 0) {
      setUndoState({
        file,
        score,
        skills,
        suggestions,
        matchedSkills,
        missingSkills,
        resumeText,
        analysisSource,
        activeFileName,
        targetRole,
        coverLetterText,
        coverLetterFeedback,
        interviewQuestions,
      })
      setShowUndoToast(true)
    }

    setFile(null)
    setScore(null)
    setSkills([])
    setSuggestions([])
    setMatchedSkills([])
    setMissingSkills([])
    setResumeText('')
    setShowAllSkills(false)
    setCopied(false)
    setAnalysisSource(null)
    setShareId(null)
    setActiveFileName('')
    setShowExportDropdown(false)
    setFileError(null)
    setRoleError(null)
    setCoverLetterFile(null)
    setCoverLetterError(null)
    setCoverLetterText('')
    setCoverLetterFeedback(null)
    setInterviewQuestions([])
  }, [
    file,
    score,
    skills,
    suggestions,
    matchedSkills,
    missingSkills,
    resumeText,
    analysisSource,
    activeFileName,
    targetRole,
    coverLetterText,
    coverLetterFeedback,
    interviewQuestions,
  ])

  const handleUndoReset = useCallback(() => {
    if (undoState) {
      setFile(undoState.file)
      setScore(undoState.score)
      setSkills(undoState.skills)
      setSuggestions(undoState.suggestions)
      setMatchedSkills(undoState.matchedSkills)
      setMissingSkills(undoState.missingSkills)
      setResumeText(undoState.resumeText)
      setAnalysisSource(undoState.analysisSource)
      setActiveFileName(undoState.activeFileName)
      setTargetRole(undoState.targetRole)
      setCoverLetterText(undoState.coverLetterText || '')
      setCoverLetterFeedback(undoState.coverLetterFeedback || null)
      setInterviewQuestions(undoState.interviewQuestions || [])
      setUndoState(null)
      setShowUndoToast(false)
    }
  }, [undoState])

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const modifier = event.altKey

      if (modifier && event.key.toLowerCase() === 'u') {
        event.preventDefault()
        document.getElementById('fileUpload')?.click()
      }

      if (modifier && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        resetAnalysis()
      }

      if (event.key === 'Escape') {
        setShowAuthModal(false)
        setHistoryOpen(false)
        setShowShortcutHelp(false)
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [resetAnalysis])

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const getRetryDelay = (attemptNumber: number): number => {
    // Exponential backoff: 2^attemptNumber seconds, capped at 30 seconds
    const delay = Math.pow(2, attemptNumber)
    return Math.min(delay, 30)
  }

  const runAnalysis = async (
    fileToAnalyze: File | null,
    source: 'sample' | 'upload',
    url?: string
  ) => {
    try {
      setLoading(true)
      setAnalysisSource(source)
      setAnalysisProgress(25)
      setAnalysisStageLabel(
        url ? 'Fetching document from URL...' : 'Stage 1/3: Extracting text from document...'
      )

      const formData = new FormData()
      if (fileToAnalyze) {
        formData.append('file', fileToAnalyze)
      }
      if (url) {
        formData.append('url', url)
      }
      formData.append('role', targetRole)
      formData.append('job_description', jobDesc)
      if (coverLetterFile) {
        formData.append('cover_letter', coverLetterFile)
      }

      const stageTimer1 = setTimeout(() => {
        setAnalysisProgress(60)
        setAnalysisStageLabel('Stage 2/3: Detecting & matching skills...')
      }, 500)

      const stageTimer2 = setTimeout(() => {
        setAnalysisProgress(90)
        setAnalysisStageLabel('Stage 3/3: Generating ATS score & recommendations...')
      }, 1000)

      const res = await api.post('/api/upload/', formData)
      const taskId = res.data.task_id

      let result = null
      while (true) {
        const statusRes = await api.get(`/api/status/${taskId}/`)
        if (statusRes.data.state === 'SUCCESS') {
          result = statusRes.data.result
          break
        } else if (statusRes.data.state === 'FAILURE') {
          throw new Error(statusRes.data.error || 'Analysis failed')
        }
        await new Promise((r) => setTimeout(r, 1000))
      }

      clearTimeout(stageTimer1)
      clearTimeout(stageTimer2)

      setAnalysisProgress(100)
      setAnalysisStageLabel('Analysis complete!')

      setScore(result.score)
      setScoreBreakdown(result.score_breakdown || null)
      setSkills(result.skills_found || [])
      setSuggestions(result.suggestions || [])
      setMatchedSkills(result.matched_skills || [])
      setMissingSkills(result.missing_skills || [])
      setResumeText(result.resume_text || '')
      setCoverLetterText(result.cover_letter_text || '')
      setCoverLetterFeedback(result.cover_letter_feedback || null)
      setInterviewQuestions(result.interview_questions || [])

      setReadabilityLabel(result.readability_label ?? null)
      if (result.share_id) setShareId(result.share_id)
      setTrackComparisons(result.track_comparisons || null)
      setActiveTab('detailed')
      const fileName = fileToAnalyze ? fileToAnalyze.name : url ? 'Imported Resume' : 'Resume'
      setActiveFileName(fileName)

      // Change the browser tab title only if the user is on another tab
      if (document.hidden) {
        document.title = READY_TITLE
      }

      setLoading(false)

      // Reset retry state on success
      setRetryCount(0)
      setCooldownRemaining(0)

      if (user) {
        await fetchDbHistory()
      } else {
        addEntry({
          score: result.score,
          skills: result.skills_found || [],
          suggestions: result.suggestions || [],
          matchedSkills: result.matched_skills || [],
          missingSkills: result.missing_skills || [],
          targetRole: targetRole,
          fileName: fileName,
          coverLetterText: result.cover_letter_text,
          coverLetterFeedback: result.cover_letter_feedback,
          interviewQuestions: result.interview_questions,
        })
      }

      // Send native browser notification if tab is hidden / unfocused
      sendAnalysisCompleteNotification(fileName)
    } catch (error: unknown) {
      console.error(error)
      let errorMsg = 'Unknown error'
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          const retryHeader = error.response.headers['retry-after']

          const retrySeconds = Number(retryHeader) || Number(error.response.data?.retry_after) || 30

          setRetryAfter(retrySeconds)
          setRetryDisabled(true)

          let remaining = retrySeconds

          const timer = setInterval(() => {
            remaining--

            setRetryAfter(remaining)

            if (remaining <= 0) {
              clearInterval(timer)
              setRetryDisabled(false)
              setRetryAfter(null)
            }
          }, 1000)

          errorMsg = `Too many requests. Please wait ${retrySeconds}s before trying again.`
        } else {
          errorMsg = error.response?.data?.error ?? error.message
        }
      } else if (error instanceof Error) {
        errorMsg = error.message
      }

      if (!(axios.isAxiosError(error) && error.response?.status === 429)) {
        if (
          axios.isAxiosError(error) &&
          error.response?.status === 400 &&
          uploadMode === 'url' &&
          source === 'upload'
        ) {
          setUrlError(errorMsg)
        } else {
          alert(
            source === 'sample'
              ? `Sample analysis failed: ${errorMsg}`
              : `Upload failed: ${errorMsg}`
          )
        }
        // Increment retry count and set cooldown backoff
        const newRetryCount = retryCount + 1
        setRetryCount(newRetryCount)
        setCooldownRemaining(getRetryDelay(newRetryCount))
      }

      setLoading(false)
    }
  }

  const runJdAnalysis = async () => {
    if (!jdInputText || !jdInputText.trim()) {
      setJdError('Job description cannot be empty.')
      return
    }
    setJdLoading(true)
    setJdError(null)
    setJdKeywords([])
    try {
      const res = await axios.post(`${backendUrl}/api/analyze-jd/`, {
        job_description: jdInputText,
      })
      setJdKeywords(res.data.keywords || [])
    } catch (err: any) {
      console.error(err)
      setJdError(err.response?.data?.error || 'Failed to analyze job description.')
    } finally {
      setJdLoading(false)
    }
  }

  const uploadResume = async () => {
    if (cooldownRemaining > 0) {
      return // Prevent retry during cooldown
    }

    let hasError = false

    if (!targetRole || targetRole.trim() === '') {
      setRoleError('Target career track is required.')
      hasError = true
    } else {
      setRoleError(null)
    }

    if (uploadMode === 'file') {
      if (!file) {
        setFileError('Please upload a resume file before analyzing.')
        hasError = true
      } else {
        setFileError(null)
      }
    } else {
      if (!resumeUrl || resumeUrl.trim() === '') {
        setUrlError('Please enter a shareable link (Google Drive, Dropbox, or PDF URL).')
        hasError = true
      } else if (
        !resumeUrl.trim().startsWith('http://') &&
        !resumeUrl.trim().startsWith('https://')
      ) {
        setUrlError('URL must start with http:// or https://')
        hasError = true
      } else {
        try {
          new URL(resumeUrl.trim())
          setUrlError(null)
        } catch {
          setUrlError('Please enter a valid URL.')
          hasError = true
        }
      }
    }

    if (hasError) return

    await requestNotificationPermission()
    if (uploadMode === 'file') {
      await runAnalysis(file!, 'upload')
    } else {
      await runAnalysis(null, 'upload', resumeUrl.trim())
    }
  }

  const handleSampleResume = async () => {
    if (cooldownRemaining > 0) {
      return // Prevent retry during cooldown
    }

    try {
      await requestNotificationPermission()
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

      const payload = { analysis_id: analysisId, suggestion_text: suggestion }

      try {
        if (vote === null) {
          await api.delete('/api/suggestion-feedback/', { data: payload })
        } else {
          await api.post('/api/suggestion-feedback/', { ...payload, vote })
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
    [analysisId, suggestionVotes, user]
  )

  // Restore votes already cast against this analysis, so returning to it does
  // not reset every control to neutral.
  useEffect(() => {
    if (!user || analysisId === null) return

    let cancelled = false
    api
      .get(`/api/suggestion-feedback/?analysis_id=${analysisId}`)
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
  }, [analysisId, user])

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

  const getExportTimestamp = () => {
    const pad = (n: number) => n.toString().padStart(2, '0')
    const d = new Date()
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(
      d.getMinutes()
    )}-${pad(d.getSeconds())}`
  }

  const exportJSON = () => {
    const data = { score, skills, suggestions }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resume-analysis-${getExportTimestamp()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportDropdown(false)
  }

  const exportCSV = () => {
    const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`
    const header = 'score,skills,suggestions\n'
    const row = `${score},${escapeCSV(skills.join(','))},${escapeCSV(suggestions.join(','))}\n`
    const blob = new Blob([header + row], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resume-analysis-${getExportTimestamp()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportDropdown(false)
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
    if (entry.experienceLevel) {
      setExperienceLevel(entry.experienceLevel)
    }
    // History entries carry a client-side id, not the analysis id, so there is
    // nothing safe to attach a vote to when one is replayed.
    setAnalysisId(null)
    setSuggestionVotes({})
    setActiveFileName(entry.fileName)
    setCoverLetterText(entry.coverLetterText || '')
    setCoverLetterFeedback(entry.coverLetterFeedback || null)
    setInterviewQuestions(entry.interviewQuestions || [])
    setShowAllSkills(false)
    setCopied(false)
    setHistoryOpen(false)
    setShowExportDropdown(false)
  }

  const handleLogout = () => {
    logout()
    clearHistory()
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
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <OnboardingTour />

      <HistorySidebar
        entries={entries}
        unreadCount={unreadCount}
        lastViewedTimestamp={lastViewedTimestamp}
        onMarkAllAsViewed={markAllAsViewed}
        activeFileName={activeFileName}
        onSelect={selectHistoryEntry}
        onDelete={handleDeleteEntry}
        onClear={handleClearAll}
        isOpen={historyOpen}
        onToggle={() => setHistoryOpen((v) => !v)}
        onCompare={() => setCompareOpen(true)}
        hasMoreOnServer={historyNextUrl !== null}
        onLoadMoreFromServer={loadMoreDbHistory}
      />

      {compareOpen && (
        <CompareVersions
          entries={entries}
          token={user?.token}
          onClose={() => setCompareOpen(false)}
        />
      )}

      {compareUploadsOpen && (
        <CompareUploads
          targetRole={targetRole}
          jobDesc={jobDesc}
          onClose={() => setCompareUploadsOpen(false)}
        />
      )}

      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        onLogin={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onHistoryClick={() => setHistoryOpen(true)}
      />
      {user && !user.is_verified && (
        <div
          className="verification-warning-banner"
          style={{
            background: '#fffbeb',
            borderBottom: '1px solid #fde68a',
            color: '#78350f',
            padding: '12px 24px',
            textAlign: 'center',
            fontSize: '0.92rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            zIndex: 99,
            position: 'relative',
          }}
        >
          <span>✉️ Please verify your email address to unlock full account access.</span>
          <button
            onClick={handleResendVerification}
            disabled={resendingEmail}
            className="app-btn app-btn--secondary"
            style={{
              padding: '6px 14px',
              fontSize: '0.82rem',
              borderRadius: 'var(--radius-md, 6px)',
              cursor: 'pointer',
              background: 'rgba(217, 119, 6, 0.1)',
              border: '1px solid #d97706',
              color: '#78350f',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            {resendingEmail ? (
              <>
                <Loader2 size={13} className="spin" /> Resending...
              </>
            ) : (
              'Resend Verification Link'
            )}
          </button>
          {resendMessage && (
            <span
              style={{
                fontSize: '0.85rem',
                background:
                  resendStatus === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${resendStatus === 'success' ? '#10b981' : '#ef4444'}`,
                color: resendStatus === 'success' ? '#065f46' : '#991b1b',
                padding: '4px 10px',
                borderRadius: '4px',
                marginLeft: '8px',
              }}
            >
              {resendStatus === 'success' ? '✓' : '✗'} {resendMessage}
            </span>
          )}
        </div>
      )}
      <Routes>
        <Route path="/admin" element={<AdminDashboard user={user} />} />
        <Route path="/shared/:shareId" element={<SharedResultView />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPasswordConfirmPage />} />
        <Route
          path="/verify-email/:token"
          element={<VerifyEmailPage onVerificationSuccess={refreshUserStatus} />}
        />
        <Route
          path="/"
          element={
            <main id="main-content" className="landing-page">
              {showAuthModal && (
                <AuthModal
                  onSignup={signup}
                  onLogin={login}
                  onClose={() => setShowAuthModal(false)}
                />
              )}
              {analysisSource === 'sample' && (
                <div className="sample-notice-banner mb-4">
                  <span>ℹ️ Viewing Sample Resume Analysis</span>
                  <span style={{ fontWeight: 'normal', fontSize: '13px' }}>
                    — This analysis is based on a bundled sample resume.
                  </span>
                </div>
              )}

              <div className={score === null && !loading ? 'hero-container' : ''}>
                <div className={score === null && !loading ? 'hero-left' : ''}>
                  {score === null && !loading && (
                    <section className="hero-intro" aria-label="Introduction">
                      <span className="hero-badge">⭐ AI Powered Resume Optimization</span>

                      <h1
                        className="app-main-title"
                        style={{
                          fontSize: 'clamp(2.8rem, 6vw, 4.8rem)',
                          lineHeight: '1.1',
                          fontWeight: 800,
                          marginTop: '18px',
                          marginBottom: '24px',
                        }}
                      >
                        Beat ATS Filters.
                        <br />
                        Land More Interviews.
                      </h1>

                      <div
                        style={{
                          display: 'flex',
                          gap: '12px',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                        className="mb-3"
                      >
                        <button className="analyze-btn" onClick={uploadResume} disabled={loading}>
                          {loading && analysisSource === 'upload'
                            ? '⏳ Extracting and analyzing resume text...'
                            : '🚀 Analyze Resume'}
                        </button>
                        <button
                          className="app-btn"
                          onClick={() => setShowGallery(true)}
                          title="Browse ATS-friendly resume templates"
                        >
                          📂 Template Gallery
                        </button>
                        <button
                          className="app-btn app-btn--secondary"
                          onClick={() => setCompareUploadsOpen(true)}
                        >
                          <GitCompare size={15} /> Compare 2 Resumes
                        </button>
                        <button
                          className="app-btn app-btn--secondary"
                          onClick={handleSampleResume}
                          disabled={loading}
                        >
                          {' '}
                          {loading && analysisSource === 'sample'
                            ? '⏳ Loading Sample...'
                            : 'Try Sample Resume'}
                        </button>
                      </div>
                      {showGallery && (
                        <div
                          className="mt-4"
                          style={{
                            textAlign: 'left',
                            background: 'var(--card-bg, #fff)',
                            padding: '20px',
                            borderRadius: '8px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '16px',
                            }}
                          >
                            <h3 style={{ margin: 0 }}>ATS Resume Templates</h3>
                            <button
                              onClick={() => setShowGallery(false)}
                              style={{
                                cursor: 'pointer',
                                background: 'transparent',
                                border: 'none',
                                fontSize: '16px',
                              }}
                            >
                              ❌
                            </button>
                          </div>
                          <TemplateGallery />
                        </div>
                      )}
                      <p
                        className="hero-description"
                        style={{
                          maxWidth: '760px',
                          margin: '0 auto 30px',
                          fontSize: '1.15rem',
                          textAlign: 'center',
                        }}
                      >
                        Analyze your resume with AI, discover missing skills, improve ATS
                        compatibility and receive personalized recommendations in seconds.
                      </p>

                      <div
                        className="hero-stats"
                        style={{ color: theme === 'light' ? '#000000' : '#ffffff' }}
                      >
                        <div>
                          <h2>50K+</h2>
                          <span>Resumes Reviewed</span>
                        </div>

                        <div>
                          <h2>95%</h2>
                          <span>ATS Accuracy</span>
                        </div>

                        <div>
                          <h2>24/7</h2>
                          <span>AI Available</span>
                        </div>
                      </div>
                    </section>
                  )}

                  {(loading || score !== null) && <StepProgress currentStep={currentStep} />}

                  <section
                    className="analyzer-form-section"
                    aria-label="Resume Analyzer Form"
                    style={{ position: 'relative' }}
                  >
                    {user && !user.is_verified ? (
                      <div
                        className="unverified-form-overlay"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'rgba(15, 23, 42, 0.75)',
                          backdropFilter: 'blur(8px)',
                          borderRadius: 'var(--radius-lg)',
                          zIndex: 10,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '32px',
                          textAlign: 'center',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div
                          style={{
                            background: 'rgba(217, 119, 6, 0.1)',
                            border: '1px solid rgba(217, 119, 6, 0.3)',
                            borderRadius: '50%',
                            padding: '16px',
                            marginBottom: '20px',
                            display: 'inline-flex',
                            color: '#d97706',
                          }}
                        >
                          <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </div>
                        <h4
                          style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            marginBottom: '8px',
                            color: '#fff',
                          }}
                        >
                          Verification Required
                        </h4>
                        <p
                          style={{
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: '0.92rem',
                            maxWidth: '340px',
                            lineHeight: '1.4',
                          }}
                        >
                          Please verify your email address to upload resumes and unlock ATS
                          analyses.
                        </p>
                      </div>
                    ) : null}

                    {/* Active Flow Switcher Tabs */}
                    {score === null && !loading && (
                      <div
                        style={{
                          display: 'flex',
                          gap: '12px',
                          justifyContent: 'center',
                          marginBottom: '24px',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                          paddingBottom: '12px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFlow('resume')
                            setJdKeywords([])
                          }}
                          style={{
                            padding: '8px 20px',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            background:
                              activeFlow === 'resume'
                                ? 'var(--color-primary, #6366f1)'
                                : 'rgba(255, 255, 255, 0.05)',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          📄 Optimize Resume
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFlow('jd')
                          }}
                          style={{
                            padding: '8px 20px',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            background:
                              activeFlow === 'jd'
                                ? 'var(--color-primary, #6366f1)'
                                : 'rgba(255, 255, 255, 0.05)',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          💼 Analyze Job Description
                        </button>
                      </div>
                    )}

                    {activeFlow === 'jd' && jdKeywords.length > 0 ? (
                      <JdVisualizerPanel
                        keywords={jdKeywords}
                        onBack={() => {
                          setJdKeywords([])
                          setJdInputText('')
                        }}
                      />
                    ) : activeFlow === 'jd' ? (
                      <div className="animate-fade-in">
                        <div
                          className="mb-4 p-4"
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid rgba(255,255,255,0.04)',
                            textAlign: 'left',
                          }}
                        >
                          <label
                            htmlFor="jdTextInput"
                            style={{
                              color: theme === 'light' ? '#000000' : '#ffffff',
                              display: 'block',
                              marginBottom: '12px',
                              fontWeight: '600',
                              fontSize: 'var(--font-size-sm)',
                            }}
                          >
                            📝 Paste the Job Description to extract and visualize key terms:
                          </label>
                          <textarea
                            id="jdTextInput"
                            rows={8}
                            value={jdInputText}
                            onChange={(e) => {
                              setJdInputText(e.target.value)
                              if (e.target.value.trim() !== '') setJdError(null)
                            }}
                            placeholder="Paste job description here..."
                            style={{
                              width: '100%',
                              padding: '12px',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              background: 'rgba(0,0,0,0.2)',
                              color: '#fff',
                              outline: 'none',
                              fontSize: '0.92rem',
                              lineHeight: '1.5',
                              resize: 'vertical',
                            }}
                          />
                          {jdError && (
                            <div
                              style={{
                                color: '#ef4444',
                                fontSize: '13px',
                                marginTop: '8px',
                                fontWeight: '500',
                              }}
                            >
                              ⚠️ {jdError}
                            </div>
                          )}
                          <div
                            style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}
                          >
                            <button
                              type="button"
                              className="analyze-btn"
                              onClick={runJdAnalysis}
                              disabled={jdLoading}
                              style={{ width: 'auto', minWidth: '200px' }}
                            >
                              {jdLoading ? '⏳ Analyzing Keywords...' : '🔍 Analyze JD Keywords'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className="mb-4 p-4 role-selector-container"
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid rgba(255,255,255,0.04)',
                          }}
                        >
                          <label
                            htmlFor="roleSelect"
                            style={{
                              color: theme === 'light' ? '#000000' : '#ffffff',
                              display: 'block',
                              marginBottom: '12px',
                              fontWeight: '600',
                              textAlign: 'center',
                              fontSize: 'var(--font-size-sm)',
                            }}
                          >
                            🎯 Target Career Track
                          </label>
                          <div className="custom-select-container">
                            <select
                              id="roleSelect"
                              value={targetRole}
                              onChange={(e) => {
                                setTargetRole(e.target.value)
                                if (e.target.value.trim() !== '') setRoleError(null)
                              }}
                              className="custom-select-element"
                            >
                              <option value="Frontend Developer">Frontend Developer</option>
                              <option value="Backend Developer">Backend Developer</option>
                              <option value="Data Analyst">Data Analyst</option>
                            </select>
                          </div>
                          {roleError && (
                            <div
                              style={{
                                color: '#ef4444',
                                fontSize: '13px',
                                marginTop: '8px',
                                fontWeight: '500',
                                textAlign: 'center',
                              }}
                            >
                              ⚠️ {roleError}
                            </div>
                          )}
                        </div>

                        {/* STEP 2: Upload File / Link & Job Description */}
                        <div className="mb-5">
                          {/* Mode Switcher Tabs */}
                          <div
                            style={{
                              display: 'flex',
                              gap: '8px',
                              justifyContent: 'center',
                              marginBottom: '16px',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setUploadMode('file')
                                setUrlError(null)
                              }}
                              style={{
                                padding: '8px 16px',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                background:
                                  uploadMode === 'file' ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
                                color: '#fff',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              📄 Local File Upload
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadMode('url')
                                setFileError(null)
                              }}
                              style={{
                                padding: '8px 16px',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                background:
                                  uploadMode === 'file' ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
                                color: '#fff',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              🔗 Import via Link
                            </button>
                          </div>

                          {uploadMode === 'file' ? (
                            <div
                              className={`upload-box mb-3 ${isDragging ? 'dragging' : ''}`}
                              style={{ width: '100%', maxWidth: '100%' }}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleDrop}
                            >
                              <input
                                type="file"
                                id="fileUpload"
                                hidden
                                accept=".pdf,.docx"
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                  if (e.target.files && e.target.files[0]) {
                                    const selectedFile = e.target.files[0]
                                    const validTypes = ['.pdf', '.docx']
                                    const isValid = validTypes.some((ext) =>
                                      selectedFile.name.toLowerCase().endsWith(ext)
                                    )

                                    if (isValid) {
                                      setFile(selectedFile)
                                      setFileError(null)
                                    } else {
                                      setFileError('Only PDF and DOCX files are supported.')
                                    }
                                  }
                                }}
                              />
                              <label htmlFor="fileUpload" className="upload-label">
                                <div className="upload-icon-wrapper" aria-hidden="true">
                                  {file ? (
                                    <svg
                                      width="28"
                                      height="28"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                      <polyline points="14 2 14 8 20 8" />
                                      <path d="M9 15l2 2 4-4" />
                                    </svg>
                                  ) : (
                                    <svg
                                      width="28"
                                      height="28"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                      <polyline points="17 8 12 3 7 8" />
                                      <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                  )}
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  {file ? (
                                    <strong className="upload-file-name">{file.name}</strong>
                                  ) : (
                                    <>
                                      <span className="upload-text-primary">
                                        Drag &amp; Drop Resume or{' '}
                                        <span className="upload-text-browse">Click to Browse</span>
                                      </span>
                                      <span className="upload-text-secondary">
                                        Supports PDF, DOCX, TXT up to 10MB
                                      </span>
                                    </>
                                  )}
                                </div>
                              </label>
                            </div>
                          ) : (
                            <div className="mb-3" style={{ textAlign: 'left' }}>
                              <label
                                htmlFor="resumeUrlInput"
                                style={{
                                  fontWeight: '600',
                                  display: 'block',
                                  marginBottom: '8px',
                                  color: '#e2e8f0',
                                  fontSize: '0.85rem',
                                }}
                              >
                                Paste Shareable Link (Google Drive / Dropbox / Direct PDF)
                              </label>
                              <input
                                type="url"
                                id="resumeUrlInput"
                                value={resumeUrl}
                                onChange={(e) => {
                                  setResumeUrl(e.target.value)
                                  if (e.target.value.trim() !== '') setUrlError(null)
                                }}
                                placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                                style={{
                                  width: '100%',
                                  padding: '12px 16px',
                                  borderRadius: 'var(--radius-md)',
                                  background: 'rgba(255, 255, 255, 0.04)',
                                  color: '#fff',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  fontSize: '0.9rem',
                                }}
                              />
                              <span
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'rgba(255,255,255,0.6)',
                                  marginTop: '6px',
                                  display: 'block',
                                }}
                              >
                                ℹ️ Note: Make sure link permissions are set to "Anyone with the link
                                can view".
                              </span>
                            </div>
                          )}
                          {file && uploadMode === 'file' && (
                            <div className="mb-3">
                              <FilePreview file={file} />
                            </div>
                          )}
                          {fileError && uploadMode === 'file' && (
                            <div
                              style={{
                                color: '#ef4444',
                                fontSize: '13px',
                                marginTop: '-4px',
                                marginBottom: '16px',
                                fontWeight: '500',
                                textAlign: 'center',
                              }}
                            >
                              ⚠️ {fileError}
                            </div>
                          )}

                          {urlError && uploadMode === 'url' && (
                            <div
                              style={{
                                color: '#ef4444',
                                fontSize: '13px',
                                marginTop: '8px',
                                fontWeight: '500',
                                textAlign: 'center',
                              }}
                            >
                              ⚠️ {urlError}
                            </div>
                          )}

                          {/* Optional Cover Letter Upload Slot */}
                          <div className="mb-4" style={{ textAlign: 'left' }}>
                            <label
                              htmlFor="coverLetterUpload"
                              style={{
                                fontWeight: '600',
                                display: 'block',
                                marginBottom: '8px',
                                color: '#e2e8f0',
                                fontSize: '0.85rem',
                              }}
                            >
                              ✉️ Cover Letter (Optional)
                            </label>
                            <div
                              className="cover-letter-upload-container"
                              style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px dashed rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-md)',
                                padding: '12px 16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                transition: 'all 0.2s',
                              }}
                            >
                              <input
                                type="file"
                                id="coverLetterUpload"
                                hidden
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                  if (e.target.files && e.target.files[0]) {
                                    const clFile = e.target.files[0]
                                    const validTypes = ['.pdf', '.docx', '.txt']
                                    const isValid = validTypes.some((ext) =>
                                      clFile.name.toLowerCase().endsWith(ext)
                                    )
                                    if (isValid) {
                                      setCoverLetterFile(clFile)
                                      setCoverLetterError(null)
                                    } else {
                                      setCoverLetterError(
                                        'Only PDF, DOCX, and TXT files are supported.'
                                      )
                                    }
                                  }
                                }}
                              />
                              <label
                                htmlFor="coverLetterUpload"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  cursor: 'pointer',
                                  flex: 1,
                                  margin: 0,
                                }}
                              >
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ opacity: 0.7 }}
                                >
                                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                  <polyline points="22,6 12,13 2,6" />
                                </svg>
                                <span
                                  style={{
                                    fontSize: '0.85rem',
                                    color: 'rgba(255,255,255,0.7)',
                                    userSelect: 'none',
                                  }}
                                >
                                  {coverLetterFile
                                    ? coverLetterFile.name
                                    : 'Upload optional Cover Letter (PDF, DOCX, TXT)'}
                                </span>
                              </label>
                              {coverLetterFile && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                    setCoverLetterFile(null)
                                  }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'inline-flex',
                                  }}
                                >
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            {coverLetterError && (
                              <div
                                style={{
                                  color: '#ef4444',
                                  fontSize: '13px',
                                  marginTop: '6px',
                                  fontWeight: '500',
                                }}
                              >
                                ⚠️ {coverLetterError}
                              </div>
                            )}
                          </div>

                          {/* Optional Job Description */}
                          <div className="mb-4" style={{ textAlign: 'left' }}>
                            <label
                              htmlFor="jobDescription"
                              style={{
                                color: 'var(--text-primary)',
                                fontWeight: '600',
                                display: 'block',
                                marginBottom: '8px',
                              }}
                            >
                              Job Description (Optional)
                            </label>
                            <textarea
                              id="jobDescription"
                              className="custom-textarea"
                              value={jobDesc}
                              onChange={(e) => setJobDesc(e.target.value)}
                              placeholder="Paste the job description here..."
                              style={{
                                width: '100%',
                                minHeight: '100px',
                                padding: '12px',
                                borderRadius: 'var(--radius-md)',
                                background: 'rgba(255, 255, 255, 0.02)',
                                color: 'inherit',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                              }}
                            />
                            <div
                              style={{
                                textAlign: 'right',
                                color: isOver ? '#ef4444' : isClose ? '#f97316' : 'inherit',
                                opacity: isOver || isClose ? 1 : 0.7,
                                fontSize: '0.85rem',
                                marginTop: '5px',
                                fontWeight: isOver ? 'bold' : 'normal',
                              }}
                            >
                              {jobDesc.length} / {MAX_CHARS} characters
                            </div>
                          </div>

                          {/* STEP 3: Action Buttons */}
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '12px',
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                            className="action-buttons"
                          >
                            <button
                              className="analyze-btn"
                              onClick={uploadResume}
                              disabled={loading || retryDisabled}
                              style={{ minHeight: '44px', flex: '1 1 200px', maxWidth: '100%' }}
                            >
                              {loading && analysisSource === 'upload'
                                ? '⏳ Extracting...'
                                : '🚀 Analyze Resume'}
                            </button>

                            <button
                              className="secondary-btn"
                              onClick={handleSampleResume}
                              disabled={loading || retryDisabled}
                              type="button"
                              style={{ minHeight: '44px', flex: '1 1 200px', maxWidth: '100%' }}
                            >
                              {loading && analysisSource === 'sample' ? (
                                <>
                                  <Loader2 size={15} className="spin" /> Loading...
                                </>
                              ) : (
                                'Try Sample Resume'
                              )}
                            </button>
                          </div>
                          {retryDisabled && retryAfter !== null && (
                            <p
                              style={{
                                color: '#ef4444',
                                marginTop: '10px',
                                fontWeight: 600,
                                textAlign: 'center',
                              }}
                            >
                              Too many requests. Please wait {retryAfter}s before trying again.
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </section>
                </div>
              </div>

              {/* Loading Skeleton & Determinate Progress Bar */}
              {loading && (
                <section className="my-4" aria-live="polite" aria-label="Analysis Progress">
                  <ProgressBar progress={analysisProgress} stageLabel={analysisStageLabel} />
                  <AnalysisSkeleton />
                </section>
              )}

              {/* Empty State / How It Works */}
              {score === null && !loading && (
                <section style={{ paddingBottom: '2rem' }} aria-label="About the Resume Analyzer">
                  <EmptyState />
                  <div className="mt-4">
                    <HowItWorks />
                  </div>
                </section>
              )}

              {/* Results Display Panel */}
              {score !== null && !loading && (
                <section aria-label="Analysis Results">
                  {analysisSource === 'sample' && (
                    <div
                      className="sample-notice-banner mb-4"
                      style={{ padding: '10px', wordBreak: 'break-word' }}
                    >
                      <span>
                        <Info size={15} /> Viewing Sample Resume Analysis
                      </span>
                      <span style={{ fontWeight: 'normal', fontSize: '13px', display: 'block' }}>
                        — This analysis is based on a bundled sample resume.
                      </span>
                    </div>
                  )}

                  <div id="ats-score">
                    <AtsScore
                      score={score}

                      readabilityLabel={readabilityLabel}
                    />
                  </div>

                  <ResumePreview text={resumeText} skills={skills} />

                  <h5 className="analysis-done mt-3">
                    <CheckCircle size={18} /> Resume Analysis Complete
                  </h5>
                  {activeFileName && (
                    <p
                      style={{
                        fontSize: '13px',
                        opacity: 0.7,
                        marginTop: '-8px',
                        wordBreak: 'break-all',
                      }}
                    >
                      <FileText size={13} /> {activeFileName}
                    </p>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: '16px',
                      marginBottom: '16px',
                      justifyContent: 'center',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveTab('detailed')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        background:
                          activeTab === 'detailed'
                            ? 'var(--color-primary, #6366f1)'
                            : 'rgba(255, 255, 255, 0.05)',
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Detailed View
                    </button>
                    {trackComparisons && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('matrix')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          background:
                            activeTab === 'matrix'
                              ? 'var(--color-primary, #6366f1)'
                              : 'rgba(255, 255, 255, 0.05)',
                          color: '#fff',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        Compare All Tracks
                      </button>
                    )}
                    {coverLetterFeedback && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('cover_letter')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          background:
                            activeTab === 'cover_letter'
                              ? 'var(--color-primary, #6366f1)'
                              : 'rgba(255, 255, 255, 0.05)',
                          color: '#fff',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        ✉️ Cover Letter
                      </button>
                    )}
                    {interviewQuestions && interviewQuestions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('interview_questions')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          background:
                            activeTab === 'interview_questions'
                              ? 'var(--color-primary, #6366f1)'
                              : 'rgba(255, 255, 255, 0.05)',
                          color: '#fff',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        💬 Interview Prep
                      </button>
                    )}
                  </div>

                  {activeTab === 'matrix' && trackComparisons ? (
                    <TrackMatrix
                      trackComparisons={trackComparisons}
                      activeRole={targetRole}
                      onRowClick={(role) => {
                        setTargetRole(role)
                        const comp = trackComparisons[role]
                        setScore(comp.score)
                        setMatchedSkills(comp.matched_skills)
                        setMissingSkills(comp.missing_skills)
                        setSuggestions(comp.suggestions)
                        setActiveTab('detailed')
                      }}
                    />
                  ) : activeTab === 'cover_letter' && coverLetterFeedback ? (
                    <CoverLetterFeedbackPanel feedback={coverLetterFeedback} />
                  ) : activeTab === 'interview_questions' &&
                    interviewQuestions &&
                    interviewQuestions.length > 0 ? (
                    <InterviewQuestionsPanel questions={interviewQuestions} />
                  ) : (
                    <>
                      <ScoreBreakdown breakdown={scoreBreakdown} />
                      {/* Skills Section */}
                      <section className="mt-4" aria-labelledby="skills-found-heading">
                        <h4 id="skills-found-heading">Skills Found ({skills.length})</h4>
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
                              <SkillChip key={i} skill={skill} type="detected" />
                            )
                          )}
                        </div>
                        {skills.length > 15 && (
                          <button
                            type="button"
                            className="app-btn app-btn--secondary"
                            style={{ marginTop: '16px', minHeight: '44px' }}
                            onClick={() => setShowAllSkills(!showAllSkills)}
                          >
                            {showAllSkills ? (
                              <>
                                <ChevronUp size={15} /> Show Less
                              </>
                            ) : (
                              <>
                                <ChevronDown size={15} /> Show More ({skills.length - 15} more)
                              </>
                            )}
                          </button>
                        )}
                      </section>

                      {/* Word Cloud */}
                      <SkillWordCloud skills={skills} />

                      {/* Skill Gap Matrix */}
                      <section
                        className="mt-4 p-3"
                        style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}
                        aria-labelledby="skill-gap-heading"
                      >
                        <h4
                          id="skill-gap-heading"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                            textAlign: 'center',
                            gap: '6px',
                          }}
                        >
                          <Target size={18} /> Skill Gap Matrix ({targetRole})
                          <InfoTooltip content="Shows which required skills are already in your resume and which important skills are missing." />
                        </h4>
                        <div
                          className="skill-gap-layout"
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '20px',
                            justifyContent: 'space-around',
                            marginTop: '12px',
                          }}
                        >
                          <div style={{ flex: '1 1 140px', minWidth: '140px' }}>
                            <h6 style={{ color: '#22c55e' }}>Matched Skills</h6>
                            {matchedSkills.length === 0 ? (
                              <p style={{ fontSize: '12px' }}>None</p>
                            ) : (
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '4px',
                                  justifyContent: 'center',
                                }}
                              >
                                {matchedSkills.map((s, i) => (
                                  <SkillChip
                                    key={i}
                                    skill={s}
                                    type="matched"
                                    targetRole={targetRole}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </section>

                      {/* Upgraded Suggestions Section */}
                      <section
                        className="mt-5 p-4"
                        style={{
                          background: 'rgba(30, 30, 47, 0.4)',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                        }}
                      >
                        {shareId && <ShareResult shareId={shareId} />}

                        <div className="suggestion-box mt-4" style={{ padding: '15px' }}>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '10px',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '12px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <h4 id="suggestions-heading" style={{ margin: 0 }}>
                                {roastMode ? '🔥 Resume Roast' : '💡 Suggestions'}
                              </h4>
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
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                              {suggestions.length > 0 && (
                                <button
                                  type="button"
                                  className={`app-btn app-btn--accent${copied ? ' is-success' : ''}`}
                                  onClick={copySuggestionsToClipboard}
                                  style={{
                                    minHeight: '44px',
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                  }}
                                >
                                  {copied ? '✅ Copied!' : '📋 Copy All'}
                                </button>
                              )}

                              <div style={{ position: 'relative', display: 'inline-block' }}>
                                <button
                                  type="button"
                                  className="app-btn app-btn--secondary"
                                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                                  style={{ minHeight: '44px' }}
                                >
                                  Export ▼
                                </button>
                                {showExportDropdown && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: '100%',
                                      right: 0,
                                      marginTop: '4px',
                                      backgroundColor: 'var(--card-bg)',
                                      border: '1px solid var(--surface-border)',
                                      borderRadius: '6px',
                                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                      zIndex: 10,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      minWidth: '120px',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={exportJSON}
                                      style={{
                                        padding: '8px 12px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--body-text)',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid var(--surface-border)',
                                      }}
                                    >
                                      Export JSON
                                    </button>
                                    <button
                                      type="button"
                                      onClick={exportCSV}
                                      style={{
                                        padding: '8px 12px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--body-text)',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid var(--surface-border)',
                                      }}
                                    >
                                      Export CSV
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const plan = generateActionPlan({
                                          score: score || 0,
                                          targetRole,
                                          suggestions,
                                          missingSkills,
                                          readabilityLabel,
                                          coverLetterFeedback,
                                          fileName: activeFileName,
                                        })
                                        exportActionPlanMarkdown(plan)
                                        setShowExportDropdown(false)
                                      }}
                                      style={{
                                        padding: '8px 12px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--body-text)',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid var(--surface-border)',
                                      }}
                                    >
                                      Action Plan (.md)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const plan = generateActionPlan({
                                          score: score || 0,
                                          targetRole,
                                          suggestions,
                                          missingSkills,
                                          readabilityLabel,
                                          coverLetterFeedback,
                                          fileName: activeFileName,
                                        })
                                        exportActionPlanPdf(plan)
                                        setShowExportDropdown(false)
                                      }}
                                      style={{
                                        padding: '8px 12px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--body-text)',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Action Plan (.pdf)
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <ActionPlanChecklist
                            score={score || 0}
                            targetRole={targetRole}
                            suggestions={suggestions}
                            missingSkills={missingSkills}
                            readabilityLabel={readabilityLabel}
                            coverLetterFeedback={coverLetterFeedback}
                            fileName={activeFileName}
                          />

                          {suggestions.length === 0 ? (
                            <p
                              style={{
                                color: '#64748b',
                                fontStyle: 'italic',
                                fontSize: 'var(--font-size-sm)',
                                textAlign: 'left',
                                margin: '16px 0 0 0',
                              }}
                            >
                              No actionable layout suggestions generated for the current profile
                              structure matrix.
                            </p>
                          ) : (
                            <div className="suggestions-grid">
                              {suggestions.map((suggestion, index) => (
                                <SuggestionCard
                                  key={index}
                                  text={suggestion}
                                  index={index}
                                  backendUrl={backendUrl}
                                  roastMode={roastMode}
                                  vote={suggestionVotes[suggestion] ?? null}
                                  onVote={(vote) => submitSuggestionVote(suggestion, vote)}
                                  userLoggedIn={!!user}
                                />
                              ))}
                            </div>
                          )}

                          <CuratedTips targetRole={targetRole} />

                          <div style={{ marginTop: '24px', textAlign: 'center' }}>
                            <button
                              type="button"
                              className="app-btn app-btn--secondary"
                              onClick={resetAnalysis}
                              style={{ minHeight: '44px', width: '100%', maxWidth: '250px' }}
                            >
                              <RefreshCw size={15} /> Start New Analysis
                            </button>
                          </div>
                        </div>
                      </section>
                    </>
                  )}
                </section>
              )}
            </main>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {/* Floating Back to Top Button */}
      <button
        type="button"
        className={`fab-btn back-to-top${showBackToTop ? ' back-to-top--visible' : ''}`}
        onClick={scrollToTop}
        aria-label="Back to top"
        title="Back to top"
      >
        ↑
      </button>

      <Footer />
      <CookieConsentBanner />

      {/* Keyboard Shortcuts Help Button & Overlay */}
      <button
        className="fab-btn shortcut-help-trigger"
        onClick={() => setShowShortcutHelp(!showShortcutHelp)}
        title="Toggle Keyboard Shortcuts Help"
        aria-label="Toggle keyboard shortcuts help menu"
        aria-expanded={showShortcutHelp}
      >
        {showShortcutHelp ? <X size={20} /> : <HelpCircle size={20} />}
      </button>

      {showShortcutHelp && (
        <div className="shortcut-overlay-card">
          <h5
            style={{
              margin: '0 0 12px 0',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ⌨️ Keyboard Quick Actions
          </h5>
          <div className="shortcut-row">
            <span style={{ color: '#94a3b8' }}>Upload Resume</span>
            <span className="shortcut-key-badge">Alt + U</span>
          </div>
          <div className="shortcut-row">
            <span style={{ color: '#94a3b8' }}>Reset Analysis</span>
            <span className="shortcut-key-badge">Alt + R</span>
          </div>
          <div className="shortcut-row">
            <span style={{ color: '#94a3b8' }}>Close Modals / Sidebar</span>
            <span className="shortcut-key-badge">Esc</span>
          </div>
          <p
            style={{
              margin: '12px 0 0 0',
              fontSize: '11px',
              color: '#64748b',
              fontStyle: 'italic',
            }}
          >
            Press <kbd style={{ color: '#a5b4fc' }}>Esc</kbd> at any point to clear this helper
            overlay panel.
          </p>
        </div>
      )}

      {showUndoToast && (
        <UndoToast
          message="Analysis reset."
          durationSeconds={5}
          onUndo={handleUndoReset}
          onClose={() => {
            setShowUndoToast(false)
            setUndoState(null)
          }}
        />
      )}
    </>
  )
}

export default App
