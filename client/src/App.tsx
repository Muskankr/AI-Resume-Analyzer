import { useState } from "react";
import axios from "axios";
import "./index.css";

function App() {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [error, setError] = useState("");

  const API_URL =
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setError("");

    if (!e.target.files?.length) return;

    const selectedFile = e.target.files[0];

    if (selectedFile.type !== "application/pdf") {
      setError("⚠️ Only PDF resumes are supported.");
      setFile(null);
      return;
    }

    setFile(selectedFile);

    // Reset previous analysis
    setScore(null);
    setSkills([]);
    setSuggestions([]);
    setShowAllSkills(false);
  };

  const uploadResume = async () => {
    if (!file) {
      setError("⚠️ Please upload a resume first.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(
        `${API_URL}/api/upload/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setScore(res.data.score);
      setSkills(res.data.skills_found || []);
      setSuggestions(res.data.suggestions || []);
    } catch (err: any) {
      console.error(err);

      if (!navigator.onLine) {
        setError("🌐 No Internet Connection");
      } else if (err.response) {
        setError(
          `❌ Server Error (${err.response.status})`
        );
      } else {
        setError(
          "⚠️ Unable to connect to backend."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="main-card text-center">

        <h1 className="mb-4">
          🚀 AI Resume Analyzer
        </h1>

        {error && (
          <div
            style={{
              background: "#ffe5e5",
              color: "#d8000c",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "15px",
              fontWeight: "600",
            }}
          >
            {error}
          </div>
        )}

        <div className="upload-box mb-3">
          <input
            type="file"
            id="fileUpload"
            accept=".pdf"
            hidden
            onChange={handleFileChange}
          />

          <label
            htmlFor="fileUpload"
            className="upload-label"
          >
            📄{" "}
            {file
              ? file.name
              : "Choose Resume (PDF Only)"}
          </label>
        </div>

        <button
          className="analyze-btn"
          onClick={uploadResume}
          disabled={loading}
        >
          {loading
            ? "⏳ Analyzing..."
            : "🚀 Analyze Resume"}
        </button>

        {score !== null && (
          <>
            <div className="score-section">
              <div
                className="score-circle mb-3"
                style={
                  {
                    "--score": `${score * 3.6}deg`,
                  } as React.CSSProperties
                }
              >
                {score}%
              </div>

              <h3>ATS Resume Score</h3>

              <h5 className="analysis-done">
                ✅ Resume Analysis Complete
              </h5>
            </div>

            <div className="mt-4">
              <h4>
                Skills Found ({skills.length})
              </h4>

              {skills.length === 0 && (
                <p>No skills detected</p>
              )}

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "10px",
                }}
              >
                {(showAllSkills
                  ? skills
                  : skills.slice(0, 15)
                ).map((skill, i) => (
                  <span
                    key={i}
                    className="skill-badge"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {skills.length > 15 && (
                <button
                  style={{
                    marginTop: "15px",
                  }}
                  onClick={() =>
                    setShowAllSkills(
                      !showAllSkills
                    )
                  }
                >
                  {showAllSkills
                    ? "Show Less ▲"
                    : `Show More (${
                        skills.length - 15
                      }) ▼`}
                </button>
              )}
            </div>

            <div className="suggestion-box">
              <h4>💡 Suggestions</h4>

              {suggestions.length === 0 && (
                <p>
                  No suggestions available.
                </p>
              )}

              {suggestions.map((item, i) => (
                <div
                  key={i}
                  className="suggestion-item"
                >
                  📌 {item}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;