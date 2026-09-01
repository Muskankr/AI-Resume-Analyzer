import React, { useState } from 'react';
import axios from 'axios';
import './ToneCultureFitAnalyzer.css';

interface ToneResponse {
    confidence_score: number;
    collaboration_score: number;
    clarity_score: number;
    overall_tone: string;
    pronoun_dominance: string;
    suggestions: string[];
}

const ToneCultureFitAnalyzer: React.FC = () => {
    const [resumeText, setResumeText] = useState('');
    const [results, setResults] = useState<ToneResponse | null>(null);
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
            const response = await axios.post('/api/analyze-tone/', {
                resume_text: resumeText
            });
            setResults(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to analyze tone.');
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
        <div className="tone-analyzer-container">
            <h2 className="analyzer-title">Tone & Cultural Fit Analyzer</h2>

            <div className="analyzer-workspace">
                <div className="input-panel glass-card">
                    <h3>Paste Resume Text</h3>
                    <textarea
                        className="text-input"
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        placeholder="Paste your resume summary, experience, or full text here to analyze the tone..."
                        rows={15}
                    />
                    <button
                        className="analyze-btn glass-button"
                        onClick={handleAnalyze}
                        disabled={loading}
                    >
                        {loading ? 'Analyzing...' : 'Analyze Tone'}
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </div>

                <div className="results-panel glass-card">
                    <h3>Cultural Fit Assessment</h3>

                    {!results && !loading && (
                        <div className="empty-state">
                            <p>Run an analysis to evaluate your resume's confidence, collaboration, and clarity.</p>
                        </div>
                    )}

                    {loading && <div className="loading-state">Evaluating linguistic patterns...</div>}

                    {results && !loading && (
                        <div className="results-content">
                            <div className="tone-overview">
                                <div className="overall-badge">
                                    <span className="badge-label">Overall Tone</span>
                                    <span className="badge-value">{results.overall_tone}</span>
                                </div>
                                <div className="pronoun-info">
                                    Pronoun Focus: <strong>{results.pronoun_dominance.charAt(0).toUpperCase() + results.pronoun_dominance.slice(1)}</strong>
                                </div>
                            </div>

                            <div className="score-dimensions">
                                <div className="dimension-item">
                                    <div className="dimension-header">
                                        <span>Confidence</span>
                                        <span className="score-value" style={{ color: getScoreColor(results.confidence_score) }}>
                                            {results.confidence_score}%
                                        </span>
                                    </div>
                                    <div className="progress-bar-bg">
                                        <div
                                            className="progress-bar-fill"
                                            style={{ width: `${results.confidence_score}%`, backgroundColor: getScoreColor(results.confidence_score) }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="dimension-item">
                                    <div className="dimension-header">
                                        <span>Collaboration</span>
                                        <span className="score-value" style={{ color: getScoreColor(results.collaboration_score) }}>
                                            {results.collaboration_score}%
                                        </span>
                                    </div>
                                    <div className="progress-bar-bg">
                                        <div
                                            className="progress-bar-fill"
                                            style={{ width: `${results.collaboration_score}%`, backgroundColor: getScoreColor(results.collaboration_score) }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="dimension-item">
                                    <div className="dimension-header">
                                        <span>Clarity</span>
                                        <span className="score-value" style={{ color: getScoreColor(results.clarity_score) }}>
                                            {results.clarity_score}%
                                        </span>
                                    </div>
                                    <div className="progress-bar-bg">
                                        <div
                                            className="progress-bar-fill"
                                            style={{ width: `${results.clarity_score}%`, backgroundColor: getScoreColor(results.clarity_score) }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            {results.suggestions.length > 0 && (
                                <div className="suggestions-section">
                                    <h4>💡 Actionable Rewriting Suggestions</h4>
                                    <ul className="suggestions-list">
                                        {results.suggestions.map((suggestion, index) => (
                                            <li key={index}>{suggestion}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ToneCultureFitAnalyzer;
