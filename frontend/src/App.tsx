import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./index.css";
import { AtsScore } from "./AtsScore";
import { useAnalysisHistory, type AnalysisEntry } from "./hooks/useAnalysisHistory";
import { HistorySidebar } from "./HistorySidebar";
import { useAuth } from "./hooks/useAuth";
import { AuthModal } from "./AuthModal";
import { Footer } from "./Footer";
import { ActionPlanChecklist } from './components/ActionPlanChecklist'

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
  } catch {
    // localStorage / matchMedia can throw in restricted privacy modes
  }
  return "light";
}

function highlightSkills(text: string, skills: string[]): React.ReactNode[] {
  if (!text) return [];
  if (skills.length === 0) return [text];

  // Sort longest first so multi-word skills (e.g. "machine learning") match before shorter ones
  const sorted = [...skills].sort((a, b) => b.length - a.length);
  const escaped = sorted.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // \b works for alphanumeric boundaries; for symbols like c++ we use lookahead/lookbehind
  const pattern = new RegExp(`(?<![\\w])(${escaped.join('|')})(?![\\w])`, 'gi');
  const parts = text.split(pattern);
  const skillSet = new Set(skills.map(s => s.toLowerCase()));

  return parts.map((part, i) =>
    skillSet.has(part.toLowerCase())
      ? <mark key={i} className="skill-highlight">{part}</mark>
      : part
  );
}

