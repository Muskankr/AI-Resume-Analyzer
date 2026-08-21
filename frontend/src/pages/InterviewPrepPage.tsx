import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PlayCircle, Target, ArrowRight, ArrowLeft, CheckCircle, RefreshCcw } from 'lucide-react';
import axios from 'axios';
import { Footer } from '../Footer';
import './InterviewPrep.css';

interface Question {
    id: number;
    text: string;
    type: string;
    skill: string | null;
    suggestions: string[];
}

interface InterviewSession {
    session_id: number;
    target_role: string;
    questions: Question[];
}

export const InterviewPrepPage: React.FC = () => {
    const { user } = useAuth();
    const [session, setSession] = useState<InterviewSession | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [ratings, setRatings] = useState<Record<number, number>>({});
    const [isFinished, setIsFinished] = useState(false);
    const [overallScore, setOverallScore] = useState<number | null>(null);

    const startSession = async () => {
        setLoading(true);
        try {
            const response = await axios.post(
                'http://localhost:8000/api/interview/generate/',
                {},
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
                }
            );
            setSession(response.data);
            setCurrentIndex(0);
            setShowAnswer(false);
            setRatings({});
            setIsFinished(false);
            setOverallScore(null);
        } catch (error) {
            console.error('Error starting session:', error);
        } finally {
            setLoading(false);
        }
    };

    const currentQ = session?.questions[currentIndex];

    const handleRate = (score: number) => {
        if (!currentQ) return;
        setRatings(prev => ({ ...prev, [currentQ.id]: score }));
    };

    const nextQuestion = () => {
        if (session && currentIndex < session.questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setShowAnswer(false);
        } else {
            finishSession();
        }
    };

    const prevQuestion = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setShowAnswer(false);
        }
    };

    const finishSession = async () => {
        if (!session) return;
        setLoading(true);
        const results = Object.entries(ratings).map(([qId, conf]) => ({
            question_id: parseInt(qId),
            confidence: conf
        }));

        try {
            const response = await axios.post(
                `http://localhost:8000/api/interview/${session.session_id}/submit/`,
                { results },
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
                }
            );
            setOverallScore(response.data.overall_score);
            setIsFinished(true);
        } catch (error) {
            console.error('Error finishing session:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="interview-prep-page min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 flex items-center gap-3">
                            <PlayCircle className="text-blue-400" size={32} />
                            AI Interview Simulation
                        </h1>
                        <p className="text-slate-400 mt-2">Practice for your next role based on your resume profile.</p>
                    </div>
                </div>

                {!session && !loading && (
                    <div className="glass-panel p-12 text-center rounded-2xl max-w-2xl mx-auto flex flex-col items-center">
                        <Target className="text-blue-500 mb-6" size={64} />
                        <h2 className="text-2xl font-semibold mb-4 text-white">Ready for your Interview?</h2>
                        <p className="text-slate-300 mb-8 whitespace-pre-line">
                            We'll generate customized Technical, Behavioral, and Situational questions
                            based on the skills found in your latest resume analysis.
                        </p>
                        <button
                            onClick={startSession}
                            className="app-btn px-8 py-3 rounded-full text-lg flex items-center gap-2"
                        >
                            Start Simulation <PlayCircle size={20} />
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
                    </div>
                )}

                {session && !isFinished && !loading && currentQ && (
                    <div className="max-w-3xl mx-auto">
                        <div className="flex justify-between items-center mb-4 text-slate-400 font-medium">
                            <span>Goal: {session.target_role}</span>
                            <span>Question {currentIndex + 1} of {session.questions.length}</span>
                        </div>

                        {/* Flashcard */}
                        <div className={`flashcard ${showAnswer ? 'flipped' : ''} mb-8`}>
                            <div className="flashcard-inner">
                                {/* Front (Question) */}
                                <div className="flashcard-face flashcard-front glass-panel rounded-2xl p-8 flex flex-col justify-center relative">
                                    <span className={`absolute top-4 left-4 text-xs uppercase tracking-wider font-bold px-3 py-1 rounded-full ${currentQ.type === 'technical' ? 'bg-blue-500/20 text-blue-300' :
                                            currentQ.type === 'behavioral' ? 'bg-purple-500/20 text-purple-300' : 'bg-green-500/20 text-green-300'
                                        }`}>
                                        {currentQ.type}
                                    </span>

                                    {currentQ.skill && (
                                        <span className="absolute top-4 right-4 text-xs font-mono text-slate-400">
                                            Target: {currentQ.skill}
                                        </span>
                                    )}

                                    <h3 className="text-2xl mt-4 font-semibold text-white leading-relaxed text-center">
                                        "{currentQ.text}"
                                    </h3>

                                    <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                                        <button
                                            onClick={() => setShowAnswer(true)}
                                            className="app-btn-outline px-6 py-2 rounded-full text-sm"
                                        >
                                            Show Suggested Answer Points
                                        </button>
                                    </div>
                                </div>

                                {/* Back (Answer/Hints) */}
                                <div className="flashcard-face flashcard-back glass-panel rounded-2xl p-8 flex flex-col">
                                    <h4 className="text-lg font-semibold text-blue-400 mb-4 border-b border-white/10 pb-2">
                                        Key Points to Mention:
                                    </h4>
                                    <ul className="space-y-3 mb-auto text-slate-300">
                                        {currentQ.suggestions.map((s, idx) => (
                                            <li key={idx} className="flex items-start gap-3">
                                                <CheckCircle size={20} className="text-green-400 shrink-0 mt-0.5" />
                                                <span>{s}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="mt-8">
                                        <p className="text-center text-sm text-slate-400 mb-3">How confident are you with your real answer?</p>
                                        <div className="flex justify-between items-center max-w-sm mx-auto">
                                            <span className="text-xs text-slate-500">Poor</span>
                                            {[1, 2, 3, 4, 5].map(val => {
                                                const score = val * 2;
                                                return (
                                                    <button
                                                        key={val}
                                                        onClick={() => handleRate(score)}
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${ratings[currentQ.id] === score
                                                                ? 'bg-blue-500 text-white'
                                                                : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {score}
                                                    </button>
                                                );
                                            })}
                                            <span className="text-xs text-slate-500">Great</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex justify-between mt-8">
                            <button
                                onClick={prevQuestion}
                                disabled={currentIndex === 0}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${currentIndex === 0 ? 'opacity-50 cursor-not-allowed text-slate-500' : 'app-btn-outline'
                                    }`}
                            >
                                <ArrowLeft size={20} /> Previous
                            </button>

                            <button
                                onClick={nextQuestion}
                                className="app-btn px-6 py-3 rounded-xl font-medium flex items-center gap-2"
                            >
                                {currentIndex === session.questions.length - 1 ? 'Finish' : 'Next Question'}
                                {currentIndex !== session.questions.length - 1 && <ArrowRight size={20} />}
                            </button>
                        </div>
                    </div>
                )}

                {isFinished && (
                    <div className="glass-panel p-12 text-center rounded-2xl max-w-2xl mx-auto flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-green-400 to-blue-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(74,222,128,0.3)]">
                            <span className="text-4xl font-bold text-white">{overallScore || 0}</span>
                        </div>
                        <h2 className="text-3xl font-bold mb-2 text-white">Interview Complete!</h2>
                        <p className="text-slate-300 text-lg mb-8">
                            Your overall confidence score is {overallScore}/10. Keep practicing to build confidence across all skill areas.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={startSession}
                                className="app-btn px-6 py-3 rounded-xl flex items-center gap-2 font-medium"
                            >
                                <RefreshCcw size={20} /> Start New Session
                            </button>
                            <button className="app-btn-outline px-6 py-3 rounded-xl font-medium">
                                View Full Analysis
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
};
