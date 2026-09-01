import React, { useState } from 'react';
import axios from 'axios';
import './ATSFlowSimulator.css';

interface SectionDetail {
    name: string;
    content_length: number;
    has_dead_zone: boolean;
}

interface FlowAnalysisResult {
    sections: SectionDetail[];
    flow_score: number;
    suggestions: string[];
}

const ATSFlowSimulator: React.FC = () => {
    const [resumeText, setResumeText] = useState<string>('');
    const [result, setResult] = useState<FlowAnalysisResult | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    /**
     * Handles the API request to simulate ATS reading flow.
     */
    const handleSimulate = async () => {
        if (!resumeText.trim()) {
            setError('Please paste your resume text to analyze.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.post<FlowAnalysisResult>('/api/simulate-ats-flow/', {
                resume_text: resumeText
            });
            setResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to simulate ATS flow. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Determines the color of the section block based on its health.
     */
    const getSectionColor = (section: SectionDetail): string => {
        if (section.has_dead_zone) return 'dead-zone';
        return 'healthy';
    };

    return (
        <div className="ats-flow-container">
            <h2 className="simulator-title">ATS Reading Flow Simulator</h2>

            <div className="simulator-workspace">
                {/* Input Panel */}
                <div className="input-panel glass-card">
                    <h3>Paste Resume Text</h3>
                    <p className="panel-description">
                        Paste your resume text below. We will simulate how an ATS parser reads your document from top to bottom.
                    </p>
                    <textarea
                        className="text-input"
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        placeholder="Paste your full resume text here..."
                        rows={15}
                    />
                    <button
                        className="simulate-btn glass-button"
                        onClick={handleSimulate}
                        disabled={loading || !resumeText.trim()}
                    >
                        {loading ? 'Simulating...' : 'Simulate ATS Flow'}
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </div>

                {/* Output Panel */}
                <div className="output-panel glass-card">
                    <div className="panel-header">
                        <h3>Parsing Flow Analysis</h3>
                        {result && (
                            <div className="score-badge" data-score={result.flow_score}>
                                Flow Score: {result.flow_score}/100
                            </div>
                        )}
                    </div>

                    {!result && !loading && (
                        <div className="empty-state">
                            <p>Run the simulator to see your resume's structural flow and identify ATS dead zones.</p>
                        </div>
                    )}

                    {loading && <div className="loading-state">Analyzing section hierarchy and parsing path...</div>}

                    {result && !loading && (
                        <div className="results-content">
                            <div className="flow-timeline">
                                <h4>Detected Section Order</h4>
                                {result.sections.length === 0 ? (
                                    <p className="no-sections">No clear sections detected. Ensure you use standard headers.</p>
                                ) : (
                                    <div className="timeline-track">
                                        {result.sections.map((section, index) => (
                                            <div
                                                key={index}
                                                className={`timeline-block ${getSectionColor(section)}`}
                                                title={section.has_dead_zone ? "Warning: Large block of text may cause ATS parsing issues" : "Section looks good"}
                                            >
                                                <span className="block-order">{index + 1}</span>
                                                <span className="block-name">{section.name.toUpperCase()}</span>
                                                {section.has_dead_zone && <span className="dead-zone-icon">⚠️</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="suggestions-panel">
                                <h4>💡 Reordering & Structural Suggestions</h4>
                                <ul className="suggestions-list">
                                    {result.suggestions.map((suggestion, idx) => (
                                        <li key={idx} className="suggestion-item">
                                            {suggestion}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="legend">
                                <div className="legend-item">
                                    <span className="legend-color healthy"></span>
                                    <span>Healthy Section</span>
                                </div>
                                <div className="legend-item">
                                    <span className="legend-color dead-zone"></span>
                                    <span>Potential Dead Zone (>500 chars without breaks)</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ATSFlowSimulator;
