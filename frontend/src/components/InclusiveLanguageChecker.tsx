import React, { useState } from 'react';
import axios from 'axios';
import './InclusiveLanguageChecker.css';

interface BiasDetection {
    phrase: string;
    start: number;
    end: number;
    category: string;
    suggestion: string;
    severity: string;
}

interface AnalysisResult {
    detections: BiasDetection[];
    inclusive_text: string;
    inclusivity_score: number;
    total_issues: number;
}

const InclusiveLanguageChecker: React.FC = () => {
    const [inputText, setInputText] = useState<string>('');
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [activeDetection, setActiveDetection] = useState<BiasDetection | null>(null);

    /**
     * Handles the API request to analyze the resume for biased language.
     */
    const handleAnalyze = async () => {
        if (!inputText.trim()) {
            setError('Please paste your resume text to analyze.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.post<AnalysisResult>('/api/check-inclusive-language/', {
                resume_text: inputText
            });
            setResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to analyze text. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Applies a suggested replacement to the original text and re-analyzes.
     */
    const handleAcceptSuggestion = (detection: BiasDetection, replacement: string) => {
        if (!result) return;

        const before = inputText.substring(0, detection.start);
        const after = inputText.substring(detection.end);

        // Preserve casing of the first letter
        let finalReplacement = replacement;
        if (detection.phrase[0] === detection.phrase[0].toUpperCase()) {
            finalReplacement = finalReplacement.charAt(0).toUpperCase() + finalReplacement.slice(1);
        }

        const newText = before + finalReplacement + after;
        setInputText(newText);
        setActiveDetection(null);

        // Re-analyze automatically after a short delay
        setTimeout(() => {
            handleAnalyze();
        }, 100);
    };

    /**
     * Renders the text with interactive highlights for detected biased phrases.
     */
    const getHighlightedText = (): React.ReactNode[] => {
        if (!result || result.detections.length === 0) {
            return [inputText];
        }

        let lastIndex = 0;
        const elements: React.ReactNode[] = [];

        // Sort detections by start index to process in order
        const sortedDetections = [...result.detections].sort((a, b) => a.start - b.start);

        sortedDetections.forEach((detection, index) => {
            // Add text before the detection
            if (detection.start > lastIndex) {
                elements.push(
                    <span key={`text-${index}`}>
                        {inputText.substring(lastIndex, detection.start)}
                    </span>
                );
            }

            // Add the highlighted detection
            elements.push(
                <span
                    key={`detection-${index}`}
                    className={`highlight ${detection.severity === 'high' ? 'high-severity' : 'medium-severity'}`}
                    onClick={() => setActiveDetection(detection)}
                    title={`Category: ${detection.category}\nSuggestion: ${detection.suggestion}`}
                >
                    {inputText.substring(detection.start, detection.end)}
                </span>
            );

            lastIndex = detection.end;
        });

        // Add remaining text
        if (lastIndex < inputText.length) {
            elements.push(
                <span key="text-end">{inputText.substring(lastIndex)}</span>
            );
        }

        return elements;
    };

    return (
        <div className="inclusive-language-container">
            <h2 className="checker-title">Inclusive Language & Bias Detector</h2>

            <div className="checker-workspace">
                {/* Input Panel */}
                <div className="input-panel glass-card">
                    <h3>Original Resume Text</h3>
                    <textarea
                        className="text-input"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Paste your resume text here to check for unconscious bias, gender-coded language, ageism, and ableist terms..."
                        rows={12}
                    />
                    <button
                        className="analyze-btn glass-button"
                        onClick={handleAnalyze}
                        disabled={loading || !inputText.trim()}
                    >
                        {loading ? 'Analyzing...' : 'Check for Bias'}
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </div>

                {/* Output Panel */}
                <div className="output-panel glass-card">
                    <div className="panel-header">
                        <h3>Inclusivity Analysis</h3>
                        {result && (
                            <div className="score-badge" data-score={result.inclusivity_score}>
                                Score: {result.inclusivity_score}/100
                            </div>
                        )}
                    </div>

                    {!result && !loading && (
                        <div className="empty-state">
                            <p>Click "Check for Bias" to identify non-inclusive language and get actionable alternatives.</p>
                        </div>
                    )}

                    {loading && <div className="loading-state">Scanning text for biased phrasing...</div>}

                    {result && !loading && (
                        <div className="results-content">
                            <div className="highlighted-text glass-card-inner">
                                {getHighlightedText()}
                            </div>

                            {activeDetection && (
                                <div className="suggestion-dropdown glass-card-inner">
                                    <h4>
                                        <span className={`category-tag ${activeDetection.category.toLowerCase().replace(' ', '-')}`}>
                                            {activeDetection.category}
                                        </span>
                                    </h4>
                                    <p className="original-phrase">Instead of: <strong>"{activeDetection.phrase}"</strong></p>

                                    <div className="suggestions-list">
                                        {activeDetection.suggestion.split(',').map((suggestion, idx) => (
                                            <button
                                                key={idx}
                                                className="suggestion-chip"
                                                onClick={() => handleAcceptSuggestion(activeDetection, suggestion.trim())}
                                            >
                                                Use "{suggestion.trim()}"
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        className="dismiss-btn"
                                        onClick={() => setActiveDetection(null)}
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            )}

                            <div className="inclusive-preview">
                                <h4>Full Inclusive Version</h4>
                                <textarea
                                    className="inclusive-text"
                                    value={result.inclusive_text}
                                    readOnly
                                    rows={6}
                                />
                                <button
                                    className="copy-all-btn"
                                    onClick={() => navigator.clipboard.writeText(result.inclusive_text)}
                                >
                                    Copy Inclusive Text
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InclusiveLanguageChecker;
