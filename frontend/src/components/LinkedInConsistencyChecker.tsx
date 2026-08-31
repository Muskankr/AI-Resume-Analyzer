import React, { useState } from 'react';
import './LinkedInConsistencyChecker.css';
import { api } from '../api/client';

interface Mismatch {
    type: string;
    resume_evidence: string;
    linkedin_evidence: string;
    message: string;
}

interface ConsistencyData {
    mismatches: Mismatch[];
    resume_roles_found: number;
    linkedin_roles_found: number;
}

const LinkedInConsistencyChecker: React.FC = () => {
    const [resumeText, setResumeText] = useState('');
    const [linkedinText, setLinkedinText] = useState('');
    const [linkedinUrl, setLinkedinUrl] = useState('');
    const [resultData, setResultData] = useState<ConsistencyData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCheck = async () => {
        setLoading(true);
        setError('');
        setResultData(null);
        try {
            const response = await api.post('/api/check-linkedin-consistency/', {
                resume_text: resumeText,
                linkedin_text: linkedinText,
                linkedin_url: linkedinUrl
            });

            setResultData(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to check consistency. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="consistency-checker-container">
            <h2 className="checker-title">LinkedIn Profile Consistency Checker</h2>

            <div className="checker-inputs glass-card">
                <div className="input-group">
                    <label htmlFor="resumeText">Resume Text</label>
                    <textarea
                        id="resumeText"
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        placeholder="Paste your resume text here..."
                        rows={6}
                    />
                </div>

                <div className="input-group">
                    <label htmlFor="linkedinUrl">LinkedIn Public Profile URL (Optional)</label>
                    <input
                        id="linkedinUrl"
                        type="url"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="https://www.linkedin.com/in/username"
                    />
                </div>

                <div className="input-group">
                    <label htmlFor="linkedinText">Or Paste LinkedIn Profile Text</label>
                    <textarea
                        id="linkedinText"
                        value={linkedinText}
                        onChange={(e) => setLinkedinText(e.target.value)}
                        placeholder="Paste your LinkedIn profile text or 'Experience' section here..."
                        rows={6}
                    />
                </div>

                <button
                    className="check-btn glass-button"
                    onClick={handleCheck}
                    disabled={loading || !resumeText || (!linkedinText && !linkedinUrl)}
                >
                    {loading ? 'Checking Consistency...' : 'Check Consistency'}
                </button>

                {error && <p className="error-message">{error}</p>}
            </div>

            {resultData && (
                <div className="checker-results">
                    <div className="result-section glass-card">
                        <div className="section-header">
                            <h3>Consistency Report</h3>
                        </div>
                        
                        <p style={{marginBottom: '20px', fontSize: '1.1rem'}}>
                            Found <strong>{resultData.resume_roles_found}</strong> roles on resume and <strong>{resultData.linkedin_roles_found}</strong> roles on LinkedIn.
                        </p>

                        {resultData.mismatches.length === 0 ? (
                            <div style={{padding: '20px', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', borderRadius: '8px', textAlign: 'center'}}>
                                🎉 Great job! No major inconsistencies found between your resume and LinkedIn profile.
                            </div>
                        ) : (
                            resultData.mismatches.map((mismatch, idx) => (
                                <div key={idx} className="mismatch-item">
                                    <h4>⚠️ {mismatch.type}</h4>
                                    
                                    {(mismatch.resume_evidence || mismatch.linkedin_evidence) && (
                                        <div className="mismatch-comparison">
                                            {mismatch.resume_evidence && (
                                                <div className="mismatch-col">
                                                    <span className="col-label">On Resume</span>
                                                    <p>{mismatch.resume_evidence}</p>
                                                </div>
                                            )}
                                            {mismatch.linkedin_evidence && (
                                                <div className="mismatch-col">
                                                    <span className="col-label">On LinkedIn</span>
                                                    <p>{mismatch.linkedin_evidence}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <p className="mismatch-message">{mismatch.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LinkedInConsistencyChecker;
