import React, { useState } from 'react';
import axios from 'axios';
import './ProjectPortfolioScorer.css';

interface ProjectDetail {
    name: string;
    description: string;
    impact_score: number;
    metrics_found: string[];
    technologies: string[];
    suggestions: string[];
}

interface PortfolioResponse {
    total_projects_found: number;
    average_impact_score: number;
    projects: ProjectDetail[];
}

const ProjectPortfolioScorer: React.FC = () => {
    const [resumeText, setResumeText] = useState('');
    const [results, setResults] = useState<PortfolioResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAnalyze = async () => {
        if (!resumeText.trim()) {
            setError('Please paste your resume text.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.post('/api/analyze-projects/', {
                resume_text: resumeText
            });
            setResults(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to analyze projects.');
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return '#2ed573';
        if (score >= 60) return '#ffa502';
        return '#ff4757';
    };

    return (
        <div className="project-scorer-container">
            <h2 className="scorer-title">Project Portfolio Impact Scorer</h2>

            <div className="scorer-workspace">
                <div className="input-panel glass-card">
                    <h3>Paste Resume Text</h3>
                    <textarea
                        className="text-input"
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        placeholder="Paste your full resume text here to extract and evaluate your projects..."
                        rows={15}
                    />
                    <button
                        className="analyze-btn glass-button"
                        onClick={handleAnalyze}
                        disabled={loading}
                    >
                        {loading ? 'Analyzing...' : 'Analyze Projects'}
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </div>

                <div className="results-panel glass-card">
                    <h3>Portfolio Analysis</h3>

                    {!results && !loading && (
                        <div className="empty-state">
                            <p>Run an analysis to see your project impact scores and actionable improvement suggestions.</p>
                        </div>
                    )}

                    {loading && <div className="loading-state">Extracting and scoring projects...</div>}

                    {results && !loading && (
                        <div className="results-content">
                            {results.total_projects_found === 0 ? (
                                <div className="no-projects">
                                    ⚠️ No distinct project section detected. Consider adding a "Projects" section to highlight your work.
                                </div>
                            ) : (
                                <>
                                    <div className="portfolio-summary">
                                        <div className="summary-stat">
                                            <span className="stat-value">{results.total_projects_found}</span>
                                            <span className="stat-label">Projects Found</span>
                                        </div>
                                        <div className="summary-stat">
                                            <span className="stat-value">{results.average_impact_score}/100</span>
                                            <span className="stat-label">Avg. Impact Score</span>
                                        </div>
                                    </div>

                                    <div className="projects-list">
                                        {results.projects.map((project, index) => (
                                            <div key={index} className="project-card">
                                                <div className="project-header">
                                                    <h4>{project.name}</h4>
                                                    <div
                                                        className="score-gauge"
                                                        style={{ borderColor: getScoreColor(project.impact_score) }}
                                                    >
                                                        <span className="score-value" style={{ color: getScoreColor(project.impact_score) }}>
                                                            {project.impact_score}
                                                        </span>
                                                    </div>
                                                </div>

                                                <p className="project-description">{project.description}</p>

                                                <div className="project-details">
                                                    {project.technologies.length > 0 && (
                                                        <div className="detail-section">
                                                            <h5>Technologies</h5>
                                                            <div className="tech-tags">
                                                                {project.technologies.map((tech, tIdx) => (
                                                                    <span key={tIdx} className="tech-tag">{tech}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {project.metrics_found.length > 0 && (
                                                        <div className="detail-section">
                                                            <h5>✅ Metrics Detected</h5>
                                                            <ul className="metrics-list">
                                                                {project.metrics_found.map((metric, mIdx) => (
                                                                    <li key={mIdx}>{metric}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {project.suggestions.length > 0 && (
                                                        <div className="detail-section suggestions-section">
                                                            <h5>💡 Suggestions for Improvement</h5>
                                                            <ul className="suggestions-list">
                                                                {project.suggestions.map((suggestion, sIdx) => (
                                                                    <li key={sIdx}>{suggestion}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectPortfolioScorer;
