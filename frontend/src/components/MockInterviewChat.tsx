import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './MockInterviewChat.css';

interface Question {
    id: string;
    category: string;
    question: string;
}

interface Evaluation {
    score: number;
    feedback: string;
    strengths: string[];
    areas_for_improvement: string[];
}

interface ChatMessage {
    type: 'bot' | 'user' | 'evaluation';
    content: string | Evaluation;
    questionId?: string;
    questionText?: string;
}

const MockInterviewChat: React.FC = () => {
    const [resumeText, setResumeText] = useState<string>('');
    const [jobDescription, setJobDescription] = useState<string>('');
    const [targetRole, setTargetRole] = useState<string>('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [userAnswer, setUserAnswer] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [interviewStarted, setInterviewStarted] = useState<boolean>(false);

    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    /**
     * Initiates the mock interview session.
     */
    const handleStartInterview = async () => {
        if (!resumeText.trim() || !jobDescription.trim() || !targetRole.trim()) {
            setError('Please fill in all fields to start the interview.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.post<{ session_id: string; questions: Question[] }>('/api/start-interview/', {
                resume_text: resumeText,
                job_description: jobDescription,
                target_role: targetRole
            });

            setSessionId(response.data.session_id);
            setQuestions(response.data.questions);
            setInterviewStarted(true);

            // Add first question to chat
            setMessages([
                {
                    type: 'bot',
                    content: `Welcome to your mock interview for the ${targetRole} position! Let's begin with the first question.`
                },
                {
                    type: 'bot',
                    content: response.data.questions[0].question,
                    questionId: response.data.questions[0].id,
                    questionText: response.data.questions[0].question
                }
            ]);
            setCurrentQuestionIndex(0);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to start interview. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Submits the user's answer for evaluation.
     */
    const handleSubmitAnswer = async () => {
        if (!userAnswer.trim() || !sessionId || !questions[currentQuestionIndex]) return;

        setLoading(true);
        const currentQ = questions[currentQuestionIndex];

        // Add user message to chat
        setMessages(prev => [...prev, { type: 'user', content: userAnswer }]);
        setUserAnswer(''); // Clear input

        try {
            const response = await axios.post<Evaluation>('/api/submit-answer/', {
                session_id: sessionId,
                question_id: currentQ.id,
                question_text: currentQ.question,
                answer_text: userAnswer
            });

            // Add evaluation to chat
            setMessages(prev => [...prev, { type: 'evaluation', content: response.data }]);

            // Move to next question or end interview
            if (currentQuestionIndex < questions.length - 1) {
                const nextIndex = currentQuestionIndex + 1;
                setCurrentQuestionIndex(nextIndex);
                setTimeout(() => {
                    setMessages(prev => [...prev, {
                        type: 'bot',
                        content: questions[nextIndex].question,
                        questionId: questions[nextIndex].id,
                        questionText: questions[nextIndex].question
                    }]);
                }, 1500);
            } else {
                setMessages(prev => [...prev, {
                    type: 'bot',
                    content: "Congratulations! You've completed the mock interview. Review your evaluations above to see areas for improvement."
                }]);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to evaluate answer. Please try again.');
            // Re-add the user answer if it failed so they can retry
            setMessages(prev => [...prev, { type: 'user', content: userAnswer }]);
        } finally {
            setLoading(false);
        }
    };

    if (!interviewStarted) {
        return (
            <div className="mock-interview-container">
                <h2 className="interview-title">Mock Interview Simulator</h2>
                <div className="setup-panel glass-card">
                    <h3>Interview Setup</h3>
                    <div className="form-group">
                        <label htmlFor="targetRole">Target Role</label>
                        <input
                            id="targetRole"
                            type="text"
                            value={targetRole}
                            onChange={(e) => setTargetRole(e.target.value)}
                            placeholder="e.g., Senior Software Engineer"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="resumeText">Your Resume Text</label>
                        <textarea
                            id="resumeText"
                            value={resumeText}
                            onChange={(e) => setResumeText(e.target.value)}
                            placeholder="Paste your resume text here..."
                            rows={4}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="jobDescription">Target Job Description</label>
                        <textarea
                            id="jobDescription"
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="Paste the job description here..."
                            rows={4}
                        />
                    </div>
                    <button
                        className="start-btn glass-button"
                        onClick={handleStartInterview}
                        disabled={loading}
                    >
                        {loading ? 'Preparing Interview...' : 'Start Mock Interview'}
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="mock-interview-container active">
            <h2 className="interview-title">Mock Interview: {targetRole}</h2>

            <div className="interview-workspace">
                <div className="chat-panel glass-card">
                    <div className="chat-header">
                        <h3>Interview Chat</h3>
                        <span className="progress-indicator">Question {currentQuestionIndex + 1} of {questions.length}</span>
                    </div>

                    <div className="chat-messages">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message ${msg.type}`}>
                                {msg.type === 'bot' && (
                                    <div className="message-content">
                                        <span className="bot-avatar">🤖</span>
                                        <p>{msg.content as string}</p>
                                    </div>
                                )}

                                {msg.type === 'user' && (
                                    <div className="message-content">
                                        <p>{msg.content as string}</p>
                                        <span className="user-avatar">👤</span>
                                    </div>
                                )}

                                {msg.type === 'evaluation' && (
                                    <div className="evaluation-card">
                                        <div className="eval-header">
                                            <span className="eval-title">📊 Feedback</span>
                                            <span className="eval-score" style={{ color: (msg.content as Evaluation).score >= 70 ? '#2ed573' : '#ffa502' }}>
                                                Score: {(msg.content as Evaluation).score}/100
                                            </span>
                                        </div>
                                        <p className="eval-feedback">{(msg.content as Evaluation).feedback}</p>

                                        <div className="eval-details">
                                            <div className="eval-section">
                                                <h5>✅ Strengths</h5>
                                                <ul>
                                                    {(msg.content as Evaluation).strengths.map((s, i) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                            <div className="eval-section">
                                                <h5>🎯 Areas for Improvement</h5>
                                                <ul>
                                                    {(msg.content as Evaluation).areas_for_improvement.map((a, i) => <li key={i}>{a}</li>)}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {currentQuestionIndex < questions.length && (
                        <div className="chat-input-area">
                            <textarea
                                className="answer-input"
                                value={userAnswer}
                                onChange={(e) => setUserAnswer(e.target.value)}
                                placeholder="Type your answer here... (Tip: Use the STAR method!)"
                                rows={3}
                                disabled={loading}
                            />
                            <button
                                className="submit-btn glass-button"
                                onClick={handleSubmitAnswer}
                                disabled={loading || !userAnswer.trim()}
                            >
                                {loading ? 'Evaluating...' : 'Submit Answer'}
                            </button>
                        </div>
                    )}
                    {error && <p className="error-message">{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default MockInterviewChat;
