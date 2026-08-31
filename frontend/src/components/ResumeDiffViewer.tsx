/**
 * Complex UI component providing a unified view of changes, 
 * with color-coded badges for different change types and a high-level summary.
 * Supports glassmorphic UI theme and dark/light modes.
 */
import React, { useState } from 'react';
import api from '../api/client';
import {
    DiffData,
    SemanticChange,
    getNetWordChange,
    getChangeColorClass,
    getCategoryBadgeClass,
    formatSummaryStats,
    groupChangesByCategory
} from '../utils/diffFormatter';

interface ResumeDiffViewerProps {
    initialTextV1?: string;
    initialTextV2?: string;
}

const ResumeDiffViewer: React.FC<ResumeDiffViewerProps> = ({ initialTextV1 = '', initialTextV2 = '' }) => {
    const [textV1, setTextV1] = useState<string>(initialTextV1);
    const [textV2, setTextV2] = useState<string>(initialTextV2);
    const [diffData, setDiffData] = useState<DiffData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleCompare = async () => {
        if (!textV1.trim() || !textV2.trim()) {
            setError('Please provide both Version 1 and Version 2 resume texts.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setDiffData(null);

        try {
            const response = await api.post<DiffData>('/api/analyzer/semantic-diff/', {
                text_v1: textV1,
                text_v2: textV2,
            });
            setDiffData(response.data);
        } catch (err) {
            console.error('Semantic diff failed:', err);
            setError('Failed to compare resumes. Please check your inputs and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderSummaryDashboard = () => {
        if (!diffData) return null;

        const stats = formatSummaryStats(diffData.summary);
        const netWords = getNetWordChange(diffData.word_count_v1, diffData.word_count_v2);
        const wordChangeColor = netWords >= 0 ? 'text-success' : 'text-danger';

        return (
            <div className="card bg-dark bg-opacity-50 border-secondary p-3 mb-4">
                <h5 className="h6 fw-bold text-light mb-3">
                    <i className="bi bi-bar-chart-fill me-2 text-primary"></i>
                    High-Level Summary
                </h5>
                <div className="row g-3">
                    <div className="col-md-4">
                        <div className="p-2 rounded bg-dark border border-secondary text-center">
                            <div className="text-muted small text-uppercase">Word Count Change</div>
                            <div className={`h5 mb-0 fw-bold ${wordChangeColor}`}>
                                {netWords >= 0 ? '+' : ''}{netWords}
                            </div>
                        </div>
                    </div>
                    <div className="col-md-8">
                        <div className="p-2 rounded bg-dark border border-secondary">
                            <div className="text-muted small text-uppercase mb-2">Key Improvements</div>
                            <div className="d-flex flex-wrap gap-2">
                                {stats.map((stat, idx) => (
                                    <span key={idx} className="badge bg-primary bg-opacity-75 text-light px-2 py-1">
                                        {stat}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderDetailedChanges = () => {
        if (!diffData || diffData.changes.length === 0) {
            return (
                <div className="alert alert-info border-0 shadow-sm">
                    <i className="bi bi-info-circle-fill me-2"></i>
                    The resumes are semantically identical. No significant changes detected.
                </div>
            );
        }

        const grouped = groupChangesByCategory(diffData.changes);

        return (
            <div className="card bg-dark bg-opacity-50 border-secondary p-3">
                <h5 className="h6 fw-bold text-light mb-3">
                    <i className="bi bi-list-check me-2 text-success"></i>
                    Detailed Semantic Changes
                </h5>
                {Object.entries(grouped).map(([category, changes]) => (
                    <div key={category} className="mb-4">
                        <h6 className={`fw-bold text-uppercase small mb-2 ${getChangeColorClass('modified')}`}>
                            <span className={`badge ${getCategoryBadgeClass(category)} me-2`}>
                                {category}
                            </span>
                            ({changes.length} change{changes.length > 1 ? 's' : ''})
                        </h6>
                        <ul className="list-group list-group-flush bg-transparent">
                            {changes.map((change, idx) => (
                                <li key={idx} className="list-group-item bg-transparent border-secondary px-0 py-2">
                                    <div className="d-flex align-items-start">
                                        <span className={`badge me-2 mt-1 ${change.change_type === 'added' || change.change_type === 'improved'
                                                ? 'bg-success'
                                                : change.change_type === 'removed'
                                                    ? 'bg-danger'
                                                    : 'bg-warning text-dark'
                                            }`}>
                                            {change.change_type}
                                        </span>
                                        <span className="text-light small">{change.description}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="card glassmorphic-card p-4 shadow-sm border-0">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 className="h4 mb-1 fw-bold">Resume Version Comparison</h3>
                    <p className="text-muted mb-0 small">Semantic diffing to highlight meaningful improvements.</p>
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-md-6">
                    <label htmlFor="textV1" className="form-label text-light fw-semibold">Version 1 (Original)</label>
                    <textarea
                        id="textV1"
                        className="form-control bg-dark text-light border-secondary font-monospace small"
                        rows={8}
                        value={textV1}
                        onChange={(e) => setTextV1(e.target.value)}
                        placeholder="Paste original resume text here..."
                    />
                </div>
                <div className="col-md-6">
                    <label htmlFor="textV2" className="form-label text-light fw-semibold">Version 2 (Updated)</label>
                    <textarea
                        id="textV2"
                        className="form-control bg-dark text-light border-secondary font-monospace small"
                        rows={8}
                        value={textV2}
                        onChange={(e) => setTextV2(e.target.value)}
                        placeholder="Paste updated resume text here..."
                    />
                </div>
            </div>

            <button
                className="btn btn-primary w-100 mb-4 d-flex align-items-center justify-content-center"
                onClick={handleCompare}
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Analyzing Semantic Differences...
                    </>
                ) : (
                    <>
                        <i className="bi bi-file-earmark-diff me-2"></i>
                        Compare Resumes
                    </>
                )}
            </button>

            {error && (
                <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                </div>
            )}

            {diffData && (
                <>
                    {renderSummaryDashboard()}
                    {renderDetailedChanges()}
                </>
            )}
        </div>
    );
};

export default ResumeDiffViewer;
