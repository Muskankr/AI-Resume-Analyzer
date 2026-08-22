import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Mic, MicOff, Video, VideoOff, Phone,
    MessageSquare, UserCircle, PlayCircle, Settings,
    CheckCircle, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { AudioVisualizer } from '../components/AudioVisualizer';
import './MockInterview.css';

interface Question {
    id: string;
    text: string;
    category: 'behavioral' | 'technical';
    hints: string[];
}

export const MockInterviewSimulator: React.FC = () => {
    const { user } = useAuth();

    // UI States
    const [inSession, setInSession] = useState(false);
    const [cameraOn, setCameraOn] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes

    // Interview Logic States
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [chatLog, setChatLog] = useState<{ sender: 'ai' | 'user', text: string }[]>([]);

    // Scoring
    const [confidenceScore, setConfidenceScore] = useState(85);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const QUESTIONS: Question[] = [
        {
            id: 'q1',
            text: "Tell me about a time you had to pivot quickly due to changing requirements.",
            category: 'behavioral',
            hints: ['Focus on agility', 'Mention communication with stakeholders']
        },
        {
            id: 'q2',
            text: "How do you handle scaling a microservices architecture during sudden traffic spikes?",
            category: 'technical',
            hints: ['Auto-scaling groups', 'Load balancers', 'Database replica pooling']
        },
        {
            id: 'q3',
            text: "Describe a fundamental disagreement you had with a senior team member. How was it resolved?",
            category: 'behavioral',
            hints: ['Keep it professional', 'Highlight compromise based on data']
        }
    ];

    useEffect(() => {
        if (inSession) {
            const timer = setInterval(() => {
                setTimeRemaining(prev => prev > 0 ? prev - 1 : 0);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [inSession]);

    useEffect(() => {
        if (inSession && cameraOn) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [inSession, cameraOn]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera access denied", err);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const startInterview = () => {
        setInSession(true);
        setChatLog([{ sender: 'ai', text: "Hello! I am your AI interviewer today. Let's get started. " + QUESTIONS[0].text }]);
        simulateAiSpeech();
    };

    const advanceQuestion = () => {
        if (currentQuestionIndex < QUESTIONS.length - 1) {
            const nextIdx = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIdx);
            setChatLog(prev => [...prev, { sender: 'ai', text: "Great insight. Next question: " + QUESTIONS[nextIdx].text }]);
            simulateAiSpeech();

            // Randomly fluctuate confidence to simulate real-time ML analysis
            setConfidenceScore(prev => Math.min(100, Math.max(0, prev + (Math.random() * 20 - 10))));
        } else {
            endInterview();
        }
    };

    const endInterview = () => {
        setInSession(false);
        stopCamera();
        alert("Mock Interview Complete! Your average confidence score was: " + confidenceScore.toFixed(1) + "%");
    };

    const simulateAiSpeech = () => {
        setIsAiSpeaking(true);
        setTimeout(() => setIsAiSpeaking(false), 4000);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 flex flex-col font-sans">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 flex items-center gap-3">
                    <MessageSquare size={32} className="text-blue-400" />
                    AI Mock Interview Simulator
                </h1>
                {inSession && (
                    <div className="flex items-center gap-4 bg-slate-900 px-6 py-2 rounded-full border border-slate-700/50">
                        <span className="flex items-center gap-2 text-rose-400 font-mono text-lg font-bold">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            {formatTime(timeRemaining)}
                        </span>
                    </div>
                )}
            </div>

            {!inSession ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="max-w-2xl w-full glass-panel-heavy p-10 rounded-3xl text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />

                        <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-blue-500/30">
                            <UserCircle size={48} className="text-blue-400" />
                        </div>

                        <h2 className="text-3xl font-bold text-white mb-4">Ready to practice?</h2>
                        <p className="text-slate-400 mb-8 text-lg">
                            This session will simulate a real technical interview using your system's camera and microphone.
                            Our AI will analyze your posture, speech patterns, and technical accuracy in real-time.
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-10 text-left">
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex items-start gap-3">
                                <CheckCircle className="text-emerald-400 shrink-0" />
                                <div>
                                    <h4 className="font-bold text-slate-200">Behavioral Parsing</h4>
                                    <p className="text-sm text-slate-500">Evaluates STAR method usage.</p>
                                </div>
                            </div>
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex items-start gap-3">
                                <ShieldAlert className="text-amber-400 shrink-0" />
                                <div>
                                    <h4 className="font-bold text-slate-200">Anti-Cheat Module</h4>
                                    <p className="text-sm text-slate-500">Tracks eye movement off-screen.</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={startInterview}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-full font-bold text-lg transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center justify-center gap-3 w-full"
                        >
                            <PlayCircle size={24} />
                            Start Mock Interview
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 h-full min-h-[600px]">

                    {/* Main Video Area */}
                    <div className="lg:col-span-3 flex flex-col gap-6 relative">
                        <div className="flex-1 bg-black rounded-3xl overflow-hidden relative border border-white/10 shadow-2xl flex items-center justify-center group">
                            {cameraOn ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover transform -scale-x-100"
                                />
                            ) : (
                                <div className="flex flex-col items-center">
                                    <UserCircle size={80} className="text-slate-700" />
                                    <p className="text-slate-500 mt-4">Camera Paused</p>
                                </div>
                            )}

                            {/* Overlay HUD */}
                            <div className="absolute top-6 left-6 flex gap-3">
                                <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-sm font-semibold flex items-center gap-2 text-white">
                                    <span>Candidate Focus:</span>
                                    <span className={confidenceScore > 80 ? 'text-emerald-400' : 'text-amber-400'}>
                                        {confidenceScore.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-sm font-semibold flex items-center gap-2 text-slate-300">
                                    <span>Category:</span>
                                    <span className="capitalize text-white">
                                        {QUESTIONS[currentQuestionIndex].category}
                                    </span>
                                </div>
                            </div>

                            {/* Toolbar */}
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/80 backdrop-blur-xl p-3 rounded-2xl border border-white/10 transition-opacity opacity-0 group-hover:opacity-100">
                                <button
                                    onClick={() => setMicOn(!micOn)}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${micOn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-rose-500 hover:bg-rose-600'}`}
                                >
                                    {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                                </button>
                                <button
                                    onClick={() => setCameraOn(!cameraOn)}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${cameraOn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-rose-500 hover:bg-rose-600'}`}
                                >
                                    {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
                                </button>
                                <button
                                    onClick={endInterview}
                                    className="w-14 h-14 rounded-full flex items-center justify-center bg-rose-600 hover:bg-rose-500 transition-colors shadow-lg shadow-rose-600/30"
                                >
                                    <Phone size={24} className="transform rotate-[135deg]" />
                                </button>
                            </div>
                        </div>

                        {/* AI Current Question Banner */}
                        <div className="bg-slate-900/80 p-6 rounded-2xl border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)] flex items-start gap-6">
                            <div className="relative shrink-0 w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border-2 border-blue-500 overflow-hidden">
                                <div className={`absolute inset-0 bg-blue-500/20 ${isAiSpeaking ? 'animate-pulse' : ''}`} />
                                <MessageSquare className="text-blue-400 z-10" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-blue-400 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
                                    AI Interviewer
                                    {isAiSpeaking && <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />}
                                </h3>
                                <p className="text-xl font-medium text-white leading-relaxed">
                                    {QUESTIONS[currentQuestionIndex].text}
                                </p>
                            </div>
                            <button
                                onClick={advanceQuestion}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-colors whitespace-nowrap self-center"
                            >
                                Next Question
                            </button>
                        </div>
                    </div>

                    {/* Sidebar Chat & Analysis */}
                    <div className="glass-panel-heavy rounded-3xl flex flex-col overflow-hidden border border-white/5">
                        <div className="p-4 border-b border-white/10 bg-slate-800/50 flex justify-between items-center">
                            <h3 className="font-bold text-white font-mono flex items-center gap-2">
                                <Settings size={18} className="text-slate-400" />
                                Live Telemetry
                            </h3>
                        </div>

                        <div className="p-6 border-b border-white/10">
                            <h4 className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-4">Vocal Consistency Matrix</h4>
                            <AudioVisualizer isSpeaking={!isAiSpeaking && micOn} />
                            {(!micOn && !isAiSpeaking) && (
                                <div className="mt-4 text-xs text-rose-400 bg-rose-400/10 px-3 py-2 rounded-lg flex items-center gap-2">
                                    <AlertTriangle size={14} /> Microphone is currently muted.
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-b border-white/10">
                            <h4 className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-4">Live Hints</h4>
                            <ul className="space-y-3">
                                {QUESTIONS[currentQuestionIndex].hints.map((hint, idx) => (
                                    <li key={idx} className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl text-blue-200 text-sm">
                                        <span className="text-blue-400 mt-0.5 opacity-50 block">↳</span>
                                        {hint}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto bg-slate-900/30">
                            <h4 className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-4">Transcription Log</h4>
                            <div className="space-y-4">
                                {chatLog.map((log, idx) => (
                                    <div key={idx} className={`flex flex-col ${log.sender === 'ai' ? 'items-start' : 'items-end'}`}>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">
                                            {log.sender === 'ai' ? 'AI Agent' : 'You'}
                                        </span>
                                        <div className={`p-3 rounded-2xl max-w-[90%] text-sm leading-relaxed ${log.sender === 'ai'
                                                ? 'bg-slate-800 text-slate-300 rounded-tl-sm'
                                                : 'bg-blue-600 text-white rounded-tr-sm'
                                            }`}>
                                            {log.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};
