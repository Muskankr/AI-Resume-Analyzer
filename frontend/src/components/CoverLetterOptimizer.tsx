import React, { useState } from 'react';
import axios from 'axios';
import './CoverLetterOptimizer.css';

interface RewriteSuggestion {
    paragraph_index: number;
    original_snippet: string;
    suggestion: string;
    missing_keyword: string;
}

interface OptimizationResult {
    alignment_score: number;
    matched_keywords: string[];
    missing_keywords: string[];
    feedback: string;
    rewrite_suggestions: RewriteSuggestion[];
}

const CoverLetterOptimizer: React.FC = () => {
    const [coverLetter, setCoverLetter] = useState<string>('');
    const [jobDescription, setJobDescription] = useState<string>('');
    const [results, setResults] = useState<OptimizationResult | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    /**
     * Handles the API request to optimize the cover letter.
     */
    const handleOptimize = async () => {
        if (!coverLetter.trim() || !jobDescription.trim()) {
            setError('Please provide both the cover letter draft and the job description.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.post<OptimizationResult>('/api/optimize-cover-letter/', {
                cover_letter: coverLetter,
                job_description: jobDescription
            });
            setResults(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to optimize cover letter. Please try again.');
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
        <div className="cover-letter-optimizer-container">
            <h2 className="optimizer-title">Cover Letter Alignment Scorer</h2>

            <div className="optimizer-workspace">
                {/* Input Section */}
                <div className="input-panel glass-card">
                    <h3>Input Documents</h3>

                    <div className="form-group">
                        <label htmlFor="jobDescription">Target Job Description</label>
                        <textarea
                            id="jobDescription"
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="Paste the job description here..."
                            rows={6}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="coverLetter">Your Cover Letter Draft</label>
                        <textarea
                            id="coverLetter"
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                            placeholder="Paste your cover letter draft here..."
                            rows={8}
                        />
                    </div>

                    <button
                        className="optimize-btn glass-button"
                        onClick={handleOptimize}
                        disabled={loading}
                    >
                        {loading ? 'Analyzing Alignment...' : 'Optimize Cover Letter'}
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </div>

                {/* Results Section */}
                <div className="results-panel glass-card">
                    <h3>Optimization Results</h3>

                    {!results && !loading && (
                        <div className="empty-state">
                            <p>Submit your documents to see the alignment score, keyword analysis, and actionable rewrite suggestions.</p>
                        </div>
                    )}

                    {loading && <div className="loading-state">Evaluating keyword alignment and generating suggestions...</div>}

                    {results && !loading && (
                        <div className="results-content">
                            <div className="score-overview">
                                <div
                                    className="score-gauge"
                                    style={{ borderColor: getScoreColor(results.alignment_score) }}
                                >
                                    <span className="score-value" style={{ color: getScoreColor(results.alignment_score) }}>
                                        {results.alignment_score}
                                    </span>
                                    <span className="score-label">Alignment</span>
                                </div>
                                <div className="score-feedback">
                                    <h4>Feedback</h4>
                                    <p>{results.feedback}</p>
                                </div>
                            </div>

                            <div className="keyword-analysis">
                                <div className="keyword-section">
                                    <h4>✅ Matched Keywords</h4>
                                    <div className="keyword-tags">
                                        {results.matched_keywords.length > 0 ? (
                                            results.matched_keywords.map((kw, idx) => (
                                                <span key={idx} className="keyword-tag matched">{kw}</span>
                                            ))
                                        ) : (
                                            <span className="no-keywords">None detected</span>
                                        )}
                                    </div>
                                </div>

                                <div className="keyword-section">
                                    <h4>⚠️ Missing Keywords</h4>
                                    <div className="keyword-tags">
                                        {results.missing_keywords.length > 0 ? (
                                            results.missing_keywords.map((kw, idx) => (
                                                <span key={idx} className="keyword-tag missing">{kw}</span>
                                            ))
                                        ) : (
                                            <span className="no-keywords">Great job! No major keywords missing.</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {results.rewrite_suggestions.length > 0 && (
                                <div className="suggestions-section">
                                    <h4>💡 Paragraph Rewrite Suggestions</h4>
                                    <div className="suggestions-list">
                                        {results.rewrite_suggestions.map((suggestion, idx) => (
                                            <div key={idx} className="suggestion-card">
                                                <div className="suggestion-header">
                                                    <span className="paragraph-badge">Paragraph {suggestion.paragraph_index}</span>
                                                    <span className="target-keyword">Target: {suggestion.missing_keyword}</span>
                                                </div>
                                                <div className="suggestion-content">
                                                    <p className="original-snippet"><strong>Current:</strong> "{suggestion.original_snippet}"</p>
                                                    <p className="rewrite-idea"><strong>Suggestion:</strong> {suggestion.suggestion}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CoverLetterOptimizer;
