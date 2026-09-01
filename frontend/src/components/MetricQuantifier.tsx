import React, { useState } from 'react';
import axios from 'axios';
import './MetricQuantifier.css';

interface BulletAnalysis {
    original_bullet: string;
    has_metrics: boolean;
    suggestion: string;
    enhanced_bullet: string;
}

interface MetricResponse {
    total_bullets_analyzed: number;
    bullets_missing_metrics: number;
    analysis_results: BulletAnalysis[];
}

const MetricQuantifier: React.FC = () => {
    const [resumeText, setResumeText] = useState<string>('');
    const [results, setResults] = useState<MetricResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    /**
     * Handles the API request to analyze resume bullets for metrics.
     */
    const handleAnalyze = async () => {
        if (!resumeText.trim()) {
            setError('Please paste your resume text to analyze.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.post<MetricResponse>('/api/suggest-metrics/', {
                resume_text: resumeText
            });
            setResults(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to analyze resume metrics. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Copies the enhanced bullet text to the clipboard.
     */
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            // Optional: Add a toast notification here in a real app
            alert('Copied to clipboard!');
        }).catch((err) => {
            console.error('Failed to copy: ', err);
        });
    };

    return (
        <div className="metric-quantifier-container">
            <h2 className="quantifier-title">Achievement Quantification Engine</h2>

            <div className="quantifier-workspace">
                {/* Input Section */}
                <div className="input-panel glass-card">
                    <h3>Paste Resume Text</h3>
                    <p className="panel-description">
                        Paste your resume experience section below. We will identify bullet points lacking quantifiable metrics and suggest improvements.
                    </p>
                    <textarea
                        className="text-input"
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        placeholder="e.g., 
- Managed a team of developers.
- Increased website traffic.
- Developed new features for the platform."
                        rows={12}
                    />
                    <button
                        className="analyze-btn glass-button"
                        onClick={handleAnalyze}
                        disabled={loading}
                    >
                        {loading ? 'Analyzing...' : 'Analyze for Metrics'}
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </div>

                {/* Results Section */}
                <div className="results-panel glass-card">
                    <h3>Quantification Analysis</h3>

                    {!results && !loading && (
                        <div className="empty-state">
                            <p>Run an analysis to see which bullet points need quantifiable metrics and get tailored suggestions.</p>
                        </div>
                    )}

                    {loading && <div className="loading-state">Scanning bullet points for measurable impact...</div>}

                    {results && !loading && (
                        <div className="results-content">
                            <div className="analysis-summary">
                                <div className="summary-stat">
                                    <span className="stat-value">{results.total_bullets_analyzed}</span>
                                    <span className="stat-label">Bullets Analyzed</span>
                                </div>
                                <div className="summary-stat warning-stat">
                                    <span className="stat-value">{results.bullets_missing_metrics}</span>
                                    <span className="stat-label">Missing Metrics</span>
                                </div>
                            </div>

                            <div className="bullets-list">
                                {results.analysis_results.length === 0 ? (
                                    <div className="no-bullets">No actionable bullet points found. Try pasting a more detailed experience section.</div>
                                ) : (
                                    results.analysis_results.map((result, index) => (
                                        <div
                                            key={index}
                                            className={`bullet-card ${result.has_metrics ? 'metric-present' : 'metric-missing'}`}
                                        >
                                            <div className="bullet-header">
                                                <span className={`status-badge ${result.has_metrics ? 'success' : 'warning'}`}>
                                                    {result.has_metrics ? '✓ Quantified' : '⚠ Needs Metrics'}
                                                </span>
                                            </div>

                                            <div className="bullet-original">
                                                <span className="label">Original:</span>
                                                <p>{result.original_bullet}</p>
                                            </div>

                                            {!result.has_metrics && (
                                                <div className="bullet-suggestion">
                                                    <span className="label">💡 Suggestion:</span>
                                                    <p>{result.suggestion}</p>

                                                    <div className="enhanced-box">
                                                        <span className="label">Enhanced Template:</span>
                                                        <p className="enhanced-text">{result.enhanced_bullet}</p>
                                                        <button
                                                            className="copy-btn"
                                                            onClick={() => copyToClipboard(result.enhanced_bullet)}
                                                            title="Copy enhanced bullet"
                                                        >
                                                            Copy
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MetricQuantifier;
