import React, { useState } from 'react';
import axios from 'axios';
import './LinkedInOptimizer.css';

interface Experience {
    title: string;
    company: string;
    description: string;
    original_description: string;
}

interface LinkedInData {
    headline: string;
    about: string;
    experiences: Experience[];
    skills: string[];
    limits: Record<string, number>;
}

const LinkedInOptimizer: React.FC = () => {
    const [targetRole, setTargetRole] = useState('');
    const [summary, setSummary] = useState('');
    const [skillsInput, setSkillsInput] = useState('');
    const [experiencesInput, setExperiencesInput] = useState('');
    const [optimizedData, setOptimizedData] = useState<LinkedInData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleOptimize = async () => {
        setLoading(true);
        setError('');
        try {
            const skillsArray = skillsInput.split(',').map(s => s.trim()).filter(Boolean);
            const experiencesArray = experiencesInput.split('\n\n').map(exp => {
                const lines = exp.split('\n');
                return {
                    title: lines[0] || 'Professional',
                    company: lines[1] || 'Company',
                    description: lines.slice(2).join(' ')
                };
            }).filter(exp => exp.title !== 'Professional' || exp.description);

            const response = await axios.post('/api/optimize-linkedin/', {
                target_role: targetRole,
                summary,
                skills: skillsArray,
                experiences: experiencesArray
            });

            setOptimizedData(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to optimize profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Optional: Add a toast notification here
    };

    return (
        <div className="linkedin-optimizer-container">
            <h2 className="optimizer-title">LinkedIn Profile Optimizer</h2>

            <div className="optimizer-inputs glass-card">
                <div className="input-group">
                    <label htmlFor="targetRole">Target Role</label>
                    <input
                        id="targetRole"
                        type="text"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        placeholder="e.g., Senior Software Engineer"
                    />
                </div>

                <div className="input-group">
                    <label htmlFor="summary">Current Summary / About</label>
                    <textarea
                        id="summary"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="Paste your current LinkedIn About section or resume summary..."
                        rows={4}
                    />
                </div>

                <div className="input-group">
                    <label htmlFor="skills">Skills (comma separated)</label>
                    <input
                        id="skills"
                        type="text"
                        value={skillsInput}
                        onChange={(e) => setSkillsInput(e.target.value)}
                        placeholder="Python, React, Project Management..."
                    />
                </div>

                <div className="input-group">
                    <label htmlFor="experiences">Experiences (Format: Title\nCompany\nDescription, separated by blank lines)</label>
                    <textarea
                        id="experiences"
                        value={experiencesInput}
                        onChange={(e) => setExperiencesInput(e.target.value)}
                        placeholder="Software Engineer&#10;Tech Corp&#10;Developed features..."
                        rows={6}
                    />
                </div>

                <button
                    className="optimize-btn glass-button"
                    onClick={handleOptimize}
                    disabled={loading}
                >
                    {loading ? 'Optimizing...' : 'Generate Optimized Profile'}
                </button>

                {error && <p className="error-message">{error}</p>}
            </div>

            {optimizedData && (
                <div className="optimizer-results">
                    <div className="result-section glass-card">
                        <div className="section-header">
                            <h3>Headline <span className="char-count">{optimizedData.headline.length}/{optimizedData.limits.headline}</span></h3>
                            <button className="copy-btn" onClick={() => copyToClipboard(optimizedData.headline)}>Copy</button>
                        </div>
                        <p className="result-text">{optimizedData.headline}</p>
                    </div>

                    <div className="result-section glass-card">
                        <div className="section-header">
                            <h3>About <span className="char-count">{optimizedData.about.length}/{optimizedData.limits.about}</span></h3>
                            <button className="copy-btn" onClick={() => copyToClipboard(optimizedData.about)}>Copy</button>
                        </div>
                        <p className="result-text">{optimizedData.about}</p>
                    </div>

                    <div className="result-section glass-card">
                        <div className="section-header">
                            <h3>Experiences</h3>
                        </div>
                        {optimizedData.experiences.map((exp, idx) => (
                            <div key={idx} className="experience-item">
                                <h4>{exp.title} at {exp.company}</h4>
                                <div className="exp-comparison">
                                    <div className="exp-col original">
                                        <span className="col-label">Original</span>
                                        <p>{exp.original_description || 'N/A'}</p>
                                    </div>
                                    <div className="exp-col optimized">
                                        <span className="col-label">Optimized</span>
                                        <p>{exp.description}</p>
                                        <button className="copy-btn-small" onClick={() => copyToClipboard(exp.description)}>Copy</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="result-section glass-card">
                        <div className="section-header">
                            <h3>Skills <span className="char-count">{optimizedData.skills.length}/{optimizedData.limits.skills} max</span></h3>
                            <button className="copy-btn" onClick={() => copyToClipboard(optimizedData.skills.join(', '))}>Copy All</button>
                        </div>
                        <div className="skills-grid">
                            {optimizedData.skills.map((skill, idx) => (
                                <span key={idx} className="skill-chip">{skill}</span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LinkedInOptimizer;