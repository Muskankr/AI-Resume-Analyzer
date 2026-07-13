import { AtsScore } from "./AtsScore";
import { useState } from "react";
import axios from "axios";
import "./index.css";

function App() {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const uploadResume = async () => {
    if (!file) {
      alert("Please upload resume");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(
        "http://127.0.0.1:8000/api/upload/",
        formData
      );

      setScore(res.data.score);
      setSkills(res.data.skills_found);
      setSuggestions(res.data.suggestions);
      setLoading(false);
    } catch (error) {
      console.error(error);
      alert("Upload failed");
      setLoading(false);
    }
  };

  const copySuggestionsToClipboard = () => {
    if (suggestions.length === 0) return;
    const plainTextSuggestions = suggestions.map((s) => `• ${s}`).join("\n");
    navigator.clipboard.writeText(plainTextSuggestions)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  };

  return (
    <div className="container mt-5">
      <div className="main-card text-center">
        <h1 className="mb-4">🚀 AI Resume Analyzer</h1>
        
        <div className="upload-box mb-3">
          <input
            type="file"
            id="fileUpload"
            hidden
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              if (e.target.files) {
                setFile(e.target.files[0]);
              }
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
            {/* SCORE METER */}
            <AtsScore score={score} />
            <h5 className="analysis-done">
              ✅ Resume Analysis Complete
            </h5>
          </>
        )}

        {/* SKILLS */}
        <div className="mt-4">
          <h4>Skills Found</h4>
          {skills.length === 0 && <p>No skills detected</p>}
          {skills.map((skill: string, i: number) => (
            <span key={i} className="skill-badge">
              {skill}
            </span>
          ))}
        </div>

        {/* SUGGESTIONS */}
        <div className="suggestion-box">
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

          {suggestions.map((s, i) => (
            <div key={i} className="suggestion-item">
              📌 {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;