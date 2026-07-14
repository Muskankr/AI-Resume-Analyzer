import { useState, useEffect } from "react";
import axios from "axios";
import "./index.css";
import { AtsScore } from "./AtsScore";

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

      const res = await axios.post(
        "http://127.0.0.1:8000/api/upload/",
        formData
      );

      setScore(res.data.score);
      setSkills(res.data.skills_found);
      setSuggestions(res.data.suggestions);
      setMatchedSkills(res.data.matched_skills || []);
      setMissingSkills(res.data.missing_skills || []);
      setLoading(false);   
    } catch (error) {
      console.error(error);
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

  return (
    <div className="container mt-5">
      <div className="main-card text-center">
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          aria-pressed={theme === "dark"}
        >
          {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
        </button>

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

        <button className="analyze-btn" onClick={uploadResume}>
          {loading ? "⏳ Analyzing..." : "🚀 Analyze Resume"}
        </button>

        {score !== null && (
          <>
            <AtsScore score={score} />

            <h5 className="analysis-done">
              ✅ Resume Analysis Complete
            </h5>

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
                  onClick={() => setShowAllSkills(!showAllSkills)}
                  style={{
                    marginTop: "16px",
                    background: "rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    padding: "6px 16px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "13px",
                    transition: "all 0.2s ease"
                  }}
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
                    onClick={copySuggestionsToClipboard}
                    style={{
                      backgroundColor: copied ? "#22c55e" : "#3b82f6",
                      color: "white",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease"
                    }}
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
    </div>
  );
}

export default App;
