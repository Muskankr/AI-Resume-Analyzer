/**
 * Interactive UI component featuring a side-by-side diff viewer, 
 * allowing users to paste, select, and apply AI-suggested rewrites.
 */
import React, { useState } from 'react';
import { optimizeBullets, type BulletAnalysisResult, saveDraftToLocal } from '../services/bulletOptimizationService';

interface BulletPointOptimizerProps {
    targetRole?: string;
    initialJobDescription?: string;
}

const BulletPointOptimizer: React.FC<BulletPointOptimizerProps> = ({ targetRole, initialJobDescription = '' }: BulletPointOptimizerProps) => {
    const [inputText, setInputText] = useState<string>('');
    const [jobDescription, setJobDescription] = useState<string>(initialJobDescription);
    const [results, setResults] = useState<BulletAnalysisResult[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleOptimize = async () => {
        if (!inputText.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            const bullets = inputText.split('\n').filter(b => b.trim().length > 0);
            const response = await optimizeBullets(bullets, targetRole, jobDescription);
            setResults(response.results);
        } catch (err) {
            setError('Failed to optimize bullet points. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyRewrite = (index: number, rewrite: string) => {
        const newResults = [...results];
        newResults[index].original = rewrite;
        setResults(newResults);
        saveDraftToLocal(index, results[index].original, rewrite);
    };

    return (
        <div className="card glassmorphic-card p-4 mb-4">
            <h3 className="h5 mb-2 text-primary">Bullet Point Optimizer (STAR Method)</h3>
            <p className="text-muted small mb-3">
                💡 <strong>Review & Edit:</strong> These are AI-assisted suggestions tailored to mirror the Job Description's keywords and priorities without fabricating experience. Review and edit them before applying.
            </p>

            <div className="mb-3">
                <label htmlFor="bulletInput" className="form-label">Paste your resume bullet points (one per line):</label>
                <textarea
                    id="bulletInput"
                    className="form-control bg-dark text-light border-secondary mb-3"
                    rows={4}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="e.g., Managed a team of developers."
                />
            </div>

            <div className="mb-3">
                <label htmlFor="jdInput" className="form-label">Paste Target Job Description (optional, for tailoring):</label>
                <textarea
                    id="jdInput"
                    className="form-control bg-dark text-light border-secondary"
                    rows={4}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here to tailor suggested rewrites to its requirements..."
                />
            </div>

            <button
                className="btn btn-primary w-100 mb-4"
                onClick={handleOptimize}
                disabled={isLoading || !inputText.trim()}
            >
                {isLoading ? (
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                ) : null}
                {isLoading ? 'Analyzing & Tailoring...' : 'Optimize Bullet Points'}
            </button>

            {error && <div className="alert alert-danger">{error}</div>}

            {results.length > 0 && (
                <div className="optimization-results">
                    <h4 className="h6 mb-3 text-success">Optimization Results</h4>
                    {results.map((result, index) => (
                        <div key={index} className="card mb-3 bg-dark border-secondary">
                            <div className="card-body">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="badge bg-secondary">Score: {result.score}/100</span>
                                    {result.is_passive && <span className="badge bg-warning text-dark">Passive Voice</span>}
                                    {!result.has_metric && <span className="badge bg-info text-dark">Missing Metric</span>}
                                </div>

                                <p className="text-muted mb-2"><strong>Original:</strong> {result.original}</p>

                                {result.suggestions.length > 0 && (
                                    <ul className="text-warning small mb-2">
                                        {result.suggestions.map((sugg, i) => <li key={i}>{sugg}</li>)}
                                    </ul>
                                )}

                                <div className="mt-3">
                                    <strong className="text-success d-block mb-2">Suggested Rewrites:</strong>
                                    {result.rewrites.map((rewrite, i) => (
                                        <div key={i} className="d-flex align-items-start mb-2 p-2 border border-success rounded bg-opacity-10 bg-success">
                                            <p className="mb-0 flex-grow-1 text-success">{rewrite}</p>
                                            <button
                                                className="btn btn-sm btn-outline-success ms-2"
                                                onClick={() => handleApplyRewrite(index, rewrite)}
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BulletPointOptimizer;
