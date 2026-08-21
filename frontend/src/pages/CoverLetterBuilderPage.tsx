import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Briefcase, Building, Copy, FileDown, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { Footer } from '../Footer';
import './CoverLetter.css';

export const CoverLetterBuilderPage: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [generatedLetter, setGeneratedLetter] = useState('');

    // Form State
    const [targetRole, setTargetRole] = useState('Software Engineer');
    const [companyName, setCompanyName] = useState('');
    const [tone, setTone] = useState('professional');
    const [jobDescription, setJobDescription] = useState('');
    const [copied, setCopied] = useState(false);

    const TONES = [
        { value: 'professional', label: 'Professional & Formal', desc: 'Standard business tone suitable for corporate roles.' },
        { value: 'enthusiastic', label: 'Enthusiastic & Passionate', desc: 'High-energy, great for startups or creative roles.' },
        { value: 'confident', label: 'Confident & Direct', desc: 'Results-oriented focus for competitive positions.' },
        { value: 'casual', label: 'Friendly & Casual', desc: 'Warm and conversational, good for modern tech companies.' }
    ];

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setGeneratedLetter('');
        setCopied(false);

        try {
            const response = await axios.post(
                'http://localhost:8000/api/cover-letter/generate/',
                {
                    target_role: targetRole,
                    company_name: companyName,
                    tone: tone,
                    job_description: jobDescription
                },
                { headers: { Authorization: `Bearer ${localStorage.getItem('access')}` } }
            );

            setGeneratedLetter(response.data.content);
        } catch (error) {
            console.error('Failed to generate cover letter:', error);
            alert('Failed to generate cover letter. Ensure backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedLetter);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const element = document.createElement("a");
        const file = new Blob([generatedLetter], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `${companyName.replace(/\s+/g, '_')}_CoverLetter.txt`;
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
    };

    return (
        <div className="cover-letter-page min-h-screen">
            <div className="container mx-auto px-4 py-8">

                <div className="mb-8 border-b border-white/10 pb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500 flex items-center gap-3">
                            <Sparkles className="text-teal-400" size={32} />
                            AI Cover Letter Builder
                        </h1>
                        <p className="text-slate-400 mt-2">Generate tailored cover letters instantly using your latest resume analysis.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column: Form Controls */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="glass-panel p-6 rounded-2xl">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-white">
                                <Briefcase size={20} className="text-blue-400" /> Application Details
                            </h2>

                            <form onSubmit={handleGenerate} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Target Role</label>
                                    <input
                                        type="text"
                                        value={targetRole}
                                        onChange={(e) => setTargetRole(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all"
                                        placeholder="e.g. Senior Frontend Developer"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                        <Building size={16} /> Company Name
                                    </label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all"
                                        placeholder="e.g. Acme Corp"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-3">Writing Tone</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {TONES.map(t => (
                                            <div
                                                key={t.value}
                                                onClick={() => setTone(t.value)}
                                                className={`p-3 rounded-xl cursor-pointer border transition-all flex flex-col ${tone === t.value
                                                        ? 'bg-teal-500/20 border-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.2)]'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                    }`}
                                            >
                                                <span className={`font-semibold ${tone === t.value ? 'text-teal-300' : 'text-slate-200'}`}>
                                                    {t.label}
                                                </span>
                                                <span className="text-xs text-slate-400 mt-1">{t.desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Job Description <span className="text-slate-500 text-xs">(Optional)</span></label>
                                    <textarea
                                        value={jobDescription}
                                        onChange={(e) => setJobDescription(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all h-32 resize-none"
                                        placeholder="Paste the job description here for higher accuracy..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full mt-4 py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg transition-all ${loading ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'app-btn-teal'
                                        }`}
                                >
                                    {loading ? (
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                    ) : (
                                        <>Generate Cover Letter <Sparkles size={20} /></>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right Column: Preview */}
                    <div className="lg:col-span-7">
                        <div className="glass-panel rounded-2xl h-full min-h-[600px] flex flex-col overflow-hidden relative">
                            <div className="bg-white/5 border-b border-white/10 p-4 flex justify-between items-center">
                                <span className="font-semibold text-slate-200">Letter Preview</span>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleCopy}
                                        disabled={!generatedLetter}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!generatedLetter ? 'opacity-50 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20 text-white'
                                            }`}
                                    >
                                        {copied ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} />}
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        disabled={!generatedLetter}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!generatedLetter ? 'opacity-50 cursor-not-allowed' : 'bg-teal-500/20 text-teal-300 hover:bg-teal-500/40'
                                            }`}
                                    >
                                        <FileDown size={16} /> Download
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 flex-1 overflow-y-auto w-full relative">
                                {loading ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <div className="generating-pulse w-32 h-32 rounded-full flex items-center justify-center">
                                            <Sparkles size={48} className="text-teal-400 opacity-50" />
                                        </div>
                                        <p className="mt-6 text-teal-300 font-medium tracking-wide">Drafting your perfect letter...</p>
                                    </div>
                                ) : generatedLetter ? (
                                    <div
                                        contentEditable
                                        suppressContentEditableWarning
                                        className="w-full min-h-full font-serif text-slate-200 leading-relaxed text-lg whitespace-pre-wrap outline-none p-4 rounded-lg hover:bg-white/5 transition-colors cursor-text"
                                    >
                                        {generatedLetter}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-12">
                                        <Sparkles size={64} className="mb-6 opacity-20" />
                                        <h3 className="text-xl font-semibold mb-2">No Letter Generated Yet</h3>
                                        <p>Fill out the details on the left and hit generate. An AI-crafted cover letter tailored to your resume's skills will appear here.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
            <Footer />
        </div>
    );
};
