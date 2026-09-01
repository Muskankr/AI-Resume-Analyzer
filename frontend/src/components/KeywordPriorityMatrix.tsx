import React, { useState } from 'react';
import axios from 'axios';
import './KeywordPriorityMatrix.css';

interface PriorityMatrix {
    critical_missing: string[];
    core_strengths: string[];
    bonus_skills: string[];
    irrelevant_or_missing: string[];
}

const KeywordPriorityMatrix: React.FC = () => {
    const [resumeText, setResumeText] = useState<string>('');
    const [jobDescription, setJobDescription] = useState<string>('');
    const [matrix, setMatrix] = useState<PriorityMatrix | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    /**
     * Handles the API request to generate the keyword priority matrix.
     */
    const handleGenerate = async () => {
        if (!resumeText.trim() || !jobDescription.trim()) {
            setError('Please provide both your resume and the target job description.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.post<PriorityMatrix>('/api/generate-keyword-matrix/', {
                resume_text: resumeText,
                job_description: jobDescription
            });
            setMatrix(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to generate keyword matrix. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Renders a quadrant of the matrix with a specific title and color theme.
     */
    const renderQuadrant = (
        title: string,
        keywords: string[],
        theme: 'critical' | 'strength' | 'bonus' | 'irrelevant'
    ) => {
        const themeClasses = {
            critical: 'quadrant-critical',
            strength: 'quadrant-strength',
            bonus: 'quadrant-bonus',
            irrelevant: 'quadrant-irrelevant'
        };

        return (
            <div className={`matrix-quadrant ${themeClasses[theme]}`}>
                <h4 className="quadrant-title">{title}</h4>
                <div className="keyword-chips">
                    {keywords.length > 0 ? (
                        keywords.map((keyword, idx) => (
                            <span key={idx} className="keyword-chip">{keyword}</span>
                        ))
                    ) : (
                        <span className="empty-quadrant">None</span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="keyword-matrix-container">
            <h2 className="matrix-title">Keyword Priority Matrix</h2>

            <div className="matrix-workspace">
                {/* Input Panel */}
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
                        <label htmlFor="resumeText">Your Resume</label>
                        <textarea
                            id="resumeText"
                            value={resumeText}
                            onChange={(e) => setResumeText(e.target.value)}
                            placeholder="Paste your resume text here..."
                            rows={6}
                        />
                    </div>

                    <button
                        className="generate-btn glass-button"
                        onClick={handleGenerate}
                        disabled={loading}
                    >
                        {loading ? 'Analyzing...' : 'Generate Priority Matrix'}
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </div>

                {/* Output Panel */}
                <div className="output-panel glass-card">
                    <h3>2x2 Priority Matrix</h3>

                    {!matrix && !loading && (
                        <div className="empty-state">
                            <p>Submit your documents to see how your skills align with the job requirements.</p>
                        </div>
                    )}

                    {loading && <div className="loading-state">Parsing modifiers and calculating weights...</div>}

                    {matrix && !loading && (
                        <div className="results-content">
                            <div className="matrix-grid">
                                {renderQuadrant("🔴 Critical Missing (Must-Have)", matrix.critical_missing, 'critical')}
                                {renderQuadrant("🟢 Core Strengths (Must-Have + Present)", matrix.core_strengths, 'strength')}
                                {renderQuadrant("🔵 Bonus Skills (Nice-to-Have + Present)", matrix.bonus_skills, 'bonus')}
                                {renderQuadrant("⚪ Irrelevant or Missing (Nice-to-Have)", matrix.irrelevant_or_missing, 'irrelevant')}
                            </div>

                            <div className="matrix-legend">
                                <p><strong>How to use this matrix:</strong></p>
                                <ul>
                                    <li><strong>Critical Missing:</strong> Prioritize adding these to your resume immediately.</li>
                                    <li><strong>Core Strengths:</strong> Highlight these prominently in your summary and experience.</li>
                                    <li><strong>Bonus Skills:</strong> Good to mention, but don't force them if they don't fit naturally.</li>
                                    <li><strong>Irrelevant or Missing:</strong> Skills you have that aren't in the JD, or low-priority JD skills you lack.</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KeywordPriorityMatrix;
