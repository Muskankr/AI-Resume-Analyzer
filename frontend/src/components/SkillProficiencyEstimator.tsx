import React, { useState } from 'react';
import axios from 'axios';
import './SkillProficiencyEstimator.css';

interface SkillResult {
    skill: string;
    estimated_level: string;
    confidence_score: number;
    warnings: string[];
    context_snippets: string[];
}

interface EstimationResponse {
    results: SkillResult[];
    total_skills_analyzed: number;
    high_risk_claims_count: number;
}

const SkillProficiencyEstimator: React.FC = () => {
    const [resumeText, setResumeText] = useState('');
    const [skillsInput, setSkillsInput] = useState('');
    const [results, setResults] = useState<EstimationResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleEstimate = async () => {
        if (!resumeText.trim() || !skillsInput.trim()) {
            setError('Please provide both resume text and a list of skills.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const skillsArray = skillsInput.split(',').map(s => s.trim()).filter(Boolean);
            const response = await axios.post('/api/estimate-proficiency/', {
                resume_text: resumeText,
                skills: skillsArray
            });
            setResults(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to estimate proficiencies.');
        } finally {
            setLoading(false);
        }
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'Expert': return '#2ed573';
            case 'Advanced': return '#1e90ff';
            case 'Intermediate': return '#ffa502';
            case 'Beginner': return '#ff6b6b';
            default: return '#b0b0b0';
        }
    };

    return (
        <div className="proficiency-estimator-container">
            <h2 className="estimator-title">Skill Proficiency Estimator</h2>

            <div className="estimator-inputs glass-card">
                <div className="input-group">
                    <label htmlFor="resumeText">Resume Text</label>
                    <textarea
                        id="resumeText"
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        placeholder="Paste your full resume text here..."
                        rows={6}
                    />
                </div>

                <div className="input-group">
                    <label htmlFor="skillsInput">Skills to Analyze (comma-separated)</label>
                    <input
                        id="skillsInput"
                        type="text"
                        value={skillsInput}
                        onChange={(e) => setSkillsInput(e.target.value)}
                        placeholder="Python, React, Project Management, AWS..."
                    />
                </div>

                <button
                    className="estimate-btn glass-button"
                    onClick={handleEstimate}
                    disabled={loading}
                >
                    {loading ? 'Analyzing Context...' : 'Estimate Proficiencies'}
                </button>

                {error && <p className="error-message">{error}</p>}
            </div>

            {results && (
                <div className="estimator-results">
                    <div className="results-summary glass-card">
                        <h3>Analysis Summary</h3>
                        <div className="summary-stats">
                            <div className="stat-item">
                                <span className="stat-value">{results.total_skills_analyzed}</span>
                                <span className="stat-label">Skills Analyzed</span>
                            </div>
                            <div className="stat-item warning-stat">
                                <span className="stat-value">{results.high_risk_claims_count}</span>
                                <span className="stat-label">Potential Exaggerations</span>
                            </div>
                        </div>
                    </div>

                    <div className="skills-grid">
                        {results.results.map((result, index) => (
                            <div key={index} className="skill-card glass-card">
                                <div className="skill-header">
                                    <h4>{result.skill}</h4>
                                    <span
                                        className="level-badge"
                                        style={{ backgroundColor: `${getLevelColor(result.estimated_level)}20`, color: getLevelColor(result.estimated_level), borderColor: getLevelColor(result.estimated_level) }}
                                    >
                                        {result.estimated_level}
                                    </span>
                                </div>

                                <div className="confidence-bar-container">
                                    <div className="confidence-label">Confidence: {result.confidence_score}%</div>
                                    <div className="confidence-bar-bg">
                                        <div
                                            className="confidence-bar-fill"
                                            style={{ width: `${result.confidence_score}%`, backgroundColor: getLevelColor(result.estimated_level) }}
                                        ></div>
                                    </div>
                                </div>

                                {result.warnings.length > 0 && (
                                    <div className="warnings-section">
                                        <h5>⚠️ Validation Warnings</h5>
                                        <ul>
                                            {result.warnings.map((warning, wIdx) => (
                                                <li key={wIdx}>{warning}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {result.context_snippets.length > 0 && (
                                    <div className="context-section">
                                        <h5>🔍 Context Snippets</h5>
                                        {result.context_snippets.map((snippet, sIdx) => (
                                            <p key={sIdx} className="context-snippet">"{snippet}"</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SkillProficiencyEstimator;
