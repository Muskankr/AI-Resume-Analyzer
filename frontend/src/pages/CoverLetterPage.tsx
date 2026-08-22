import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FileText, Briefcase, Settings2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { Footer } from '../Footer';
import { RichLetterEditor } from '../components/RichLetterEditor';
import './CoverLetter.css';

export const CoverLetterPage: React.FC = () => {
    const { user } = useAuth();
    const [resumeText, setResumeText] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [tone, setTone] = useState('professional');

    const [loading, setLoading] = useState(false);
    const [generatedLetter, setGeneratedLetter] = useState('');
    const [error, setError] = useState('');
    const [metrics, setMetrics] = useState<{ keywords_integrated: string[], tone_used: string } | null>(null);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!resumeText.trim() || !jobDescription.trim()) {
            setError('Please provide both your resume and the job description.');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post('http://localhost:8000/api/cover-letter/generate/', {
                resume_text: resumeText,
                job_description: jobDescription,
                tone: tone
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });

            setGeneratedLetter(res.data.cover_letter);
            setMetrics({
                keywords_integrated: res.data.keywords_integrated,
                tone_used: res.data.tone_used
            });
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to generate cover letter. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!generatedLetter) return;

        const element = document.createElement("a");
        const file = new Blob([generatedLetter], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = "Cover_Letter.txt";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    return (
        <div className="cover-letter-page min-h-screen pb-12">
            <div className="container mx-auto px-4 py-8">

                {/* Header Section */}
                <div className="mb-8 p-8 glass-panel rounded-3xl relative overflow-hidden animate-print-slide">
                    <div className="absolute -top-32 -right-32 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
                    <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" style={{ animationDelay: '1.5s' }} />

                    <div className="relative z-10">
                        <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 flex items-center gap-4 mb-4">
                            <Sparkles className="text-purple-400" size={42} />
                            AI Cover Letter Generator
                        </h1>
                        <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
                            Synthesize a highly personalized, keyword-optimized cover letter instantly. Our engine aligns your existing resume experience directly with the core requirements of your target job description.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column: Inputs & Config */}
                    <div className="lg:col-span-5 space-y-6">
                        <form onSubmit={handleGenerate} className="glass-panel p-6 rounded-2xl space-y-6">

                            <div className="space-y-4">
                                <label className="text-slate-200 font-bold flex items-center gap-2 text-lg">
                                    <Settings2 size={20} className="text-pink-400" />
                                    Generation Settings
                                </label>
                                <div className="flex gap-3">
                                    {['professional', 'creative', 'direct'].map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setTone(t)}
                                            className={`flex-1 py-2.5 rounded-xl border font-medium text-sm transition-all capitalize
                        ${tone === t
                                                    ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <hr className="border-white/10" />

                            <div className="space-y-3 relative group">
                                <label className="text-slate-300 font-bold flex items-center gap-2">
                                    <FileText size={18} className="text-blue-400" />
                                    Your Resume Text
                                </label>
                                <textarea
                                    className="w-full h-48 bg-slate-900/50 border border-white/5 rounded-xl p-4 text-slate-300 resize-none font-mono text-sm leading-relaxed"
                                    placeholder="Paste your full resume text here..."
                                    value={resumeText}
                                    onChange={(e) => setResumeText(e.target.value)}
                                    readOnly={loading}
                                />
                            </div>

                            <div className="space-y-3 relative group">
                                <label className="text-slate-300 font-bold flex items-center gap-2">
                                    <Briefcase size={18} className="text-red-400" />
                                    Target Job Description
                                </label>
                                <textarea
                                    className="w-full h-48 bg-slate-900/50 border border-white/5 rounded-xl p-4 text-slate-300 resize-none font-mono text-sm leading-relaxed"
                                    placeholder="Paste the job description here..."
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    readOnly={loading}
                                />
                            </div>

                            {error && (
                                <div className="text-red-400 bg-red-400/10 border border-red-400/20 py-3 px-4 rounded-xl font-medium flex items-center gap-3">
                                    <AlertCircle size={20} className="shrink-0" />
                                    <p className="text-sm">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 text-lg ${loading
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                        : 'bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white hover:shadow-xl hover:shadow-pink-500/20 hover:scale-[1.02]'
                                    }`}
                            >
                                {loading ? (
                                    <><RefreshCw size={24} className="animate-spin" /> Generating Draft...</>
                                ) : (
                                    <><Sparkles size={24} /> Generate Cover Letter</>
                                )}
                            </button>

                        </form>

                        {metrics && (
                            <div className="glass-panel p-6 rounded-2xl animate-print-slide">
                                <h3 className="text-lg font-bold text-white mb-4">Optimization Metrics</h3>
                                <div className="space-y-4">
                                    <div>
                                        <span className="text-xs uppercase text-slate-500 font-bold tracking-wider">Tone Applied</span>
                                        <p className="text-purple-300 capitalize font-medium">{metrics.tone_used}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-2 block">Keywords Intersected</span>
                                        <div className="flex flex-wrap gap-2">
                                            {metrics.keywords_integrated.length > 0 ? metrics.keywords_integrated.map((kw, i) => (
                                                <span key={i} className="px-2 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-md text-xs font-mono">
                                                    {kw}
                                                </span>
                                            )) : (
                                                <span className="text-sm text-slate-400 italic">No direct keyword intersections found.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Editor */}
                    <div className="lg:col-span-7 h-[850px]">
                        {generatedLetter || loading ? (
                            <div className={`h-full transition-opacity duration-500 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                <RichLetterEditor
                                    content={generatedLetter}
                                    onChange={setGeneratedLetter}
                                    onDownload={handleDownload}
                                />
                            </div>
                        ) : (
                            <div className="h-full glass-panel rounded-2xl flex flex-col items-center justify-center text-center p-8 border-dashed border-2 border-slate-700">
                                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                                    <FileText size={32} className="text-slate-500" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-300 mb-2">No Draft Generated</h3>
                                <p className="text-slate-500 max-w-sm">
                                    Provide your resume and a target job description on the left to instantly generate a highly tailored cover letter.
                                </p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
            <Footer />
        </div>
    );
};
