import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import "./index.css";
import { AtsScore } from "./AtsScore";
import { useAnalysisHistory, type AnalysisEntry } from "./hooks/useAnalysisHistory";
import { HistorySidebar } from "./HistorySidebar";
import { useAuth } from "./hooks/useAuth";
import { AuthModal } from "./AuthModal";
import { Footer } from "./Footer";

type Theme = "light" | "dark";
type AppMode = "single" | "jd";

// ---------------------------------------------------------------------------
// Type mirroring the backend's /api/jd-match/ response shape
// (server/analyzer/views.py). Kept in sync so the JD-match view can safely
// index into the API response.
// ---------------------------------------------------------------------------
interface JdMatchResponse {
  match_percent: number;
  matched_keywords: string[];
  missing_keywords: string[];
  resume_skills_detected: string[];
  jd_keyword_count: number;
  file_name: string;
}

// ---------------------------------------------------------------------------
// Feature detection for the Drag-and-Drop API. Older browsers (and some
// locked-down webviews) don't support DataTransfer.items or even the
// 'drop' event on arbitrary elements. When the feature is missing we fall
// back to the existing click-to-upload flow — the hidden <input type="file">
// stays in the DOM and the label remains clickable, so the upload zone is
// never broken (issue #20 acceptance criterion #3).
// ---------------------------------------------------------------------------
const supportsDragAndDrop = (() => {
  if (typeof window === "undefined") return false;
  const div = document.createElement("div");
  return "draggable" in div && "ondragenter" in div && typeof DataTransfer !== "undefined";
})();

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

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [mode, setMode] = useState<AppMode>("single");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Component States
  const [targetRole, setTargetRole] = useState("Frontend Developer");
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);
  const [missingSkills, setMissingSkills] = useState<string[]>([]);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [copied, setCopied] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<"sample" | "upload" | "jd" | null>(null);

  // Drag-and-drop highlight state (issue #20 acceptance #1)
  const [isDragActive, setIsDragActive] = useState(false);

  // --- JD-match mode state (issue #18) -----------------------------------
  const [jdText, setJdText] = useState("");
  const [jdMatch, setJdMatch] = useState<JdMatchResponse | null>(null);

  // Auth
  const { user, signup, login, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // History
  const { entries, addEntry, deleteEntry, clearHistory, setEntries } = useAnalysisHistory();
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

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const runAnalysis = async (fileToAnalyze: File, source: "sample" | "upload") => {
    try {
      setLoading(true);
      setAnalysisSource(source);
      const formData = new FormData();
      formData.append("file", fileToAnalyze);
      formData.append("role", targetRole);

      const headers = user ? { Authorization: `Bearer ${user.token}` } : {};
      const res = await axios.post(`${backendUrl}/api/upload/`, formData, { headers });

      setScore(res.data.score);
      setSkills(res.data.skills_found);
      setSuggestions(res.data.suggestions);
      setMatchedSkills(res.data.matched_skills || []);
      setMissingSkills(res.data.missing_skills || []);
      setActiveFileName(fileToAnalyze.name);

      // Persist to history for anonymous users (authenticated users get this
      // server-side via /api/history/, so we just refresh from the DB instead).
      if (!user) {
        addEntry({
          score: res.data.score,
          skills: res.data.skills_found,
          suggestions: res.data.suggestions,
          matchedSkills: res.data.matched_skills || [],
          missingSkills: res.data.missing_skills || [],
          targetRole,
          fileName: fileToAnalyze.name,
        });
      } else {
        fetchDbHistory(user.token);
      }

      setLoading(false);
    } catch (error) {
      console.error(error);
      alert(source === "sample" ? "Sample analysis failed" : "Upload failed");
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Shared validation entry-point — used by BOTH the file-picker <input>
  // and the drag-and-drop handler. Issue #20 acceptance criterion #2
  // ("Dropped file goes through the same validation as the file picker")
  // is satisfied by routing both flows through this single function.
  // ---------------------------------------------------------------------------
  const validateAndSetFile = (candidate: File | null | undefined): boolean => {
    if (!candidate) return false;
    // The backend (server/analyzer/views.py) accepts PDFs via pdfplumber.
    // Mirror that constraint client-side so the user gets immediate feedback
    // instead of a 400 from the API. We check both the MIME type and the
    // extension since some browsers assign a generic MIME to dropped files.
    const name = candidate.name || "";
    const ext = name.slice(((name.lastIndexOf(".") as number) + 1) || Infinity).toLowerCase();
    const isPdf =
      candidate.type === "application/pdf" ||
      ext === "pdf";

    if (!isPdf) {
      alert("Unsupported file type. Please upload a PDF resume.");
      return false;
    }
    setFile(candidate);
    return true;
  };

  const uploadResume = async () => {
    if (!file) {
      alert("Please upload resume");
      return;
    }
    await runAnalysis(file, "upload");
  };

  // --- Drag-and-drop handlers (issue #20) ---------------------------------
  // We must preventDefault on dragenter/dragover/dragleave/drop — otherwise
  // the browser opens the file in a new tab instead of letting us handle it.
  // The drag counter pattern (dragDepthRef) avoids the flicker that happens
  // when the pointer crosses child elements inside the drop zone.
  const dragDepthRef = useCallbackRef(0);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!supportsDragAndDrop) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!supportsDragAndDrop) return;
    e.preventDefault();
    e.stopPropagation();
    // Explicitly signal a "copy" drop effect so the cursor reflects intent.
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!supportsDragAndDrop) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!supportsDragAndDrop) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragActive(false);

    const droppedFile = e.dataTransfer?.files?.[0];
    // validateAndSetFile runs the SAME checks as the file picker, satisfying
    // issue #20 acceptance criterion #2.
    validateAndSetFile(droppedFile);
  };

  const handleSampleResume = async () => {
    try {
      setLoading(true);
      setAnalysisSource("sample");
      const response = await fetch("/sample-resume.pdf");
      if (!response.ok) {
        throw new Error("Failed to load sample resume PDF");
      }
      const blob = await response.blob();
      const sampleFile = new File([blob], "sample-resume.pdf", { type: "application/pdf" });
      await runAnalysis(sampleFile, "sample");
    } catch (error) {
      console.error("Could not load sample resume:", error instanceof Error ? error.message : "Unknown error");
      alert("Could not load sample resume");
      setLoading(false);
    }
  };

  // --- JD-match analysis flow (issue #18) ---------------------------------
  const runJdMatch = async () => {
    if (!file) {
      alert("Please upload a resume first.");
      return;
    }
    if (!jdText.trim()) {
      alert("Please paste the job description text.");
      return;
    }
    try {
      setLoading(true);
      setAnalysisSource("jd");
      setJdMatch(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("jd", jdText);

      const headers = user ? { Authorization: `Bearer ${user.token}` } : {};
      const res = await axios.post<JdMatchResponse>(`${backendUrl}/api/jd-match/`, formData, { headers });
      setJdMatch(res.data);
      setActiveFileName(res.data.file_name);

      // Refresh DB history for authenticated users (the backend persists the
      // JD match as a regular ResumeAnalysis row with target_role="JD Match").
      if (user) {
        fetchDbHistory(user.token);
      } else {
        // Anonymous history entry so the user can revisit the result.
        addEntry({
          score: res.data.match_percent,
          skills: res.data.resume_skills_detected,
          suggestions: res.data.missing_keywords.slice(0, 10).map((k) => `Add JD keyword: ${k}`),
          matchedSkills: res.data.matched_keywords,
          missingSkills: res.data.missing_keywords,
          targetRole: "JD Match",
          fileName: res.data.file_name,
        });
      }

      setLoading(false);
    } catch (error) {
      console.error("JD match failed:", error);
      alert("JD match failed");
      setLoading(false);
    }
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

  // Build the className for the upload zone, including the drag-active
  // modifier when a file is being dragged over it.
  const uploadBoxClass = `upload-box mb-3${isDragActive ? " upload-box--drag-active" : ""}`;
  const uploadLabel = isDragActive
    ? "⬇️ Drop your resume here"
    : file
      ? `📄 ${file.name}`
      : "Drag & Drop Resume or Click to Upload";

  // Helper to render the match-percent circle's color based on score.
  // Reused by AtsScore but we also want to color the headline label.
  const matchTone =
    jdMatch === null
      ? "neutral"
      : jdMatch.match_percent >= 70
        ? "good"
        : jdMatch.match_percent >= 40
          ? "mid"
          : "low";

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

        <h1 className="mb-4">🚀 AI Resume Analyzer</h1>

        {/* Mode toggle — Single vs JD Match (issue #18) */}
        <div className="mode-toggle mb-4" role="tablist" aria-label="Analyzer mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "single"}
            className={`mode-toggle__btn${mode === "single" ? " is-active" : ""}`}
            onClick={() => setMode("single")}
          >
            📄 Single Resume
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "jd"}
            className={`mode-toggle__btn${mode === "jd" ? " is-active" : ""}`}
            onClick={() => setMode("jd")}
          >
            🎯 Match Against Job Description
          </button>
        </div>

        {/* Role Selector Dropdown (single-mode only — JD mode derives its
            "required keywords" from the JD itself, so a generic role is
            not relevant). */}
        {mode === "single" && (
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
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Upload zone — supports BOTH click-to-upload (label→input) and     */}
        {/* drag-and-drop (div handlers). The hidden <input type="file">     */}
        {/* stays clickable via the <label htmlFor>, so browsers without     */}
        {/* Drag-and-Drop support still upload normally (issue #20 acc #3).   */}
        {/* ----------------------------------------------------------------- */}
        <div
          className={uploadBoxClass}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          aria-label="Resume upload zone. Drag and drop a PDF or click to browse."
          aria-dropeffect={isDragActive ? "copy" : "none"}
        >
          <input
            type="file"
            id="fileUpload"
            accept="application/pdf,.pdf"
            hidden
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              // Route through the same validator as the drop handler so
              // issue #20 acceptance criterion #2 holds in both directions.
              validateAndSetFile(e.target.files?.[0]);
              // Clear the input value so selecting the same file again
              // after a rejection still fires a change event.
              if (e.target) e.target.value = "";
            }}
          />
          <label htmlFor="fileUpload" className="upload-label">
            {uploadLabel}
          </label>
        </div>

        {mode === "single" && (
          <>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", alignItems: "center" }} className="mb-3">
              <button
                className="analyze-btn"
                onClick={uploadResume}
                disabled={loading}
              >
                {loading && analysisSource === "upload" ? "⏳ Analyzing..." : "🚀 Analyze Resume"}
              </button>
              <button
                className="secondary-btn"
                onClick={handleSampleResume}
                disabled={loading}
                type="button"
              >
                {loading && analysisSource === "sample" ? "⏳ Loading Sample..." : "Try Sample Resume"}
              </button>
            </div>
            <button type="button" className="app-btn analyze-btn" onClick={uploadResume} disabled={loading}>
              {loading ? "⏳ Analyzing..." : "🚀 Analyze Resume"}
            </button>

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

                <h5 className="analysis-done">
                  ✅ Resume Analysis Complete
                </h5>
                {activeFileName && (
                  <p style={{ fontSize: "13px", opacity: 0.7, marginTop: "-8px" }}>📄 {activeFileName}</p>
                )}

                {/* SKILLS CONTAINER */}
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

                {/* SKILL GAP MATRIX */}
                <div className="mt-4 p-3" style={{ background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                  <h4>🎯 Skill Gap Matrix ({targetRole})</h4>
                  <div style={{ display: "flex", justifyContent: "space-around", marginTop: "12px" }}>
                    <div>
                      <h6 style={{ color: "#22c55e" }}>Matched Skills</h6>
                      {matchedSkills.length === 0 ? <p style={{ fontSize: "12px" }}>None</p> : matchedSkills.map((s: string, i: number) => (
                        <span key={i} className="badge bg-success m-1" style={{ display: "inline-block", padding: "4px 8px", background: "#22c55e", borderRadius: "4px", margin: "2px", color: "#fff" }}>{s}</span>
                      ))}
                    </div>
                    <div>
                      <h6 style={{ color: "#ef4444" }}>Missing Skills</h6>
                      {missingSkills.length === 0 ? <p style={{ fontSize: "12px" }}>None</p> : missingSkills.map((s: string, i: number) => (
                        <span key={i} className="badge bg-danger m-1" style={{ display: "inline-block", padding: "4px 8px", background: "#ef4444", borderRadius: "4px", margin: "2px", color: "#fff" }}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>

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
                    )}
                  </div>
                  {suggestions.map((s: string, i: number) => (
                    <div key={i} className="suggestion-item">📌 {s}</div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {mode === "jd" && (
          <>
            {/* JD paste form (issue #18 acceptance #3 — frontend form) */}
            <div className="jd-form mb-3">
              <label htmlFor="jdText" className="jd-form__label">
                📋 Paste Job Description:
              </label>
              <textarea
                id="jdText"
                className="jd-form__textarea"
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the full job description here. The analyzer will extract required keywords and check which ones your resume covers."
                rows={10}
                disabled={loading}
                aria-label="Job description text input"
              />
              <div className="jd-form__meta">
                {jdText.trim().length > 0
                  ? `${jdText.trim().length} characters pasted`
                  : "No JD pasted yet"}
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", alignItems: "center" }} className="mb-3">
              <button
                className="analyze-btn"
                onClick={runJdMatch}
                disabled={loading || !file || !jdText.trim()}
              >
                {loading && analysisSource === "jd" ? "⏳ Matching..." : "🎯 Match Against JD"}
              </button>
              <button
                className="secondary-btn"
                type="button"
                onClick={() => {
                  setJdMatch(null);
                  setJdText("");
                }}
                disabled={loading}
              >
                Clear
              </button>
            </div>

            {jdMatch && (
              <>
                {/* Match-percent headline + score circle (issue #18 acceptance #2) */}
                <div className={`jd-match-summary jd-match-summary--${matchTone} mb-4`}>
                  <h4 style={{ margin: 0 }}>
                    {matchTone === "good" && "🎉 Strong Match"}
                    {matchTone === "mid" && "🟡 Partial Match"}
                    {matchTone === "low" && "🔴 Weak Match"}
                  </h4>
                  <p className="jd-match-summary__percent">{jdMatch.match_percent}%</p>
                  <p className="jd-match-summary__sub">
                    {jdMatch.matched_keywords.length} of {jdMatch.jd_keyword_count} JD keywords found in your resume
                  </p>
                </div>

                <AtsScore score={jdMatch.match_percent} />
                <h5 className="analysis-done">✅ JD Match Complete</h5>
                {activeFileName && (
                  <p style={{ fontSize: "13px", opacity: 0.7, marginTop: "-8px" }}>📄 {activeFileName}</p>
                )}

                {/* Matched vs Missing keywords (issue #18 acceptance #2) */}
                <div className="jd-keywords mt-4">
                  <div className="jd-keywords__row">
                    <div className="jd-keywords__col jd-keywords__col--matched">
                      <h6>✅ In Your Resume ({jdMatch.matched_keywords.length})</h6>
                      {jdMatch.matched_keywords.length === 0 ? (
                        <p style={{ fontSize: "12px" }}>None</p>
                      ) : (
                        <div className="jd-keywords__list">
                          {jdMatch.matched_keywords.map((k, i) => (
                            <span key={i} className="skill-badge skill-badge--matched">{k}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="jd-keywords__col jd-keywords__col--missing">
                      <h6>❌ Missing From Your Resume ({jdMatch.missing_keywords.length})</h6>
                      {jdMatch.missing_keywords.length === 0 ? (
                        <p style={{ fontSize: "12px" }}>None — great match!</p>
                      ) : (
                        <div className="jd-keywords__list">
                          {jdMatch.missing_keywords.map((k, i) => (
                            <span key={i} className="skill-badge skill-badge--missing">{k}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resume skills detected (reuses the curated skill list so the
                    user can compare their general skill coverage against the
                    JD-specific match). */}
                <div className="mt-4">
                  <h4>Skills Detected in Your Resume ({jdMatch.resume_skills_detected.length})</h4>
                  {jdMatch.resume_skills_detected.length === 0 && <p>No skills detected</p>}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
                    {jdMatch.resume_skills_detected.map((skill: string, i: number) => (
                      <span key={i} className="skill-badge">{skill}</span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tiny helper: a mutable ref whose value persists across renders without
// triggering re-renders. Used for the drag-enter/leave counter so we don't
// flicker the highlight when the pointer crosses child elements.
// ---------------------------------------------------------------------------
function useCallbackRef<T>(initial: T): { current: T } {
  return useRef<T>(initial);
}

export default App;
