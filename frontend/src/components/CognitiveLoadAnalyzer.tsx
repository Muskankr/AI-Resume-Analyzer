import React, { useState } from 'react';
import axios from 'axios';
import './CognitiveLoadAnalyzer.css';

interface HeavySentence {
    text: string;
    reasons: string[];
    word_count: number;
}

interface ReadabilityResult {
    score: number;
    heavy_sentences: HeavySentence[];
    suggestions: string[];
}

const CognitiveLoadAnalyzer: React.FC = () => {
    const [resumeText, setResumeText] = useState<string>('');
    const [result, setResult] = useState<ReadabilityResult | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    /**
     * Handles the API request to analyze resume readability.
     */
    const handleAnalyze = async () => {
        if (!resumeText.trim()) {
            setError('Please paste your resume text to analyze.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.post<ReadabilityResult>('/api/analyze-readability/', {
                resume_text: resumeText
            });
            setResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to analyze readability. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Determines the color of the score gauge based on the score.
     */
    const getScoreColor = (score: number): string => {
        if (score >= 80) return '#2ed573';
        if (score >= 60) return '#ffa502';
        return '#ff4757';
    };

    return (
        <div className="cognitive-load-container">
            <h2 className="analyzer-title">Readability & Cognitive Load Analyzer</h2>

            <div className="analyzer-workspace">
                {/* Input Panel */}
                <div className="input-panel glass-card">
                    <h3>Paste Resume Text</h3>
                    <p className="panel-description">
                        Paste your resume text below. We will evaluate sentence length, passive voice, and jargon to ensure it's easily skimmable.
                    </p>
                    <textarea
                        className="text-input"
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        placeholder="Paste your full resume text here..."
                        rows={12}
                    />
                    <button
                        className="analyze-btn glass-button"
                        onClick={handleAnalyze}
                        disabled={loading || !resumeText.trim()}
                    >
                        {loading ? 'Analyzing...' : 'Analyze Readability'}
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </div>

                {/* Output Panel */}
                <div className="output-panel glass-card">
                    <div className="panel-header">
                        <h3>Cognitive Load Report</h3>
                        {result && (
                            <div className="score-badge" data-score={result.score}>
                                Score: {result.score}/100
                            </div>
                        )}
                    </div>

                    {!result && !loading && (
                        <div className="empty-state">
                            <p>Run an analysis to identify heavy sentences and get actionable suggestions to simplify your phrasing.</p>
                        </div>
                    )}

                    {loading && <div className="loading-state">Evaluating sentence complexity and jargon density...</div>}

                    {result && !loading && (
                        <div className="results-content">
                            <div className="score-overview">
                                <div
                                    className="score-gauge"
                                    style={{ borderColor: getScoreColor(result.score) }}
                                >
                                    <span className="score-value" style={{ color: getScoreColor(result.score) }}>
                                        {result.score}
                                    </span>
                                    <span className="score-label">Readability</span>
                                </div>
                                <div className="score-feedback">
                                    <h4>Overall Assessment</h4>
                                    <p>
                                        {result.score >= 80 ? "Excellent! Your resume is concise and easy to skim." :
                                            result.score >= 60 ? "Good, but some sentences are a bit heavy. See suggestions below." :
                                                "High cognitive load. Your resume needs significant simplification for quick scanning."}
                                    </p>
                                </div>
                            </div>

                            {result.heavy_sentences.length > 0 && (
                                <div className="heavy-sentences-section">
                                    <h4>⚠️ Heavy Sentences to Simplify</h4>
                                    <div className="sentences-list">
                                        {result.heavy_sentences.map((sentence, idx) => (
                                            <div key={idx} className="sentence-card">
                                                <p className="sentence-text">"{sentence.text}"</p>
                                                <div className="sentence-meta">
                                                    <span className="word-count">{sentence.word_count} words</span>
                                                    <div className="reasons">
                                                        {sentence.reasons.map((reason, rIdx) => (
                                                            <span key={rIdx} className="reason-tag">{reason}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="suggestions-section">
                                <h4>💡 Actionable Rewriting Suggestions</h4>
                                <ul className="suggestions-list">
                                    {result.suggestions.map((suggestion, idx) => (
                                        <li key={idx}>{suggestion}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CognitiveLoadAnalyzer;
