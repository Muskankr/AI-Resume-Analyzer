import React, { useState } from 'react';
import axios from 'axios';
import './AccessibilityReport.css';

interface Finding {
    rule: string;
    severity: 'critical' | 'warning' | 'info';
    description: string;
    recommendation: string;
}

interface ReportData {
    findings: Finding[];
    accessibility_score: number;
    total_issues: number;
}

const AccessibilityReport: React.FC = () => {
    const [resumeText, setResumeText] = useState('');
    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCheck = async () => {
        if (!resumeText.trim()) return;

        setLoading(true);
        setError('');
        try {
            const response = await axios.post('/api/check-accessibility/', {
                resume_text: resumeText
            });
            setReport(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to check accessibility. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return '🚨';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '•';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return '#2ed573';
        if (score >= 70) return '#ffa502';
        return '#ff4757';
    };

    return (
        <div className="accessibility-report-container">
            <h2 className="report-title">Screen Reader Compliance Checker</h2>

            <div className="report-workspace">
                <div className="input-panel glass-card">
                    <h3>Paste Resume Text</h3>
                    <textarea
                        className="text-input"
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        placeholder="Paste the plain text version of your resume here to check for accessibility issues..."
                        rows={15}
                    />
                    <button
                        className="check-btn glass-button"
                        onClick={handleCheck}
                        disabled={loading || !resumeText.trim()}
                    >
                        {loading ? 'Analyzing...' : 'Check Accessibility'}
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </div>

                <div className="results-panel glass-card">
                    <h3>Compliance Report</h3>

                    {!report && !loading && (
                        <div className="empty-state">
                            <p>Run an analysis to see your accessibility score and actionable fixes.</p>
                        </div>
                    )}

                    {loading && <div className="loading-state">Evaluating structure...</div>}

                    {report && !loading && (
                        <div className="results-content">
                            <div className="score-overview">
                                <div
                                    className="score-circle"
                                    style={{ borderColor: getScoreColor(report.accessibility_score) }}
                                >
                                    <span className="score-value">{report.accessibility_score}</span>
                                    <span className="score-label">/ 100</span>
                                </div>
                                <div className="score-summary">
                                    <h4>
                                        {report.accessibility_score >= 90 ? 'Excellent' :
                                            report.accessibility_score >= 70 ? 'Good, but needs minor fixes' : 'Needs Significant Improvement'}
                                    </h4>
                                    <p>Found {report.total_issues} potential issue(s) that may hinder assistive technologies.</p>
                                </div>
                            </div>

                            <div className="findings-list">
                                {report.findings.length === 0 ? (
                                    <div className="no-findings">
                                        ✅ No accessibility issues detected! Your resume structure is screen-reader friendly.
                                    </div>
                                ) : (
                                    report.findings.map((finding, index) => (
                                        <div key={index} className={`finding-card ${finding.severity}`}>
                                            <div className="finding-header">
                                                <span className="severity-icon">{getSeverityIcon(finding.severity)}</span>
                                                <span className="severity-badge">{finding.severity.toUpperCase()}</span>
                                                <h4>{finding.rule.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                                            </div>
                                            <p className="finding-description">{finding.description}</p>
                                            <div className="finding-recommendation">
                                                <strong>💡 Recommendation:</strong> {finding.recommendation}
                                            </div>
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

export default AccessibilityReport;
