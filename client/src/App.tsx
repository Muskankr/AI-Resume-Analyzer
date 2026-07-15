import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./index.css";
import { AtsScore } from "./AtsScore";
import { useAnalysisHistory, type AnalysisEntry } from "./hooks/useAnalysisHistory";
import { HistorySidebar } from "./HistorySidebar";
import { useAuth } from "./hooks/useAuth";
import { AuthModal } from "./AuthModal";
import { Footer } from "./Footer";

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

  const uploadResume = async () => {
    if (!file) {
      alert("Please upload resume");
      return;
    }

    try {
      setLoading(true);   
      const formData = new FormData();
      formData.append("file", file);
      formData.append("role", targetRole);

      const headers = user ? { Authorization: `Bearer ${user.token}` } : {};
      const res = await axios.post(`${backendUrl}/api/upload/`, formData, { headers });

      setScore(res.data.score);
      setSkills(res.data.skills_found);
      setSuggestions(res.data.suggestions);
      setMatchedSkills(res.data.matched_skills || []);
      setMissingSkills(res.data.missing_skills || []);
      setActiveFileName(file.name);

      // Save to localStorage only for anonymous users (authenticated saves to DB)
      if (!user) {
        addEntry({
          score: res.data.score,
          skills: res.data.skills_found,
          suggestions: res.data.suggestions,
          matchedSkills: res.data.matched_skills || [],
          missingSkills: res.data.missing_skills || [],
          targetRole,
          fileName: file.name,
        });
      } else {
        // Refresh DB history to include the new entry
        fetchDbHistory(user.token);
      }

      setLoading(false);   
    } catch (error) {
      console.error("Upload failed:", error instanceof Error ? error.message : "Unknown error");
      alert("Upload failed");
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

        <div className="upload-box mb-3">
          <input
            type="file"
            id="fileUpload"
            hidden
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              if (e.target.files) setFile(e.target.files[0]);
            }}
          />
          <label htmlFor="fileUpload" className="upload-label">
            📄 {file ? file.name : "Drag & Drop Resume or Click to Upload"}
          </label>
        </div>

        <button type="button" className="app-btn analyze-btn" onClick={uploadResume} disabled={loading}>
          {loading ? "⏳ Analyzing..." : "🚀 Analyze Resume"}
        </button>

        {score !== null && (
          <>
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
      </div>

      <Footer />
    </div>
    </>
  );
}

export default App;
