import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Activity, FileSearch, Target, CheckCircle, AlertCircle, RefreshCw, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { Footer } from '../Footer';
import { AtsResultTable } from './AtsResultTable';
import './AtsAnalyzer.css';

interface KeywordAnalysis {
    keyword: string;
    target_frequency: number;
    actual_frequency: number;
    match_percentage: number;
}

interface AtsResult {
    overall_score: number;
    keywords: KeywordAnalysis[];
    analyzed_at: string;
}

export const AtsAnalyzerPage: React.FC = () => {
    const { user } = useAuth();
    const [resumeText, setResumeText] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AtsResult | null>(null);
    const [error, setError] = useState('');

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!resumeText.trim() || !jobDescription.trim()) {
            setError('Please provide both resume text and job description.');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post('http://localhost:8000/api/ats/analyze/', {
                resume_text: resumeText,
                job_description: jobDescription
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            setResult(res.data);
        } catch (err: any) {
            setError('Failed to analyze ATS density. Try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ats-analyzer-page min-h-screen">
            <div className="container mx-auto px-4 py-8">

                {/* Header */}
                <div className="mb-8 p-6 bg-slate-800/50 rounded-3xl border border-white/5 relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 flex items-center gap-3">
                                <FileSearch className="text-blue-400" size={40} />
                                ATS Keyword Analyzer
                            </h1>
                            <p className="text-slate-400 mt-2 text-lg max-w-2xl">
                                Compare your resume text directly against a target job description to reveal missing keywords, density gaps, and optimize your ATS match rate.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Input Forms */}
                <form onSubmit={handleAnalyze} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-5 flex flex-col gap-3 relative group transition-all hover:border-blue-500/30">
                        <label className="text-slate-300 font-bold flex items-center gap-2">
                            <FileSearch size={18} className="text-blue-400" />
                            Your Resume Text
                        </label>
                        <textarea
                            className="w-full h-64 bg-slate-900/50 border border-white/5 rounded-xl p-4 text-slate-300 resize-none focus:outline-none focus:border-blue-500/50 transition-all font-mono text-sm leading-relaxed"
                            placeholder="Paste your raw resume text here..."
                            value={resumeText}
                            onChange={(e) => setResumeText(e.target.value)}
                        />
                    </div>

                    <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-5 flex flex-col gap-3 relative group transition-all hover:border-purple-500/30">
                        <label className="text-slate-300 font-bold flex items-center gap-2">
                            <Target size={18} className="text-purple-400" />
                            Target Job Description
                        </label>
                        <textarea
                            className="w-full h-64 bg-slate-900/50 border border-white/5 rounded-xl p-4 text-slate-300 resize-none focus:outline-none focus:border-purple-500/50 transition-all font-mono text-sm leading-relaxed"
                            placeholder="Paste the job description here..."
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                        />
                    </div>

                    <div className="lg:col-span-2 flex justify-center mt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-8 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 text-lg ${loading ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02]'
                                }`}
                        >
                            {loading ? (
                                <><RefreshCw size={24} className="animate-spin" /> Analyzing Density...</>
                            ) : (
                                <><Activity size={24} /> Generate ATS Score</>
                            )}
                        </button>
                    </div>

                    {error && (
                        <div className="lg:col-span-2 text-center text-red-400 bg-red-400/10 border border-red-400/20 py-3 rounded-xl mt-2 font-medium flex items-center justify-center gap-2">
                            <AlertCircle size={18} /> {error}
                        </div>
                    )}
                </form>

                {/* Results Area */}
                {result && (
                    <div className="bg-slate-900/30 border border-white/10 rounded-3xl p-6 mt-8 space-y-8 animate-fade-in">
                        <div className="flex flex-col md:flex-row gap-8">

                            <div className="md:w-1/3 flex flex-col items-center justify-center bg-slate-800/80 rounded-2xl p-8 border border-white/5 relative overflow-hidden">
                                <div className={`absolute inset-0 bg-gradient-to-b opacity-20 pointer-events-none ${result.overall_score > 75 ? 'from-green-500 to-transparent' : result.overall_score > 50 ? 'from-amber-500 to-transparent' : 'from-red-500 to-transparent'
                                    }`}
                                />

                                <h3 className="text-slate-400 font-bold mb-4 uppercase tracking-widest text-sm relative z-10">Match Score</h3>

                                <div className="relative flex items-center justify-center mb-6 z-10">
                                    <svg className="w-48 h-48 transform -rotate-90">
                                        <circle cx="96" cy="96" r="88" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                                        <circle
                                            cx="96" cy="96" r="88" fill="none"
                                            stroke={result.overall_score > 75 ? '#22c55e' : result.overall_score > 50 ? '#f59e0b' : '#ef4444'}
                                            strokeWidth="12"
                                            strokeLinecap="round"
                                            strokeDasharray={`${(result.overall_score / 100) * (2 * Math.PI * 88)} 999`}
                                            className="transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-6xl font-black text-white">{result.overall_score}<span className="text-3xl text-slate-500 ml-1">%</span></span>
                                    </div>
                                </div>

                                <div className="text-center z-10">
                                    <p className="text-slate-300 font-medium">
                                        {result.overall_score > 75
                                            ? 'Great match! Your resume strongly resonates with this job.'
                                            : result.overall_score > 50
                                                ? 'Moderate match. Consider adding more high-frequency keywords.'
                                                : 'Low match. Extensive keyword integration required.'
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className="md:w-2/3 bg-slate-800/80 rounded-2xl p-6 border border-white/5">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <BarChart2 className="text-blue-400" />
                                    Keyword Frequency Distribution
                                </h3>

                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={result.keywords.slice(0, 8)} margin={{ top: 20, right: 30, left: -20, bottom: 5 }} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
                                            <XAxis type="number" stroke="#94a3b8" />
                                            <YAxis type="category" dataKey="keyword" stroke="#94a3b8" width={100} tick={{ fill: '#e2e8f0', fontSize: 12 }} />
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px' }}
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            />
                                            <Bar dataKey="target_frequency" name="JD Target" fill="#94a3b8" radius={[0, 4, 4, 0]} maxBarSize={15} />
                                            <Bar dataKey="actual_frequency" name="Resume Match" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={15}>
                                                {result.keywords.slice(0, 8).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.actual_frequency >= entry.target_frequency ? '#22c55e' : (entry.actual_frequency > 0 ? '#3b82f6' : '#ef4444')} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                        </div>

                        {/* Detailed Keywords Table */}
                        <AtsResultTable keywords={result.keywords} />

                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
};
