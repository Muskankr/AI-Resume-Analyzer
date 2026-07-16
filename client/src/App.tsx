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
  const [analysisSource, setAnalysisSource] = useState<"sample" | "upload" | null>(null);

  // Drag-and-drop highlight state (issue #20 acceptance #1)
  const [isDragActive, setIsDragActive] = useState(false);

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

      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
      const headers = user ? { Authorization: `Bearer ${user.token}` } : {};
      const res = await axios.post(`${backendUrl}/api/upload/`, formData, { headers });

      setScore(res.data.score);
      setSkills(res.data.skills_found || []);
      setSuggestions(res.data.suggestions || []);
      setMatchedSkills(res.data.matched_skills || []);
      setMissingSkills(res.data.missing_skills || []);
      setActiveFileName(fileToAnalyze.name);

      setLoading(false);

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
    }
  };

  const uploadResume = async () => {
    if (!file) {
      alert("Please upload resume");
      return;
    }
    await runAnalysis(file, "upload");
  };

  // ---------------------------------------------------------------------------
  // Shared validation entry-point — used by BOTH the file-picker <input>
  // and the drag-and-drop handler. Issue #20 acceptance criterion #2
  // ("Dropped file goes through the same validation as the file picker")
  // is satisfied by routing both flows through this single function.
  // ---------------------------------------------------------------------------
  const validateAndSetFile = (candidate: File | null | undefined): boolean => {
    if (!candidate) return false;
    // The backend (backend/analyzer/services.py) accepts PDFs via pdfplumber.
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
    setShowAllSkills(false);
    setCopied(false);
    setAnalysisSource(null);
    setActiveFileName("");
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

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", alignItems: "center" }} className="mb-3">
            <button
              className="analyze-btn"
              onClick={uploadResume}
              disabled={loading}
            >
              {loading && analysisSource === "upload" ? "⏳ Extracting and analyzing resume text..." : "🚀 Analyze Resume"}
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
