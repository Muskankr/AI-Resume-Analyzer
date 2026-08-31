/**
 * Visual dashboard component displaying layout issues with heatmap-style feedback 
 * and actionable fixes. Supports existing glassmorphic UI theme and Bootstrap 5.
 */
import React from 'react';
import {
    LayoutAnalysisResult,
    getSeverityColor,
    getScoreGrade,
    groupIssuesBySection
} from '../utils/layoutScoring';

interface LayoutAnalysisReportProps {
    result: LayoutAnalysisResult | null;
    isLoading: boolean;
}

const LayoutAnalysisReport: React.FC<LayoutAnalysisReportProps> = ({ result, isLoading }) => {
    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center p-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading layout analysis...</span>
                </div>
                <span className="ms-3 text-muted">Analyzing document structure...</span>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="alert alert-info border-0 shadow-sm">
                <i className="bi bi-info-circle-fill me-2"></i>
                Upload a PDF resume to generate a detailed layout and formatting analysis report.
            </div>
        );
    }

    if (result.error) {
        return (
            <div className="alert alert-danger border-0 shadow-sm">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                Error analyzing layout: {result.error}
            </div>
        );
    }

    const groupedIssues = groupIssuesBySection(result.issues);
    const grade = getScoreGrade(result.score);
    const gradeColor = result.score >= 80 ? 'text-success' : result.score >= 60 ? 'text-warning' : 'text-danger';
    const scoreColor = result.score >= 80 ? 'bg-success' : result.score >= 60 ? 'bg-warning' : 'bg-danger';

    return (
        <div className="card glassmorphic-card p-4 shadow-sm border-0">
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom border-secondary pb-3">
                <div>
                    <h3 className="h4 mb-1 fw-bold">Layout & Formatting Analysis</h3>
                    <p className="text-muted mb-0 small">Visual structure, section hierarchy, and readability metrics</p>
                </div>
                <div className={`text-center p-3 rounded-3 bg-opacity-10 ${scoreColor} bg-dark border border-secondary`}>
                    <div className={`h1 mb-0 fw-bold ${gradeColor}`}>{grade}</div>
                    <div className="text-muted small fw-semibold">Score: {result.score}/100</div>
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="card bg-dark bg-opacity-50 border-secondary h-100">
                        <div className="card-body text-center p-3">
                            <h6 className="card-title text-muted text-uppercase small fw-bold mb-2">Sections Detected</h6>
                            <p className="h3 mb-1 fw-bold text-light">{result.detected_sections.length}</p>
                            <small className="text-muted d-block text-truncate" title={result.detected_sections.join(', ')}>
                                {result.detected_sections.join(', ') || 'None detected'}
                            </small>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card bg-dark bg-opacity-50 border-secondary h-100">
                        <div className="card-body text-center p-3">
                            <h6 className="card-title text-muted text-uppercase small fw-bold mb-2">Font Variations</h6>
                            <p className="h3 mb-1 fw-bold text-light">{result.unique_font_sizes}</p>
                            <small className={result.unique_font_sizes <= 3 ? 'text-success' : 'text-warning'}>
                                {result.unique_font_sizes <= 3 ? 'Optimal range' : 'Consider reducing'}
                            </small>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card bg-dark bg-opacity-50 border-secondary h-100">
                        <div className="card-body text-center p-3">
                            <h6 className="card-title text-muted text-uppercase small fw-bold mb-2">Total Lines</h6>
                            <p className="h3 mb-1 fw-bold text-light">{result.total_lines}</p>
                            <small className="text-muted">Analyzed for length & density</small>
                        </div>
                    </div>
                </div>
            </div>

            <h4 className="h5 mb-3 fw-bold">Formatting Issues & Recommendations</h4>
            {Object.keys(groupedIssues).length === 0 ? (
                <div className="alert alert-success border-0 shadow-sm d-flex align-items-center">
                    <i className="bi bi-check-circle-fill me-2 fs-5"></i>
                    <div>
                        <strong>Excellent!</strong> No major formatting or layout issues detected. Your resume structure is ATS-friendly.
                    </div>
                </div>
            ) : (
                Object.entries(groupedIssues).map(([section, issues]) => (
                    <div key={section} className="mb-4">
                        <h5 className="h6 text-primary border-bottom border-secondary pb-2 mb-3 fw-bold text-uppercase small">
                            {section}
                        </h5>
                        {issues.map((issue, idx) => (
                            <div
                                key={idx}
                                className="card mb-3 bg-dark bg-opacity-75 border-0 shadow-sm"
                                style={{ borderLeft: `4px solid ${getSeverityColor(issue.severity)}` }}
                            >
                                <div className="card-body p-3">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <h6 className="card-subtitle mb-0 fw-bold text-light">{issue.issue_type}</h6>
                                        <span
                                            className="badge px-2 py-1"
                                            style={{
                                                backgroundColor: getSeverityColor(issue.severity),
                                                color: issue.severity === 'Medium' ? '#000' : '#fff',
                                                fontSize: '0.75rem'
                                            }}
                                        >
                                            {issue.severity}
                                        </span>
                                    </div>
                                    <p className="card-text text-light mb-2 small">{issue.description}</p>
                                    <div className="bg-opacity-10 bg-primary rounded p-2 mt-2">
                                        <p className="mb-0 small text-info">
                                            <i className="bi bi-lightbulb-fill me-1"></i>
                                            <strong>Recommendation:</strong> {issue.recommendation}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ))
            )}
        </div>
    );
};

export default LayoutAnalysisReport;
