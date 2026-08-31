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
import { useAnalysisHistory, type AnalysisEntry, type PartialSkillItem } from './hooks/useAnalysisHistory'
import { HistorySidebar, type JobBookmark } from './HistorySidebar'
import { CompareVersions } from './components/CompareVersions/CompareVersions'
import { BulkResumeAnalysisModal } from './components/BulkResumeAnalysisModal'
import { useAuth } from './hooks/useAuth'
import { api } from './api/client'
import { analysisTokenHeaders } from './utils/analysisToken'
import { AuthModal } from './AuthModal'
import { SuggestionVote, type VoteValue } from './components/SuggestionVote'
import { Footer } from './Footer'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import LinkedInConsistencyChecker from './components/LinkedInConsistencyChecker'
import { InterviewQuestionsPanel } from './components/InterviewQuestionsPanel'
import { Dashboard } from './pages/Dashboard/Dashboard'
import { TimelinePanel } from './components/TimelinePanel'
import { type TimelineData } from './utils/timelineFormat'
// import CareerTrackSelector from './components/CareerTrackSelector'
import { ScoreBreakdown, type ScoreBreakdownData } from './components/ScoreBreakdown'
import { FormattingChecks, type FormattingChecksData } from './components/FormattingChecks'
import { WhatsNewModal } from './components/WhatsNewModal'
import { shouldShowWhatsNew } from './data/whatsNewReleases'
import ReleaseNotes from './pages/ReleaseNotes'
import { ShareResult } from './components/ShareResult'
import { setResumeRoastConsent } from './utils/cookieConsent'
import { useTheme } from './theme/ThemeContext'

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
  partial_skills?: PartialSkillItem[]
  missing_skills: string[]
  target_role: string
  experience_level?: string
  created_at: string
  job_match_score?: number | null
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
    partialSkills: item.partial_skills || [],
    missingSkills: item.missing_skills,
    targetRole: item.target_role,
    experienceLevel: item.experience_level || 'Mid-Level',
    fileName: item.file_name,
    jobMatchScore: item.job_match_score,
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
  const { theme, toggleTheme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  const [isDragging, setIsDragging] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [jobMatchScore, setJobMatchScore] = useState<number | null>(null)
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdownData | null>(null)
  const [formattingChecks, setFormattingChecks] = useState<FormattingChecksData | null>(null)
  const [timeline, setTimeline] = useState<TimelineData | null>(null)
  const [autoDetectedExperience, setAutoDetectedExperience] = useState<{ estimatedYears: number; suggestedLevel: ExperienceLevel } | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [roastMode, setRoastMode] = useState<boolean>(false)
  // Server-side id of the current analysis. Only set for signed-in users —
  // anonymous analyses are not persisted, so there is nothing to attach a vote to.
  const [analysisId, setAnalysisId] = useState<number | null>(null)
  const [suggestionVotes, setSuggestionVotes] = useState<Record<string, VoteValue>>({})

  // Job Description Draft State (#533)
  const JD_DRAFT_KEY = 'jd_draft'
  const [jobDescription, setJobDescription] = useState<string>(() => {
    try {
      return localStorage.getItem('jd_draft') || ''
    } catch {
      return ''
    }
  })
  const [isDraftSaved, setIsDraftSaved] = useState<boolean>(false)

  // Job Description Character Limit (#750)
  const MAX_CHARS = 2000

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (jobDescription.trim()) {
          localStorage.setItem(JD_DRAFT_KEY, jobDescription)
          setIsDraftSaved(true)
        } else {
          localStorage.removeItem(JD_DRAFT_KEY)
          setIsDraftSaved(false)
        }
      } catch {
        // storage disabled or unavailable
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [jobDescription])

  // Component States
  const [targetRole, setTargetRole] = useState(() => {
    try {
      return localStorage.getItem('selected_target_role') || 'Frontend Developer'
    } catch {
      return 'Frontend Developer'
    }
  })
  const [experienceLevel, setExperienceLevel] = useState(() => {
    try {
      return localStorage.getItem('selected_experience_level') || 'Mid-Level'
    } catch {
      return 'Mid-Level'
    }
  })
  const [matchedSkills, setMatchedSkills] = useState<string[]>([])
  const [partialSkills, setPartialSkills] = useState<PartialSkillItem[]>([])
  const [missingSkills, setMissingSkills] = useState<string[]>([])
  const [showAllSkills, setShowAllSkills] = useState(false)
  const [copied, setCopied] = useState(false)
  const [analysisSource, setAnalysisSource] = useState<'sample' | 'upload' | null>(null)
  const [resumeText, setResumeText] = useState<string>('')
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([])
  const [previewData, setPreviewData] = useState<{
    score: number
    scoreBreakdown: ScoreBreakdownData | null
    matchedSkills: string[]
    missingSkills: string[]
    suggestions: string[]
    experienceLevel: string
  } | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const handlePreviewLevel = async (level: string) => {
    if (level === experienceLevel) {
      setPreviewData(null)
      setPreviewError(null)
      return
    }
    setPreviewing(true)
    setPreviewError(null)
    try {
      const res = await api.post('/api/preview-level/', {
        analysis_id: analysisId,
        resume_text: resumeText,
        target_role: targetRole,
        experience_level: level,
      })
      setPreviewData({
        score: res.data.score,
        scoreBreakdown: res.data.score_breakdown || null,
        matchedSkills: res.data.matched_skills || [],
        missingSkills: res.data.missing_skills || [],
        suggestions: res.data.suggestions || [],
        experienceLevel: res.data.experience_level,
      })
    } catch (err: any) {
      console.error(err)
      setPreviewError('Failed to fetch preview for ' + level)
    } finally {
      setPreviewing(false)
    }
  }

  // Retry state
  const [retryCount, setRetryCount] = useState(0)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  // Auth
  const { user, signup, login, loginWithOAuth, logout } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  const [bookmarks, setBookmarks] = useState<JobBookmark[]>([])

  useEffect(() => {
    const storageKey = user ? `bookmarks_${user.username}` : 'bookmarks_anon'
    try {
      const data = localStorage.getItem(storageKey)
      setBookmarks(data ? JSON.parse(data) : [])
    } catch {
      setBookmarks([])
    }
  }, [user])

  // const saveJobBookmark = () => {
  //   if (!jobDescription.trim()) return
  //   const name = prompt('Enter a name for this job bookmark:', `${targetRole} - ${new Date().toLocaleDateString()}`)
  //   if (!name) return

  //   const newBookmark: JobBookmark = {
  //     id: Math.random().toString(36).substring(2, 9),
  //     name: name.trim(),
  //     role: targetRole,
  //     experienceLevel: experienceLevel,
  //     jobDescription: jobDescription.trim(),
  //     timestamp: Date.now()
  //   }

  //   setBookmarks((prev) => {
  //     const updated = [newBookmark, ...prev]
  //     const storageKey = user ? `bookmarks_${user.username}` : 'bookmarks_anon'
  //     try {
  //       localStorage.setItem(storageKey, JSON.stringify(updated))
  //     } catch (e) {
  //       console.error('Failed to save bookmarks', e)
  //     }
  //     return updated
  //   })
  //   alert('Job bookmark saved successfully!')
  // }

  const deleteJobBookmark = (id: string) => {
    setBookmarks((prev) => {
      const updated = prev.filter((b) => b.id !== id)
      const storageKey = user ? `bookmarks_${user.username}` : 'bookmarks_anon'
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to delete bookmark', e)
      }
      return updated
    })
  }
  const [showWhatsNew, setShowWhatsNew] = useState<boolean>(() => shouldShowWhatsNew())

  // History
  const {
    entries,
    deleteEntry,
    clearHistory,
    setEntries,
    unreadCount,
    lastViewedTimestamp,
    markAllAsViewed,
  } = useAnalysisHistory()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyNextUrl, setHistoryNextUrl] = useState<string | null>(null)
  const [activeFileName, setActiveFileName] = useState('')
  // Modal that diffs two saved uploads against each other.
  const [showCompare, setShowCompare] = useState(false)
  // Modal for bulk resume analysis (#57)
  const [showBulkModal, setShowBulkModal] = useState(false)

  const fetchDbHistory = useCallback(async () => {
    try {
      // Via `api`: it attaches the current access token and, on a 401,
      // refreshes and retries. This call used to pass a token that had
      // usually expired, and then swallow the 401 -- so the sidebar just
      // silently stopped updating with no clue as to why.
      const res = await api.get(`/api/history/?page=1&page_size=${HISTORY_PAGE_SIZE}`)
      // The endpoint returns a bare array when asked for no particular page,
      // and a {count, next, results} envelope otherwise. Handle both so this
      // keeps working against a backend that has not been updated yet.
      setEntries(toAnalysisEntries(res.data))
      setHistoryNextUrl(nextPageUrl(res.data))
    } catch (error) {
      // A 401 that survives the refresh means the session is genuinely gone;
      // useAuth surfaces that separately. Anything else is worth seeing in
      // the console rather than vanishing.
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
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 401) {
        console.error('Could not load next page of history', error)
      }
    }
  }, [historyNextUrl, setEntries, user])

  // const handleUploadSuccess = async (taskId: string, fileToAnalyze: File) => {
  //   try {
  //     let result = null
  //     while (true) {
  //       const statusRes = await api.get(`/api/status/${taskId}/`)
  //       if (statusRes.data.state === 'SUCCESS') {
  //         result = statusRes.data.result
  //         break
  //       } else if (statusRes.data.state === 'FAILURE') {
  //         throw new Error(statusRes.data.error || 'Analysis failed')
  //       }
  //       await new Promise(r => setTimeout(r, 1000))
  //     }

  //     setScore(result.score)
  //     setScoreBreakdown(result.score_breakdown || null)
  //     setSkills(result.skills_found || [])
  //     setSuggestions(result.suggestions || [])
  //     setMatchedSkills(result.matched_skills || [])
  //     setPartialSkills(result.partial_skills || [])
  //     setMissingSkills(result.missing_skills || [])
  //     setResumeText(result.resume_text || '')
  //     setInterviewQuestions(result.interview_questions || [])
  //     setAnalysisId(typeof result.id === 'number' ? result.id : null)
  //     setSuggestionVotes({})
  //     setActiveFileName(fileToAnalyze.name)

  //     setLoading(false)

  //     // Reset retry state on success
  //     setRetryCount(0)
  //     setCooldownRemaining(0)

  //     if (user) {
  //       await fetchDbHistory()
  //     }
  //   } catch (error: unknown) {
  //     console.error(error)

  //     let errorMsg = 'Unknown error'

  //     if (axios.isAxiosError(error)) {
  //       errorMsg = error.response?.data?.error ?? error.message
  //     } else if (error instanceof Error) {
  //       errorMsg = error.message
  //     }

  //     alert(
  //       `Upload failed: ${errorMsg}`
  //     )

  //     setLoading(false)

  //     // Increment retry count and set cooldown
  //     const newRetryCount = retryCount + 1
  //     setRetryCount(newRetryCount)
  //     setCooldownRemaining(getRetryDelay(newRetryCount))
  //   }
  // }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) fetchDbHistory()
  }, [user, fetchDbHistory])

  useEffect(() => {
    try {
      localStorage.setItem('selected_experience_level', experienceLevel)
    } catch {
      // persistence is best-effort; ignore if storage is unavailable
    }
  }, [experienceLevel])

  // Auto-save Target Role selection (#757)
  useEffect(() => {
    try {
      localStorage.setItem('selected_target_role', targetRole)
    } catch {
      // persistence is best-effort; ignore if storage is unavailable
    }
  }, [targetRole])

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining((prev) => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldownRemaining])

  const getRetryDelay = (attemptNumber: number): number => {
    // Exponential backoff: 2^attemptNumber seconds, capped at 30 seconds
    const delay = Math.pow(2, attemptNumber)
    return Math.min(delay, 30)
  }

  const runAnalysis = async (fileToAnalyze: File, source: 'sample' | 'upload') => {
    try {
      setLoading(true)
      setAnalysisSource(source)
      setPreviewData(null)
      setPreviewError(null)
      const formData = new FormData()
      formData.append('file', fileToAnalyze)
      formData.append('role', targetRole)
      formData.append('experience_level', experienceLevel)
      if (jobDescription.trim()) {
        formData.append('job_description', jobDescription.trim())
      }

      // Through `api`, which attaches the current access token and, on a 401,
      // refreshes once and retries. This used to build an Authorization header
      // by hand from `user.token` — a value captured when the component
      // rendered — so uploading anything more than 15 minutes after signing in
      // failed with a 401 and an "Upload failed" alert. It also stayed stale
      // even when something else had refreshed the token in the meantime.
      // Anonymous uploads are unaffected: with no session the interceptor
      // attaches nothing, exactly as before.
      const res = await api.post('/api/upload/', formData)
      const taskId = res.data.task_id

      // The task id alone used to be enough to read an analysis — including its
      // `resume_text` — from `/api/status/`, and the id travels in a URL path,
      // so it reaches access logs and browser history. Upload now also returns a
      // claim saying who may ask about the task, and it goes in a header rather
      // than the query string so it does not follow the id into those logs.
      // See #706.
      const analysisHeaders = analysisTokenHeaders(res.data.analysis_token)
 feature/readiness-composite-score-758
      let result = null
      while (true) {
        const statusRes = await api.get(`/api/status/${taskId}/`, { headers: analysisHeaders })
        if (statusRes.data.state === 'SUCCESS') {
          result = statusRes.data.result
          break
        } else if (statusRes.data.state === 'FAILURE') {
          throw new Error(statusRes.data.error || 'Analysis failed')
        }
        await new Promise((r) => setTimeout(r, 1000))
      }


      // Any previous run is abandoned before this one starts, so two
      // analyses cannot race to write the result state.
      pollAbortRef.current?.abort()
      const pollController = new AbortController()
      pollAbortRef.current = pollController

      const result = (await pollAnalysisTask(
        taskId,
        {
          // `api`, not a bare axios call: it is the client that refreshes an
          // expired access token (#633), and an analysis can outlive one.
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
      )) as AnalysisResult
 main

      setScore(result.score)
      setJobMatchScore(result.job_match_score || null)
      setScoreBreakdown(result.score_breakdown || null)
      setFormattingChecks(result.formatting_checks || null)
      setTimeline(result.timeline || null)
      setSkills(result.skills_found || [])
      setSuggestions(result.suggestions || [])
      setMatchedSkills(result.matched_skills || [])
      setPartialSkills(result.partial_skills || [])
      setMissingSkills(result.missing_skills || [])
      setResumeText(result.resume_text || '')
      if (result.resume_text) {
        const estimated = estimateExperienceFromText(result.resume_text)
        if (estimated.estimatedYears > 0) {
          setAutoDetectedExperience(estimated)
        } else {
          setAutoDetectedExperience(null)
        }
      } else {
        setAutoDetectedExperience(null)
      }
      setInterviewQuestions(result.interview_questions || [])
      setAnalysisId(typeof result.id === 'number' ? result.id : null)
      setSuggestionVotes({})
      setActiveFileName(fileToAnalyze.name)

      // Clear draft once successfully analyzed (#533)
      try {
        localStorage.removeItem(JD_DRAFT_KEY)
        localStorage.removeItem('selected_target_role')
        localStorage.removeItem('selected_experience_level')
      } catch {
        // ignore
      }
      setJobDescription('')
      setIsDraftSaved(false)

      setLoading(false)

      // Reset retry state on success
      setRetryCount(0)
      setCooldownRemaining(0)

      if (user) {
        await fetchDbHistory()
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
    setFormattingChecks(null)
    setTimeline(null)
    setAutoDetectedExperience(null)
    setSkills([])
    setSuggestions([])
    setMatchedSkills([])
    setPartialSkills([])
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
    setPreviewData(null)
    setPreviewError(null)
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

  const selectHistoryEntry = (entry: AnalysisEntry) => {
    setScore(entry.score)
    setJobMatchScore(entry.jobMatchScore || null)
    // History entries predate the breakdown and do not carry one.
    setScoreBreakdown(null)
    setTimeline(null)
    setSkills(entry.skills)
    setSuggestions(entry.suggestions)
    setMatchedSkills(entry.matchedSkills)
    setPartialSkills(entry.partialSkills || [])
    setMissingSkills(entry.missingSkills)
    setTargetRole(entry.targetRole)
    if (entry.experienceLevel) {
      setExperienceLevel(entry.experienceLevel)
    }
    if (/^\d+$/.test(entry.id)) {
      setAnalysisId(Number(entry.id))
    } else {
      setAnalysisId(null)
    }
    setSuggestionVotes({})
    setActiveFileName(entry.fileName)
    setShowAllSkills(false)
    setCopied(false)
    setHistoryOpen(false)
    setPreviewData(null)
    setPreviewError(null)
  }

  if (location.pathname === '/skill-gap-analyzer') {
    return (
      <>
        <SkillGapAnalyzer />
        <Footer />
      </>
    )
  }

  if (location.pathname === '/career-roadmap') {
    return (
      <>
        <CareerRoadmapPlanner />
        <Footer />
      </>
    )
  }

  if (location.pathname === '/resume-compare') {
    return (
      <>
        <ResumeCompareDashboard />
        <Footer />
      </>
    )
  }

  if (location.pathname === '/interview-prep') {
    return (
      <>
        <InterviewPrepCoach />
        <Footer />
      </>
    )
  }

  if (location.pathname === '/portfolio') {
    return (
      <>
        <PortfolioShowcaseBuilder />
        <Footer />
      </>
    )
  }


  if (location.pathname === '/linkedin-consistency') {
    return (
      <>
        <LinkedInConsistencyChecker />
        <Footer />
      </>
    )
  }

  if (location.pathname === '/privacy') {
    return (
      <>
        <PrivacyPolicyPage />
        <Footer />
      </>
    )
  }

  if (location.pathname === '/dashboard') {
    return (
      <>
        <div className="auth-bar m-3 d-flex justify-content-end">
          <Link to="/" className="btn btn-sm btn-outline-secondary me-2">
            Back to Home
          </Link>
          <button className="auth-bar-btn" onClick={logout}>
            Logout
          </button>
        </div>
        <Dashboard />
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
        onCompare={() => setShowCompare(true)}
        hasMoreOnServer={historyNextUrl !== null}
        onLoadMoreFromServer={loadMoreDbHistory}
        isLoggedIn={!!user}
        bookmarks={bookmarks}
        onSelectBookmark={(b) => {
          setTargetRole(b.role)
          setExperienceLevel(b.experienceLevel)
          setJobDescription(b.jobDescription)
        }}
        onDeleteBookmark={deleteJobBookmark}
      />
      {showCompare && (
        <CompareVersions
          entries={entries}
          token={user?.token}
          username={user?.username}
          onClose={() => setShowCompare(false)}
        />
      )}
      {showBulkModal && (
        <BulkResumeAnalysisModal
          onClose={() => setShowBulkModal(false)}
          initialTargetRole={targetRole}
          initialExperienceLevel={experienceLevel}
          initialJobDescription={jobDescription}
        />
      )}
      <div className="container mt-5">
        <div className="main-card text-center">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="sm"
            pill
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            aria-pressed={theme === 'dark'}
          >
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </Button>
          {/* Auth bar */}
          <div className="auth-bar">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="auth-username me-3"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="auth-username"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  👤 {user.username}
                </Link>
                <Button variant="ghost" size="sm" pill className="auth-bar-btn" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" pill className="auth-bar-btn" onClick={() => setShowAuthModal(true)}>
                🔐 Login / Sign Up
              </Button>
            )}
          </div>
          {showAuthModal && (
            <AuthModal
              onSignup={signup}
              onLogin={login}
              onOAuthLogin={loginWithOAuth}
              onClose={() => setShowAuthModal(false)}
            />
          )}
          <h1 className="mb-4">🚀 AI Resume Analyzer</h1>
          <p
            className="text-center mx-auto"
            style={{ color: 'var(--muted-text)', maxWidth: '600px', marginBottom: 'var(--space-6)' }}
          >
            Optimize your resume for Applicant Tracking Systems in 3 simple steps: choose your
            target career track, upload your resume, and get actionable scoring.
          </p>
          <div
            className="upload-flow-container"
            style={{
              maxWidth: '720px',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              textAlign: 'left',


 feature/readiness-composite-score-758


          {/* Role and Experience Level Selectors */}
          <div className="mb-4 d-flex flex-wrap gap-3 align-items-center justify-content-center">
            <div className="d-flex align-items-center">
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

            <div className="d-flex align-items-center">
              <label
                htmlFor="experienceLevelSelect"
                style={{ marginRight: '10px', fontWeight: '600', color: '#fff' }}
              >
                Experience Level:
              </label>
              <select
                id="experienceLevelSelect"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
              >
                <option value="Junior">Junior (0-2 yrs)</option>
                <option value="Mid-Level">Mid-Level (2-5 yrs)</option>
                <option value="Senior">Senior (5+ yrs)</option>
              </select>
            </div>
          </div>

 main
 main

          {/* Step 1: Configuration */}
          <div
            className="step-card mb-4"
            style={{
              background: 'var(--surface-soft-bg, rgba(255, 255, 255, 0.03))',
              border: '1px solid var(--surface-border, rgba(255, 255, 255, 0.1))',
              borderRadius: 'var(--radius-lg, 12px)',
              padding: '20px',
 main
            }}
          >
            {/* Step 1: Configuration */}
            <div
              className="step-card"
              style={{
 feature/auto-detect-experience-759
                background: 'var(--surface-soft-bg, rgba(255, 255, 255, 0.03))',
                border: '1px solid var(--surface-border, rgba(255, 255, 255, 0.1))',
                borderRadius: 'var(--radius-lg, 12px)',
                padding: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '14px',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--color-primary, #6366f1)',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                  }}
                >
                  1
                </span>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    fontWeight: '600',
                    color: 'var(--heading-text, #fff)',
                  }}
                >
                  Set Career Track &amp; Experience
                </h3>
              </div>

              {/* Role and Experience Level Selectors */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    htmlFor="roleSelect"
                    style={{
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      color: 'var(--heading-text, #fff)',
                    }}
                  >
                    Target Career Track:
                  </label>
                  <select
                    id="roleSelect"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--surface-border, rgba(255, 255, 255, 0.15))',
                      background: 'var(--control-bg, rgba(255, 255, 255, 0.05))',
                      color: 'var(--control-text, #fff)',
                      fontSize: '0.9rem',
                    }}
                  >
                    <option value="Frontend Developer">Frontend Developer</option>
                    <option value="Backend Developer">Backend Developer</option>
                    <option value="Data Analyst">Data Analyst</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <ExperienceLevelSelector
                    selectedLevel={experienceLevel === 'Mid-Level' ? 'Mid' : (experienceLevel as any)}
                    onSelectLevel={(level) => setExperienceLevel(level === 'Mid' ? 'Mid-Level' : level)}
                    autoDetectedSuggestion={autoDetectedExperience}
                  />
                  <label
                    htmlFor="experienceLevelSelect"
                    style={{
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      color: 'var(--heading-text, #fff)',
                    }}
                  >
                    Experience Level:
                  </label>
                  <select
                    id="experienceLevelSelect"
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                  >
                    <option value="Junior">Junior (0-2 yrs)</option>
                    <option value="Mid-Level">Mid-Level (2-5 yrs)</option>
                    <option value="Senior">Senior (5+ yrs)</option>
                    <option value="Lead">Lead (8+ yrs)</option>
                  </select>
                </div>
              </div>

              {/* Job Description Draft Input (#533) */}
              <div style={{ marginTop: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <label
                    htmlFor="jobDescriptionInput"
                    style={{
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      color: 'var(--heading-text, #fff)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    💼 Target Job Description{' '}
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 'normal',
                        color: 'var(--muted-text, #94a3b8)',
                      }}
                    >
                      (Optional)
                    </span>
                  </label>
                  {isDraftSaved && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#4ade80',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      💾 Draft auto-saved
                    </span>
                  )}
                </div>
                <textarea
                  id="jobDescriptionInput"
                  className="custom-textarea"
                  placeholder="Paste job description text here to tailor matching and identify specific missing skills..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  maxLength={MAX_CHARS}
                  rows={3}
                  style={{
                    width: '100%',
                    minHeight: '76px',
                    fontSize: '0.88rem',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
                {(() => {
                  const wordCount = jobDescription.trim()
                    ? jobDescription.trim().split(/\s+/).length
                    : 0
                  if (wordCount > 0 && wordCount < 50) {
                    return (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          backgroundColor: 'rgba(234, 179, 8, 0.1)',
                          border: '1px solid rgba(234, 179, 8, 0.3)',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          color: '#facc15',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        ⚠️{' '}
                        <span>
                          Friendly tip: Very short job descriptions might yield less accurate
                          analysis. Consider pasting the full description!
                        </span>
                      </div>
                    )
                  }
                  return null
                })()}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '6px',
                    fontSize: '0.75rem',
                  }}
                >
                  <span
                    style={{
                      color: isOver ? '#ef4444' : (isClose ? '#f97316' : 'var(--muted-text, #94a3b8)'),
                      fontWeight: isOver ? 'bold' : 'normal',
                      opacity: isOver || isClose ? 1 : 0.8,
                    }}
                  >
                    {jobDescription.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
                  </span>
                  {jobDescription && (
                    <button
                      type="button"
                      onClick={() => setJobDescription('')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--muted-text, #94a3b8)',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: 0,
                      }}
                    >
                      Clear Draft
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Upload Document */}
            <div
              className="step-card"
              style={{
                background: 'var(--surface-soft-bg, rgba(255, 255, 255, 0.03))',
                border: '1px solid var(--surface-border, rgba(255, 255, 255, 0.1))',
                borderRadius: 'var(--radius-lg, 12px)',
                padding: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '14px',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--color-primary, #6366f1)',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                  }}
                >
                  2
                </span>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    fontWeight: '600',
                    color: 'var(--heading-text, #fff)',
                  }}
                >
                  Upload Document
                </h3>
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
                    Drag &amp; Drop Resume or{' '}
                    <span className="upload-text-browse">Click to Browse</span>
                  </span>
                  {file ? (
                    <span
                      className="upload-text-secondary"
                      style={{
                        display: 'block',
                        marginTop: '4px',
                        fontWeight: '600',
                        color: '#4ade80',
                      }}
                    >
                      Selected: {file.name}
                    </span>
                  ) : uploadError ? (
                    <span
                      className="upload-text-error"
                      style={{ display: 'block', marginTop: '4px', color: '#ff6b6b' }}
                    >
                      {uploadError}
                    </span>
                  ) : (
                    <span className="upload-text-secondary">
                      {describeUploadLimits(MAX_FILE_SIZE)}
                    </span>
                  )}
                </label>
              </div>
              <div
                style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}
                className="mb-3"
              >
                <button
                  className="analyze-btn"
                  onClick={uploadResume}
                  disabled={loading || cooldownRemaining > 0}
                  style={{
                    padding: '12px 32px',
                    fontSize: '1rem',
                    fontWeight: '700',
                    letterSpacing: '0.02em',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                  }}
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
                  style={{ padding: '12px 20px', fontSize: '0.95rem' }}
                >
                  {loading && analysisSource === 'sample'
                    ? '⏳ Loading Sample...'
                    : cooldownRemaining > 0
                      ? `Retry available in ${cooldownRemaining}s`
                      : 'Try Sample Resume'}
                </button>
                <button
                  className="secondary-btn"
                  onClick={() => setShowBulkModal(true)}
                  disabled={loading}
                  type="button"
                  title="Upload and analyze multiple resumes at once"
                  style={{ padding: '12px 20px', fontSize: '0.95rem' }}
                >
                  📂 Bulk Analysis
                </button>
              </div>
            </div>
          </div>{/* Loading spinner — shown while the resume is being analyzed */}

                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '14px',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--color-primary, #6366f1)',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                }}
              >
                1
              </span>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: '600',
                  color: 'var(--heading-text, #fff)',
                }}
              >
                💼 Target Job Description <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--muted-text, #94a3b8)' }}>(Optional)</span>
              </label>
              {isDraftSaved && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--color-primary, #6366f1)',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                  }}
                >
                  1
                </span>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    fontWeight: '600',
                    color: 'var(--heading-text, #fff)',
                  }}
                >
                  Set Career Track &amp; Experience
                </h3>
              </div>

              {/* Role and Experience Level Selectors */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    htmlFor="roleSelect"
                    style={{
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      color: 'var(--heading-text, #fff)',
                    }}
                  >
                    Target Career Track:
                  </label>
                  <select
                    id="roleSelect"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--surface-border, rgba(255, 255, 255, 0.15))',
                      background: 'var(--control-bg, rgba(255, 255, 255, 0.05))',
                      color: 'var(--control-text, #fff)',
                      fontSize: '0.9rem',
                    }}
                  >
                    <option value="Frontend Developer">Frontend Developer</option>
                    <option value="Backend Developer">Backend Developer</option>
                    <option value="Data Analyst">Data Analyst</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    htmlFor="experienceLevelSelect"
                    style={{
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      color: 'var(--heading-text, #fff)',
                    }}
                  >
                    Experience Level:
                  </label>
                  <select
                    id="experienceLevelSelect"
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--surface-border, rgba(255, 255, 255, 0.15))',
                      background: 'var(--control-bg, rgba(255, 255, 255, 0.05))',
                      color: 'var(--control-text, #fff)',
                      fontSize: '0.9rem',
                    }}
                  >
                    <option value="Junior">Junior (0-2 yrs)</option>
                    <option value="Mid-Level">Mid-Level (2-5 yrs)</option>
                    <option value="Senior">Senior (5+ yrs)</option>
                  </select>
                </div>
              </div>

              {/* Job Description Draft Input (#533) */}
              <div style={{ marginTop: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <label
                    htmlFor="jobDescriptionInput"
                    style={{
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      color: 'var(--heading-text, #fff)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    💼 Target Job Description{' '}
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 'normal',
                        color: 'var(--muted-text, #94a3b8)',
                      }}
                    >
                      (Optional)
                    </span>
                  </label>
                  {isDraftSaved && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#4ade80',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      💾 Draft auto-saved
                    </span>
                  )}
                </div>
                <textarea
                  id="jobDescriptionInput"
                  className="custom-textarea"
                  placeholder="Paste job description text here to tailor matching and identify specific missing skills..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  maxLength={MAX_CHARS}
                  rows={3}
                  style={{
                    width: '100%',
                    minHeight: '76px',
                    fontSize: '0.88rem',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
                {(() => {
                  const wordCount = jobDescription.trim()
                    ? jobDescription.trim().split(/\s+/).length
                    : 0
                  if (wordCount > 0 && wordCount < 50) {
                    return (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          backgroundColor: 'rgba(234, 179, 8, 0.1)',
                          border: '1px solid rgba(234, 179, 8, 0.3)',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          color: '#facc15',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        ⚠️{' '}
                        <span>
                          Friendly tip: Very short job descriptions might yield less accurate
                          analysis. Consider pasting the full description!
                        </span>
                      </div>
                    )
                  }
                  return null
                })()}
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#4ade80',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  💾 Draft auto-saved
                </span>
              )}
                Set Career Track &amp; Experience
              </h3>
            </div>

            {/* Role and Experience Level Selectors */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '14px',
              }}
 feature/readiness-composite-score-758
            />
            {(() => {
              const wordCount = jobDescription.trim() ? jobDescription.trim().split(/\s+/).length : 0;
              if (wordCount > 0 && wordCount < 50) {
                return (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(234, 179, 8, 0.1)',
                      border: '1px solid rgba(234, 179, 8, 0.3)',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      color: '#facc15',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    ⚠️ <span>Friendly tip: Very short job descriptions might yield less accurate analysis. Consider pasting the full description!</span>
                  </div>
                );
              }
              return null;
            })()}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '6px',
                fontSize: '0.75rem',
              }}
            >
              <span
                style={{
                  color: isOver ? '#ef4444' : (isClose ? '#f97316' : 'var(--muted-text, #94a3b8)'),
                  fontWeight: isOver ? 'bold' : 'normal',
                  opacity: isOver || isClose ? 1 : 0.8,
                }}
              >
                {jobDescription.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
              </span>
              {jobDescription && (
                <button
                  type="button"
                  onClick={() => setJobDescription('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted-text, #94a3b8)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Clear Draft
                </button>
              )}
            </div>
          </div>

            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  htmlFor="roleSelect"
                  style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--heading-text, #fff)' }}
                >
                  Target Career Track:
                </label>
                <select
                  id="roleSelect"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--surface-border, rgba(255, 255, 255, 0.15))',
                    background: 'var(--control-bg, rgba(255, 255, 255, 0.05))',
                    color: 'var(--control-text, #fff)',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="Frontend Developer">Frontend Developer</option>
                  <option value="Backend Developer">Backend Developer</option>
                  <option value="Data Analyst">Data Analyst</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  htmlFor="experienceLevelSelect"
                  style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--heading-text, #fff)' }}
                >
                  Experience Level:
                </label>
                <select
                  id="experienceLevelSelect"
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--surface-border, rgba(255, 255, 255, 0.15))',
                    background: 'var(--control-bg, rgba(255, 255, 255, 0.05))',
                    color: 'var(--control-text, #fff)',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="Junior">Junior (0-2 yrs)</option>
                  <option value="Mid-Level">Mid-Level (2-5 yrs)</option>
                  <option value="Senior">Senior (5+ yrs)</option>
                </select>
              </div>
            </div>

            {/* Job Description Draft Input (#533 / #754) */}
            <div style={{ marginTop: '16px' }}>
              {isDraftSaved && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#4ade80',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    💾 Draft auto-saved
                  </span>
                </div>
              )}
              <JobDescriptionInput
                value={jobDescription}
                onChange={setJobDescription}
                maxCharacters={MAX_CHARS}
              />
              {(() => {
                const wordCount = jobDescription.trim() ? jobDescription.trim().split(/\s+/).length : 0;
                if (wordCount > 0 && wordCount < 50) {
                  return (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        backgroundColor: 'rgba(234, 179, 8, 0.1)',
                        border: '1px solid rgba(234, 179, 8, 0.3)',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        color: '#facc15',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      ⚠️ <span>Friendly tip: Very short job descriptions might yield less accurate analysis. Consider pasting the full description!</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Step 2: Upload Document */}
 main
          <div
            className="step-card"
            style={{
              background: 'var(--surface-soft-bg, rgba(255, 255, 255, 0.03))',
              border: '1px solid var(--surface-border, rgba(255, 255, 255, 0.1))',
              borderRadius: 'var(--radius-lg, 12px)',
              padding: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '14px',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--color-primary, #6366f1)',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                }}
              >
                2
              </span>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: '600',
                  color: 'var(--heading-text, #fff)',
                }}
              >
                Upload Document
              </h3>
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
                  Drag &amp; Drop Resume or{' '}
                  <span className="upload-text-browse">Click to Browse</span>
                </span>
                {file ? (
                  <span
                    className="upload-text-secondary"
                    style={{ display: 'block', marginTop: '4px' }}
                  >
                    Selected: {file.name}
                  </span>
                ) : uploadError ? (
                  <span
                    className="upload-text-error"
                    style={{ display: 'block', marginTop: '4px', color: '#ff6b6b' }}
                  >
                    {uploadError}
                  </span>
                ) : (
                  <span className="upload-text-secondary">{describeUploadLimits(MAX_FILE_SIZE)}</span>
                )}
              </label>
            </div>
          </div>
          <div
            style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}
            className="mb-3"
          >
            <Button
              variant="primary"
              size="lg"
              className="analyze-btn"
              onClick={uploadResume}
              disabled={loading || cooldownRemaining > 0}
            >
              {loading && analysisSource === 'upload'
                ? '⏳ Extracting and analyzing resume text...'
                : cooldownRemaining > 0
                  ? `Retry available in ${cooldownRemaining}s`
                  : '🚀 Analyze Resume'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="secondary-btn"
              onClick={handleSampleResume}
              disabled={loading || cooldownRemaining > 0}
            >
              {loading && analysisSource === 'sample'
                ? '⏳ Loading Sample...'
                : cooldownRemaining > 0
                  ? `Retry available in ${cooldownRemaining}s`
                  : 'Try Sample Resume'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="secondary-btn"
              onClick={() => setShowBulkModal(true)}
              disabled={loading}
              title="Upload and analyze multiple resumes at once"
            >
              📂 Bulk Analysis
            </Button>
          </div>
          {/* Loading spinner — shown while the resume is being analyzed */}
 main
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

              <AtsScore score={displayScore!} />

              {(() => {
                const getTargetLevel = (level?: string): 'Junior' | 'Mid' | 'Senior' | 'Lead' => {
                  if (level === 'Junior') return 'Junior';
                  if (level === 'Senior') return 'Senior';
                  if (level === 'Lead') return 'Lead';
                  return 'Mid';
                };
                
                const expYears = timeline 
                  ? timeline.total_years 
                  : (experienceLevel === 'Junior' ? 1 : experienceLevel === 'Senior' ? 5 : experienceLevel === 'Lead' ? 8 : 3);

                const hasJD = jobMatchScore !== null;
                const readinessReport = calculateReadinessScore({
                  resumeAtsScore: score || 0,
                  experienceYears: expYears,
                  targetExperienceLevel: getTargetLevel(experienceLevel),
                  hasJobDescription: hasJD,
                  careerTrackAlignment: hasJD ? (jobMatchScore || 0) : (score || 0),
                });

                return (
                  <ReadinessDisplay report={readinessReport} atsScore={score || 0} />
                );
              })()}

              <ScoreBreakdown breakdown={displayScoreBreakdown} />

              <FormattingChecks formattingChecks={formattingChecks} />

              {/*
                Employment timeline. Recruiters read the dates before the
                bullets and an ATS parses them into structured employment
                records, so a resume can score well here and still be filtered
                on its history — which nothing in the analyzer looked at (#709).
              */}
              <TimelinePanel timeline={timeline} />

              <ResumePreview text={resumeText} skills={skills} />

              {analysisId !== null && (
                <>
                  <AtsSimulator analysisId={analysisId} />
                  <AiCoverLetterGenerator analysisId={analysisId} />
                </>
              )}
              <SectionAnalyzer resumeText={resumeText} skills={skills} />

              {/*
                Share controls. Previously there was no way to publish or
                unpublish an analysis from the UI at all — the link simply
                existed for every saved analysis (#705). `analysisId` is null
                for anonymous runs and for the bundled sample, and the component
                renders nothing in that case.
              */}
              <ShareResult analysisId={analysisId} />

              <h5 className="analysis-done" role="status" aria-live="polite">
                {previewData ? '🔍 Previewing Growth Details' : '✅ Resume Analysis Complete'}
              </h5>
              {activeFileName && (
                <p style={{ fontSize: '13px', opacity: 0.7, marginTop: '-8px' }}>
                  📄 {activeFileName} • 🎯 {targetRole} • 💼 {displayExperienceLevel}{' '}
                  {previewData && (
                    <span style={{ color: '#818cf8', fontWeight: 'bold' }}>(PREVIEW)</span>
                  )}
                </p>
              )}

              {/* Preview level selector */}
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1.5px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  maxWidth: '560px',
                  margin: '12px auto 24px',
                  textAlign: 'center',
                }}
              >
                <label
                  htmlFor="previewLevelSelect"
                  style={{
                    fontSize: '13.5px',
                    fontWeight: '600',
                    color: '#a5b4fc',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  📈 Preview suggestions at a different Experience Level:
                </label>
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <select
                    id="previewLevelSelect"
                    value={previewData ? previewData.experienceLevel : experienceLevel}
                    onChange={(e) => handlePreviewLevel(e.target.value)}
                    disabled={previewing}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: 'rgba(0, 0, 0, 0.4)',
                      color: '#fff',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    <option value={experienceLevel}>{experienceLevel} (Original)</option>
                    {['Junior', 'Mid-Level', 'Senior']
                      .filter((l) => l !== experienceLevel)
                      .map((level) => (
                        <option key={level} value={level}>
                          {level} (Preview)
                        </option>
                      ))}
                  </select>
                  {previewing && (
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>Loading preview...</span>
                  )}
                  {previewData && !previewing && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setPreviewData(null)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                      }}
                    >
                      Reset to Actual Selection
                    </Button>
                  )}
                </div>
                {previewError && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '6px 0 0' }}>
                    ⚠️ {previewError}
                  </p>
                )}
              </div>

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
                  <Button
                    variant="secondary"
                    size="sm"
                    style={{ marginTop: '16px' }}
                    onClick={() => setShowAllSkills(!showAllSkills)}
                  >
                    {showAllSkills ? 'Show Less ▲' : `Show More (${skills.length - 15} more) ▼`}
                  </Button>
                )}
              </div>

              {/* Skill gap matrix */}
              <div
                className="mt-4 p-3"
                style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}
              >
                <h4>
                  🎯 Skill Gap Matrix ({targetRole} • {experienceLevel})
                </h4>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-around',
                    marginTop: '12px',
                    flexWrap: 'wrap',
                    gap: '16px',
                  }}
                >
                  <div>
                    <h6 style={{ color: '#22c55e' }}>Matched Skills</h6>
                    {displayMatchedSkills.length === 0 ? (
                      <p style={{ fontSize: '12px' }}>None</p>
                    ) : (
                      displayMatchedSkills.map((s, i) => (
                        <span key={i} className="badge bg-success m-1">
                          {s}
                        </span>
                      ))
                    )}
                  </div>
                  {partialSkills.length > 0 && (
                    <div>
                      <h6 style={{ color: '#eab308' }}>Partial Matches</h6>
                      {partialSkills.map((p, i) => {
                        const name = typeof p === 'string' ? p : p.skill
                        const variant = typeof p === 'object' ? p.matched_variant : ''
                        return (
                          <span
                            key={i}
                            className="badge bg-warning text-dark m-1"
                            title={typeof p === 'object' ? p.note : ''}
                          >
                            {name} {variant ? `(${variant})` : ''}
                          </span>
                        )
                      })}
                    </div>
                  )}
                  <div>
                    <h6 style={{ color: '#ef4444' }}>Missing Skills</h6>
                    {displayMissingSkills.length === 0 ? (
                      <p style={{ fontSize: '12px' }}>None</p>
                    ) : (
                      displayMissingSkills.map((s, i) => (
                        <span key={i} className="badge bg-danger m-1">
                          {s}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Skills Radar Chart */}
              <SkillsRadarChart skills={skills} />

              {/* Skills You're Closest to Matching (Partial Credit Suggestions) */}
              {partialSkills.length > 0 && (
                <div
                  className="mt-4 p-3"
                  style={{
                    background: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: '8px',
                  }}
                >
                  <h4
                    style={{
                      color: '#eab308',
                      margin: '0 0 12px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                    }}
                  >
                    ⚡ Skills You're Closest to Matching (Partial Credit)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {partialSkills.map((p, i) => {
                      const skillName = typeof p === 'string' ? p : p.skill
                      const variant = typeof p === 'object' ? p.matched_variant : ''
                      const note = typeof p === 'object' ? p.note : ''
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(0, 0, 0, 0.25)',
                            padding: '10px 14px',
                            borderRadius: '6px',
                            flexWrap: 'wrap',
                            gap: '8px',
                          }}
                        >
                          <div>
                            <span
                              className="badge bg-warning text-dark me-2"
                              style={{ fontWeight: '600' }}
                            >
                              Partial Match
                            </span>
                            <strong style={{ color: '#fff', fontSize: '14px' }}>{skillName}</strong>
                            {variant && (
                              <span
                                style={{ fontSize: '13px', color: '#cbd5e1', marginLeft: '8px' }}
                              >
                                (Resume mentions:{' '}
                                <code style={{ color: '#fef08a' }}>{variant}</code>)
                              </span>
                            )}
                          </div>
                          {note && (
                            <span
                              style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}
                            >
                              💡 {note}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

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
                    <h4 style={{ margin: 0 }}>
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
                        onChange={(e) => {
                          const nextVal = e.target.checked
                          setRoastMode(nextVal)
                          if (nextVal) {
                            setResumeRoastConsent(true)
                          }
                        }}
                        aria-label="Toggle Resume Roast mode"
                        style={{ cursor: 'pointer' }}
                      />
                      🔥 Roast Mode {roastMode ? 'ON' : 'OFF'}
                    </label>
                  </div>
                  {displaySuggestions.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        variant="accent"
                        size="sm"
                        className={`app-btn app-btn--accent${copied ? ' is-success' : ''}`}
                        onClick={copySuggestionsToClipboard}
                      >
                        {copied ? '✅ Copied!' : '📋 Copy Suggestions'}
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          import('jspdf').then(({ default: jsPDF }) => {
                            const doc = new jsPDF()
                            doc.setFontSize(22)
                            doc.text("AI Resume Analyzer - Report", 20, 20)
                            doc.setFontSize(11)
                            doc.setTextColor(100)
                            const timestamp = new Date().toLocaleString()
                            doc.text(`Generated on: ${timestamp}`, 20, 30)
                            doc.text(`File: ${activeFileName}`, 20, 36)
                            doc.text(`Target Role: ${targetRole}`, 20, 42)
                            doc.setTextColor(0)
                            doc.setFontSize(16)
                            const reportScore = displayScore !== null ? displayScore : 0
                            doc.text(`ATS Score: ${reportScore}/100`, 20, 56)
                            doc.setFontSize(14)
                            doc.text(`Skills Found (${skills.length})`, 20, 70)
                            doc.setFontSize(11)
                            let y = 78
                            const wrappedSkills = doc.splitTextToSize(skills.join(", ") || "None", 170)
                            doc.text(wrappedSkills, 20, y)
                            y += wrappedSkills.length * 6 + 10
                            if (y > 270) {
                              doc.addPage()
                              y = 20
                            }
                            doc.setFontSize(14)
                            doc.text("Suggestions", 20, y)
                            y += 10
                            doc.setFontSize(11)
                            if (displaySuggestions.length === 0) {
                              doc.text("No suggestions.", 20, y)
                            } else {
                              displaySuggestions.forEach((s: string) => {
                                const lines = doc.splitTextToSize(`• ${s}`, 170)
                                if (y + lines.length * 6 > 280) {
                                  doc.addPage()
                                  y = 20
                                }
                                doc.text(lines, 20, y)
                                y += lines.length * 6 + 3
                              })
                            }
                            doc.save(`ATS_Report_${activeFileName ? activeFileName.replace(/\.[^/.]+$/, "") : "resume"}.pdf`)
                          }).catch(err => {
                            console.error("Failed to load jsPDF:", err)
                            alert("Failed to generate PDF report.")
                          })
                        }}
                      >
                        📄 Download Report
                      </Button>
                    </div>
                  )}
                </div>

                {displaySuggestions.map((s: string, i: number) => {
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
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={resetAnalysis}
                  >
                    🔄 Start New Analysis
                  </Button>
                </div>
              </div>

              <JobBoardSuggestions skills={skills} track={targetRole} />
              <InterviewQuestionsPanel questions={interviewQuestions} />
            </>
          )}{' '}
          {/* closes the conditional block */}
        </div>{' '}
        {/* closes .main-card */}
      </div>{' '}
      <Footer
        onOpenWhatsNew={() => {
          window.history.pushState({}, '', '/release-notes')
          window.dispatchEvent(new PopStateEvent('popstate'))
        }}
      />
      <WhatsNewModal isOpen={showWhatsNew} onClose={() => setShowWhatsNew(false)} />
    </>
  )
}
{
  /* closes App function */
}

export default App
