import React, { useState } from 'react';
import axios from 'axios';
import './SalaryMarketEstimator.css';

interface SalaryRange {
    min: number;
    max: number;
    median: number;
    currency: string;
}

interface MarketResponse {
    salary_range: SalaryRange;
    value_driving_skills: string[];
    negotiation_talking_points: string[];
}

const SalaryMarketEstimator: React.FC = () => {
    const [role, setRole] = useState('');
    const [level, setLevel] = useState('mid');
    const [skillsInput, setSkillsInput] = useState('');
    const [results, setResults] = useState<MarketResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleEstimate = async () => {
        if (!role.trim()) {
            setError('Please enter a target role.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const skillsArray = skillsInput.split(',').map(s => s.trim()).filter(Boolean);
            const response = await axios.post('/api/estimate-market-value/', {
                target_role: role,
                experience_level: level,
                skills: skillsArray
            });
            setResults(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to estimate market value.');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="market-estimator-container">
            <h2 className="estimator-title">Market Value & Salary Estimator</h2>

            <div className="estimator-workspace">
                <div className="input-panel glass-card">
                    <h3>Profile Details</h3>

                    <div className="form-group">
                        <label htmlFor="role">Target Role</label>
                        <input
                            id="role"
                            type="text"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            placeholder="e.g., Software Engineer, Data Scientist"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="level">Experience Level</label>
                        <select
                            id="level"
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                        >
                            <option value="entry">Entry Level (0-2 years)</option>
                            <option value="mid">Mid Level (3-5 years)</option>
                            <option value="senior">Senior Level (5-8 years)</option>
                            <option value="lead">Lead / Principal (8+ years)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="skills">Key Skills (comma-separated)</label>
                        <input
                            id="skills"
                            type="text"
                            value={skillsInput}
                            onChange={(e) => setSkillsInput(e.target.value)}
                            placeholder="Python, AWS, Leadership, System Design..."
                        />
                    </div>

                    <button
                        className="estimate-btn glass-button"
                        onClick={handleEstimate}
                        disabled={loading}
                    >
                        {loading ? 'Calculating...' : 'Estimate Market Value'}
                    </button>

                    {error && <p className="error-message">{error}</p>}
                </div>

                <div className="results-panel glass-card">
                    <h3>Compensation Insights</h3>

                    {!results && !loading && (
                        <div className="empty-state">
                            <p>Enter your profile details to see estimated salary ranges and negotiation strategies.</p>
                        </div>
                    )}

                    {loading && <div className="loading-state">Analyzing market data...</div>}

                    {results && !loading && (
                        <div className="results-content">
                            <div className="salary-visualization">
                                <div className="salary-labels">
                                    <span>Min: {formatCurrency(results.salary_range.min, results.salary_range.currency)}</span>
                                    <span className="median-label">Median: {formatCurrency(results.salary_range.median, results.salary_range.currency)}</span>
                                    <span>Max: {formatCurrency(results.salary_range.max, results.salary_range.currency)}</span>
                                </div>
                                <div className="salary-bar-container">
                                    <div className="salary-bar-bg">
                                        <div
                                            className="salary-bar-fill"
                                            style={{
                                                left: '15%',
                                                right: '15%'
                                            }}
                                        >
                                            <div className="median-marker"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {results.value_driving_skills.length > 0 && (
                                <div className="value-skills-section">
                                    <h4>🚀 Value-Driving Skills Detected</h4>
                                    <div className="skills-tags">
                                        {results.value_driving_skills.map((skill, idx) => (
                                            <span key={idx} className="skill-tag">{skill}</span>
                                        ))}
                                    </div>
                                    <p className="skills-note">These skills significantly increase your market value.</p>
                                </div>
                            )}

                            <div className="negotiation-section">
                                <h4>💡 Negotiation Talking Points</h4>
                                <ul className="negotiation-list">
                                    {results.negotiation_talking_points.map((point, idx) => (
                                        <li key={idx}>{point}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalaryMarketEstimator;
