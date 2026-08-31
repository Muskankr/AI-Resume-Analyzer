import React, { useState } from 'react';
import axios from 'axios';
import './ClicheDetector.css';

interface Detection {
    phrase: string;
    start: number;
    end: number;
    suggestion: string;
    type: 'cliche' | 'passive';
}

interface AnalysisResult {
    detections: Detection[];
    modernized_text: string;
    score: number;
    total_issues: number;
}

const ClicheDetector: React.FC = () => {
    const [inputText, setInputText] = useState('');
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeDetection, setActiveDetection] = useState<Detection | null>(null);

    const handleAnalyze = async () => {
        if (!inputText.trim()) return;

        setLoading(true);
        setError('');
        try {
            const response = await axios.post('/api/detect-cliches/', { text: inputText });
            setResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to analyze text. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptSuggestion = (detection: Detection) => {
        if (!result) return;

        // Replace the specific detection in the original text
        const before = inputText.substring(0, detection.start);
        const after = inputText.substring(detection.end);

        // Preserve casing of the first letter
        let suggestion = detection.suggestion;
        if (detection.phrase[0] === detection.phrase[0].toUpperCase()) {
            suggestion = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
        }

        const newText = before + suggestion + after;
        setInputText(newText);
        setActiveDetection(null);

        // Re-analyze automatically
        setTimeout(() => {
            handleAnalyze();
        }, 100);
    };

    const getHighlightedText = () => {
        if (!result || result.detections.length === 0) return inputText;

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
                    className={`highlight ${detection.type}`}
                    onClick={() => setActiveDetection(detection)}
                    title={`Suggestion: ${detection.suggestion}`}
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
        <div className="cliche-detector-container">
            <h2 className="detector-title">Resume Phrase Modernizer</h2>

            <div className="detector-workspace">
                <div className="input-panel glass-card">
                    <div className="panel-header">
                        <h3>Original Text</h3>
                        <button
                            className="analyze-btn glass-button"
                            onClick={handleAnalyze}
                            disabled={loading || !inputText.trim()}
                        >
                            {loading ? 'Analyzing...' : 'Analyze & Suggest'}
                        </button>
                    </div>
                    <textarea
                        className="text-input"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Paste your resume bullet points or summary here..."
                        rows={12}
                    />
                </div>

                <div className="output-panel glass-card">
                    <div className="panel-header">
                        <h3>Analysis & Modernization</h3>
                        {result && (
                            <div className="score-badge" data-score={result.score}>
                                Impact Score: {result.score}/100
                            </div>
                        )}
                    </div>

                    {error && <p className="error-message">{error}</p>}

                    {!result && !loading && (
                        <div className="empty-state">
                            <p>Click "Analyze & Suggest" to identify clichés and passive voice.</p>
                        </div>
                    )}

                    {loading && <div className="loading-state">Analyzing text...</div>}

                    {result && !loading && (
                        <div className="results-content">
                            <div className="highlighted-text glass-card-inner">
                                {getHighlightedText()}
                            </div>

                            {activeDetection && (
                                <div className="suggestion-dropdown glass-card-inner">
                                    <h4>Improvement Suggestion</h4>
                                    <p className="original-phrase">Instead of: <strong>"{activeDetection.phrase}"</strong></p>
                                    <p className="suggested-phrase">Use: <strong>"{activeDetection.suggestion}"</strong></p>
                                    <div className="dropdown-actions">
                                        <button
                                            className="accept-btn"
                                            onClick={() => handleAcceptSuggestion(activeDetection)}
                                        >
                                            Apply Change
                                        </button>
                                        <button
                                            className="dismiss-btn"
                                            onClick={() => setActiveDetection(null)}
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="modernized-preview">
                                <h4>Full Modernized Version</h4>
                                <textarea
                                    className="modernized-text"
                                    value={result.modernized_text}
                                    readOnly
                                    rows={6}
                                />
                                <button
                                    className="copy-all-btn"
                                    onClick={() => navigator.clipboard.writeText(result.modernized_text)}
                                >
                                    Copy Modernized Text
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClicheDetector;
