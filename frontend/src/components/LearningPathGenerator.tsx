import React, { useState } from 'react';
import axios from 'axios';
import './LearningPathGenerator.css';

interface Resource {
    title: string;
    type: string;
    provider: string;
    duration: string;
    url: string;
}

interface SkillGap {
    skill: string;
    priority: string;
    estimated_time: string;
    resources: Resource[];
}

interface LearningPathResponse {
    total_missing_skills: number;
    learning_path: SkillGap[];
}

const LearningPathGenerator: React.FC = () => {
    const [resumeText, setResumeText] = useState<string>('');
    const [jobDescription, setJobDescription] = useState<string>('');
    const [results, setResults] = useState<LearningPathResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    /**
     * Handles the API request to generate a learning path.
     */
    const handleGenerate = async () => {
        if (!resumeText.trim() || !jobDescription.trim()) {
            setError('Please provide both your resume and the target job description.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.post<LearningPathResponse>('/api/generate-learning-path/', {
                resume_text: resumeText,
                job_description: jobDescription
            });
            setResults(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to generate learning path. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="learning-path-container">
            <h2 className="path-title">Skill Gap Learning Path Generator</h2>

            <div className="path-workspace">
                {/* Input Section */}
                <div className="input-panel glass-card">
                    <h3>Compare Resume & Job Description</h3>

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

                    <button
                        className="generate-btn glass-button"
                        onClick={handleGenerate}
                        disabled={loading}
                    >
                        {loading ? 'Generating Path...' : 'Generate Learning Path'}
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </div>

                {/* Results Section */}
                <div className="results-panel glass-card">
                    <h3>Your Personalized Learning Roadmap</h3>

                    {!results && !loading && (
                        <div className="empty-state">
                            <p>Submit your documents to identify missing skills and get a curated list of learning resources.</p>
                        </div>
                    )}

                    {loading && <div className="loading-state">Analyzing skill gaps and curating resources...</div>}

                    {results && !loading && (
                        <div className="results-content">
                            {results.total_missing_skills === 0 ? (
                                <div className="no-gaps">
                                    🎉 Fantastic! Your resume already contains all the key skills mentioned in the job description.
                                </div>
                            ) : (
                                <div className="roadmap-timeline">
                                    {results.learning_path.map((gap, index) => (
                                        <div key={index} className="timeline-item">
                                            <div className="timeline-node">
                                                <span className="node-number">{index + 1}</span>
                                            </div>
                                            <div className="timeline-content glass-card-inner">
                                                <div className="skill-header">
                                                    <h4>Master: {gap.skill}</h4>
                                                    <span className={`priority-badge ${gap.priority.toLowerCase()}`}>
                                                        {gap.priority} Priority
                                                    </span>
                                                </div>
                                                <p className="estimated-time">⏱️ Estimated Time: {gap.estimated_time}</p>

                                                <div className="resources-list">
                                                    <h5>Recommended Resources:</h5>
                                                    <div className="resource-cards">
                                                        {gap.resources.map((resource, rIdx) => (
                                                            <a
                                                                key={rIdx}
                                                                href={resource.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="resource-card"
                                                            >
                                                                <div className="resource-type">{resource.type}</div>
                                                                <h6>{resource.title}</h6>
                                                                <div className="resource-meta">
                                                                    <span>{resource.provider}</span>
                                                                    <span>•</span>
                                                                    <span>{resource.duration}</span>
                                                                </div>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LearningPathGenerator;