function ResumePreview({ text, skills }: { text: string; skills: string[] }) {
  if (!text) return null;
  return (
    <div className="resume-preview mt-4">
      <h4>📄 Resume Text Preview</h4>
      <pre className="resume-preview__body">
        {highlightSkills(text, skills)}
      </pre>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)
  const [retryDisabled, setRetryDisabled] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])

  const [readabilityLabel, setReadabilityLabel] = useState<string | null>(null)
  const [undoState, setUndoState] = useState<UndoState | null>(null)
  const [showUndoToast, setShowUndoToast] = useState(false)

  // Validation States
  const [fileError, setFileError] = useState<string | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)

  const [showShortcutHelp, setShowShortcutHelp] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [showExportDropdown, setShowExportDropdown] = useState(false)

  const [targetRole, setTargetRole] = useState('Frontend Developer')
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
  const [isDragging, setIsDragging] = useState(false)

  // Cover Letter States
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null)
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null)
  const [coverLetterText, setCoverLetterText] = useState<string>('')
  const [coverLetterFeedback, setCoverLetterFeedback] = useState<any>(null)

  // Interview Questions States
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([])
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Component States
  const [targetRole, setTargetRole] = useState("Frontend Developer");
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);
  const [missingSkills, setMissingSkills] = useState<string[]>([]);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [copied, setCopied] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<"sample" | "upload" | null>(null);
  const [resumeText, setResumeText] = useState<string>("");

  // Retry state
  const [retryCount, setRetryCount] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Auth
  const { user, signup, login, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // History
  const { entries, deleteEntry, clearHistory, setEntries } = useAnalysisHistory();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeFileName, setActiveFileName] = useState("");

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

  const fetchDbHistory = useCallback(async (token: string) => {
    try {
      const res = await axios.get(`${backendUrl}/api/history/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dbEntries: AnalysisEntry[] = res.data.map((item: {
        id: number; file_name: string; score: number; skills_found: string[];
        suggestions: string[]; matched_skills: string[]; missing_skills: string[];
        target_role: string; created_at: string;
      }) => ({
        id: String(item.id),
        timestamp: new Date(item.created_at).getTime(),
        score: item.score,
        skills: item.skills_found,
        suggestions: item.suggestions,
        matchedSkills: item.matched_skills,
        missingSkills: item.missing_skills,
        targetRole: item.target_role,
        fileName: item.file_name,
      }));
      setEntries(dbEntries);
    } catch { /* silently ignore */ }
  }, [backendUrl, setEntries]);

  useEffect(() => {
    if (user) fetchDbHistory(user.token);
  }, [user, fetchDbHistory]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // persistence is best-effort; ignore if storage is unavailable
    }
  }, [theme]);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const getRetryDelay = (attemptNumber: number): number => {
    // Exponential backoff: 2^attemptNumber seconds, capped at 30 seconds
    const delay = Math.pow(2, attemptNumber);
    return Math.min(delay, 30);
  };


  const runAnalysis = async (fileToAnalyze: File, source: "sample" | "upload") => {
    try {
      setLoading(true);
      setAnalysisSource(source);
      const formData = new FormData();
      formData.append("file", fileToAnalyze);
      formData.append("role", targetRole);

      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
      const headers = user ? { Authorization: `Bearer ${user.token}` } : {};
      const res = await axios.post(`${backendUrl}/api/upload/`, formData, { headers });

      setScore(res.data.score);
      setSkills(res.data.skills_found || []);
      setSuggestions(res.data.suggestions || []);
      setMatchedSkills(res.data.matched_skills || []);
      setMissingSkills(res.data.missing_skills || []);
      setResumeText(res.data.resume_text || "");
      setActiveFileName(fileToAnalyze.name);

      setLoading(false);

      // Reset retry state on success
      setRetryCount(0);
      setCooldownRemaining(0);

      if (user) {
        await fetchDbHistory(user.token);
      }
    } catch (error: unknown) {
      console.error(error);

      let errorMsg = "Unknown error";

      if (axios.isAxiosError(error)) {
        errorMsg =
          error.response?.data?.error ??
          error.message;
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }

      alert(
        source === "sample"
          ? `Sample analysis failed: ${errorMsg}`
          : `Upload failed: ${errorMsg}`
      );

      setLoading(false);

      // Increment retry count and set cooldown
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      setCooldownRemaining(getRetryDelay(newRetryCount));
    }
  };

  const uploadResume = async () => {
    if (!file) {
      alert("Please upload resume");
      return;
    }
    if (cooldownRemaining > 0) {
      return; // Prevent retry during cooldown
    }
    await runAnalysis(file, "upload");
  };

  const handleSampleResume = async () => {
    if (cooldownRemaining > 0) {
      return; // Prevent retry during cooldown
    }

    try {
      setLoading(true);
      setAnalysisSource("sample");

      const response = await fetch("/sample-resume.pdf");

      if (!response.ok) {
        throw new Error("Failed to load sample resume PDF");
      }

      const blob = await response.blob();

      const sampleFile = new File(
        [blob],
        "sample-resume.pdf",
        { type: "application/pdf" }
      );

      await runAnalysis(sampleFile, "sample");

      setActiveFileName(sampleFile.name);
    } catch (error: unknown) {
      console.error(error);
      alert("Could not load sample resume");
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setFile(null);
    setScore(null);
    setSkills([]);
    setSuggestions([]);
    setMatchedSkills([]);
    setMissingSkills([]);
    setResumeText("");
    setShowAllSkills(false);
    setCopied(false);
    setAnalysisSource(null);
    setActiveFileName("");
    setRetryCount(0);
    setCooldownRemaining(0);
  };

  const copySuggestionsToClipboard = () => {
    if (suggestions.length === 0) return;
    const plainTextSuggestions = suggestions.map((s: string) => `• ${s}`).join("\n");
    navigator.clipboard.writeText(plainTextSuggestions)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => console.error("Failed to copy text: ", err));
  };

  const selectHistoryEntry = (entry: AnalysisEntry) => {
    setScore(entry.score);
    setSkills(entry.skills);
    setSuggestions(entry.suggestions);
    setMatchedSkills(entry.matchedSkills);
    setMissingSkills(entry.missingSkills);
    setTargetRole(entry.targetRole);
    setActiveFileName(entry.fileName);
    setShowAllSkills(false);
    setCopied(false);
    setHistoryOpen(false);
  };

  return (
    <>
      <HistorySidebar
        entries={entries}
        onSelect={selectHistoryEntry}
        onDelete={deleteEntry}
        onClear={clearHistory}
        isOpen={historyOpen}
        onToggle={() => setHistoryOpen((v) => !v)}
      />

      <div className="container mt-5">
        <div className="main-card text-center">
          {/* Theme toggle */}
          <button
            type="button"
            className="app-btn theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            aria-pressed={theme === "dark"}
          >
            {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </button>

          {/* Auth bar */}
          <div className="auth-bar">
            {user ? (
              <>
                <span className="auth-username">👤 {user.username}</span>
                <button className="auth-bar-btn" onClick={logout}>Logout</button>
              </>
            ) : (
              <button className="auth-bar-btn" onClick={() => setShowAuthModal(true)}>🔐 Login / Sign Up</button>
            )}
          </div>

          {showAuthModal && (
            <AuthModal
              onSignup={signup}
              onLogin={login}
              onClose={() => setShowAuthModal(false)}
            />
          )}

                  {(loading || score !== null) && <StepProgress currentStep={currentStep} />}

                  <section className="analyzer-form-section" aria-label="Resume Analyzer Form">
                    {/* STEP 1: Target Career Track */}
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
                                    Upload Your Resume
                                  </span>

                                  <span className="upload-text-secondary">
                                    Drag & drop your resume here or click to browse
                                  </span>

                                  <span className="upload-text-helper">
                                    Supports PDF, DOCX and TXT files (Max 10 MB)
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
                            ℹ️ Note: Make sure link permissions are set to "Anyone with the link can
                            view".
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
                            marginTop: '4px',
                            marginBottom: '16px',
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
                  </section>
                </div>
              </div>
          <h1 className="mb-4">🚀 AI Resume Analyzer</h1>

          {/* Role Selector Dropdown */}
          <div className="mb-4">
            <label htmlFor="roleSelect" style={{ marginRight: "10px", fontWeight: "600", color: "#fff" }}>
              Target Career Track:
            </label>
            <select
              id="roleSelect"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #ccc" }}
            >
              <option value="Frontend Developer">Frontend Developer</option>
              <option value="Backend Developer">Backend Developer</option>
              <option value="Data Analyst">Data Analyst</option>
            </select>
          </div>

          <div
            className={`upload-box mb-3${isDragging ? " dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                setFile(e.dataTransfer.files[0]);
              }
            }}
          >
            <input
              type="file"
              id="fileUpload"
              hidden
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                if (e.target.files) setFile(e.target.files[0]);
              }}
            />
            <label htmlFor="fileUpload" className="upload-label">
              <span className="upload-icon-wrapper" aria-hidden="true">📄</span>
              <span className="upload-text-primary">
                Drag & Drop Resume or <span className="upload-text-browse">Click to Browse</span>
              </span>
              {file ? (
                <span className="upload-text-secondary" style={{ display: "block", marginTop: "4px" }}>
                  Selected: {file.name}
                </span>
              ) : (
                <span className="upload-text-secondary">Supports PDF, DOCX, TXT up to 10MB</span>
              )}
            </label>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", alignItems: "center" }} className="mb-3">
            <button
              className="analyze-btn"
              onClick={uploadResume}
              disabled={loading || cooldownRemaining > 0}
            >
              {loading && analysisSource === "upload" ? "⏳ Extracting and analyzing resume text..." :
                cooldownRemaining > 0 ? `Retry available in ${cooldownRemaining}s` :
                  "🚀 Analyze Resume"}
            </button>
            <button
              className="secondary-btn"
              onClick={handleSampleResume}
              disabled={loading || cooldownRemaining > 0}
              type="button"
            >
              {loading && analysisSource === "sample" ? "⏳ Loading Sample..." :
                cooldownRemaining > 0 ? `Retry available in ${cooldownRemaining}s` :
                  "Try Sample Resume"}
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
              {analysisSource === "sample" && (
                <div className="sample-notice-banner mb-4">
                  <span>ℹ️ Viewing Sample Resume Analysis</span>
                  <span style={{ fontWeight: "normal", fontSize: "13px" }}>
                    — This analysis is based on a bundled sample resume.
                  </span>
                </div>
              )}

              <AtsScore score={score} />

              <ResumePreview text={resumeText} skills={skills} />

              <h5 className="analysis-done">✅ Resume Analysis Complete</h5>
              {activeFileName && (
                <p style={{ fontSize: "13px", opacity: 0.7, marginTop: "-8px" }}>📄 {activeFileName}</p>
              )}

              {/* Skills container */}
              <div className="mt-4">
                <h4>Skills Found ({skills.length})</h4>
                {skills.length === 0 && <p>No skills detected</p>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
                  {(showAllSkills ? skills : skills.slice(0, 15)).map((skill: string, i: number) => (
                    <span key={i} className="skill-badge">{skill}</span>
                  ))}
                </div>
                {skills.length > 15 && (
                  <button
                    type="button"
                    className="app-btn app-btn--secondary"
                    style={{ marginTop: "16px" }}
                    onClick={() => setShowAllSkills(!showAllSkills)}
                  >
                    {showAllSkills ? "Show Less ▲" : `Show More (${skills.length - 15} more) ▼`}
                  </button>
                )}
              </div>

              {/* Skill gap matrix */}
              <div className="mt-4 p-3" style={{ background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                <h4>🎯 Skill Gap Matrix ({targetRole})</h4>
                <div style={{ display: "flex", justifyContent: "space-around", marginTop: "12px" }}>
                  <div>
                    <h6 style={{ color: "#22c55e" }}>Matched Skills</h6>
                    {matchedSkills.length === 0 ? <p style={{ fontSize: "12px" }}>None</p> : matchedSkills.map((s, i) => (
                      <span key={i} className="badge bg-success m-1">{s}</span>
                    ))}
                  </div>
                  <div>
                    <h6 style={{ color: "#ef4444" }}>Missing Skills</h6>
                    {missingSkills.length === 0 ? <p style={{ fontSize: "12px" }}>None</p> : missingSkills.map((s, i) => (
                      <span key={i} className="badge bg-danger m-1">{s}</span>
                    ))}
                  </div>
                </div>
              </div>

              {score !== null && (
                <ActionPlanChecklist
                  score={score}
                  targetRole={targetRole}
                  suggestions={suggestions}
                  missingSkills={missingSkills}
                />
              )}
              {/* SUGGESTIONS BOX WITH THE UTILITY BUTTON */}
              <div className="suggestion-box mt-4">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h4 style={{ margin: 0 }}>💡 Suggestions</h4>
                  {suggestions.length > 0 && (
                    <button
                      type="button"
                      className={`app-btn app-btn--accent${copied ? " is-success" : ""}`}
                      onClick={copySuggestionsToClipboard}
                    >
                      {copied ? "✅ Copied!" : "📋 Copy Suggestions"}
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
                            <h4 id="suggestions-heading" style={{ margin: 0 }}>
                              💡 Suggestions
                            </h4>
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
                                      }}
                                    >
                                      Export CSV
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

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
                </div>

                {suggestions.map((s: string, i: number) => (
                  <div key={i} className="suggestion-item">📌 {s}</div>
                ))}

                {/* Reset Button */}
                <div style={{ marginTop: "24px", textAlign: "center" }}>
                  <button
                    type="button"
                    className="app-btn app-btn--secondary"
                    onClick={resetAnalysis}
                  >
                    🔄 Start New Analysis
                  </button>
                </div>
              </div>
            </>
          )}   {/* closes the conditional block */}
        </div> {/* closes .main-card */}
      </div> {/* closes .container */}

      <Footer />  {/* footer should be outside main container */}

    </>
  ); {/* closes the return fragment */ }
} {/* closes App function */ }

export default App;
