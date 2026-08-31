/**
 * Interactive flashcard-style UI for displaying, filtering by category, 
 * and practicing the generated questions. Supports glassmorphic theme.
 */
import React, { useState } from 'react';
import { useInterviewQuestions } from '../hooks/useInterviewQuestions';

interface InterviewPrepModuleProps {
    resumeText: string;
    skills: string[];
    jobDescription: string;
}

const InterviewPrepModule: React.FC<InterviewPrepModuleProps> = ({
    resumeText,
    skills,
    jobDescription
}) => {
    const { data, isLoading, error, generateQuestions, updateQuestionState } = useInterviewQuestions();

    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [revealedGuidelines, setRevealedGuidelines] = useState<Set<string>>(new Set());

    const handleGenerate = () => {
        generateQuestions(resumeText, skills, jobDescription);
        setRevealedGuidelines(new Set());
        setActiveCategory('All');
    };

    const toggleGuideline = (id: string) => {
        const newRevealed = new Set(revealedGuidelines);
        if (newRevealed.has(id)) {
            newRevealed.delete(id);
        } else {
            newRevealed.add(id);
        }
        setRevealedGuidelines(newRevealed);
    };

    const filteredQuestions = data?.questions.filter(q =>
        activeCategory === 'All' || q.category === activeCategory
    ) || [];

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Easy': return 'bg-success';
            case 'Medium': return 'bg-warning text-dark';
            case 'Hard': return 'bg-danger';
            default: return 'bg-secondary';
        }
    };

    return (
        <div className="card glassmorphic-card p-4 shadow-sm border-0 mb-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 className="h4 mb-1 fw-bold">Interview Prep Generator</h3>
                    <p className="text-muted mb-0 small">Tailored questions based on your resume and job description gaps.</p>
                </div>
                <button
                    className="btn btn-primary d-flex align-items-center"
                    onClick={handleGenerate}
                    disabled={isLoading || !resumeText || !jobDescription}
                >
                    {isLoading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Generating...
                        </>
                    ) : (
                        <>
                            <i className="bi bi-magic me-2"></i>
                            Generate Questions
                        </>
                    )}
                </button>
            </div>

            {error && (
                <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                </div>
            )}

            {data && data.questions.length > 0 && (
                <>
                    <div className="d-flex gap-2 mb-4 flex-wrap">
                        <button
                            className={`btn btn-sm ${activeCategory === 'All' ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => setActiveCategory('All')}
                        >
                            All ({data.questions.length})
                        </button>
                        {data.categories.map(cat => (
                            <button
                                key={cat}
                                className={`btn btn-sm ${activeCategory === cat ? 'btn-primary' : 'btn-outline-secondary'}`}
                                onClick={() => setActiveCategory(cat)}
                            >
                                {cat} ({data.questions.filter(q => q.category === cat).length})
                            </button>
                        ))}
                    </div>

                    <div className="row g-3">
                        {filteredQuestions.map((q) => (
                            <div key={q.id} className="col-md-6">
                                <div className={`card h-100 bg-dark bg-opacity-50 border-secondary ${q.is_practiced ? 'border-success border-2' : ''}`}>
                                    <div className="card-body d-flex flex-column">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span className={`badge ${getDifficultyColor(q.difficulty)}`}>{q.difficulty}</span>
                                            <span className="badge bg-light text-dark">{q.category}</span>
                                        </div>

                                        <p className="card-text text-light fw-semibold flex-grow-1">{q.question}</p>

                                        <div className="mt-auto">
                                            {revealedGuidelines.has(q.id) && (
                                                <div className="alert alert-info bg-opacity-10 border-0 p-2 mt-2 mb-3">
                                                    <small className="text-info">
                                                        <i className="bi bi-lightbulb-fill me-1"></i>
                                                        <strong>Guidelines:</strong> {q.guidelines}
                                                    </small>
                                                </div>
                                            )}

                                            <div className="d-flex gap-2 mt-2">
                                                <button
                                                    className="btn btn-sm btn-outline-info flex-grow-1"
                                                    onClick={() => toggleGuideline(q.id)}
                                                >
                                                    {revealedGuidelines.has(q.id) ? 'Hide Guidelines' : 'Show Guidelines'}
                                                </button>
                                                <button
                                                    className={`btn btn-sm ${q.is_practiced ? 'btn-success' : 'btn-outline-success'}`}
                                                    onClick={() => updateQuestionState(q.id, { is_practiced: !q.is_practiced })}
                                                    title="Mark as practiced"
                                                >
                                                    <i className="bi bi-check-circle-fill"></i>
                                                </button>
                                                <button
                                                    className={`btn btn-sm ${q.is_saved ? 'btn-warning' : 'btn-outline-warning'}`}
                                                    onClick={() => updateQuestionState(q.id, { is_saved: !q.is_saved })}
                                                    title="Save for later"
                                                >
                                                    <i className="bi bi-bookmark-fill"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {!data && !isLoading && !error && (
                <div className="text-center text-muted py-5">
                    <i className="bi bi-chat-dots fs-1 d-block mb-3 opacity-50"></i>
                    <p>Click "Generate Questions" to create tailored interview prep based on your resume and target job.</p>
                </div>
            )}
        </div>
    );
};

export default InterviewPrepModule;
