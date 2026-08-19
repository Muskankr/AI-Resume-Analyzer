import React, { useState } from 'react';
import { 
    Sparkles, 
    ShieldCheck, 
    TrendingUp, 
    Award, 
    Zap, 
    Star, 
    FileText, 
    Users, 
    ArrowRight,
    CheckCircle2
} from 'lucide-react';
import { 
    MARKETING_METRICS, 
    SUCCESS_TESTIMONIALS, 
    SEO_METADATA_CONFIG 
} from '../../services/marketingEngine';
import { MarketingRoiCalculator } from './MarketingRoiCalculator';
import { PricingSection } from './PricingSection';

export const MarketingHomePage: React.FC = () => {
    return (
        <div className="w-full max-w-6xl mx-auto space-y-16 py-8 px-4 sm:px-6">
            {/* Hero Section */}
            <div className="text-center space-y-6 max-w-3xl mx-auto pt-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold shadow-lg shadow-indigo-500/10">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Next-Gen AI Resume & ATS Keyword Optimizer</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-black text-slate-100 tracking-tight leading-tight">
                    Beat the ATS & Land Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-teal-400 to-emerald-400">Dream Job 3x Faster</span>
                </h1>

                <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
                    Upload your resume to instantly simulate Workday, Taleo, and Greenhouse applicant tracking systems. Discover missing keywords, optimize bullet points, and boost interview callbacks.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                    <button
                        onClick={() => alert("Launching Free AI Resume Analyzer...")}
                        className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                    >
                        <FileText className="w-5 h-5" /> Analyze Resume Free Now <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Metrics Counters Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {MARKETING_METRICS.map((metric, idx) => (
                    <div key={idx} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 text-center shadow-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">{metric.growth}</span>
                        <h3 className="text-3xl font-black text-slate-100 mt-1">{metric.value}</h3>
                        <p className="text-xs font-bold text-slate-300 mt-1">{metric.title}</p>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">{metric.description}</p>
                    </div>
                ))}
            </div>

            {/* Interactive Career ROI Calculator */}
            <MarketingRoiCalculator />

            {/* Candidate Testimonials Section */}
            <div className="space-y-6">
                <div className="text-center space-y-2 max-w-xl mx-auto">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Success Stories</span>
                    <h2 className="text-3xl font-black text-slate-100">Trusted by Candidates at Top Tech Companies</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {SUCCESS_TESTIMONIALS.map((t) => (
                        <div key={t.id} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1 text-amber-400">
                                        {[...Array(t.rating)].map((_, i) => (
                                            <Star key={i} className="w-4 h-4 fill-amber-400" />
                                        ))}
                                    </div>
                                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                                        ATS Score: {t.atsScoreBefore} → {t.atsScoreAfter}%
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">"{t.quote}"</p>
                            </div>

                            <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                                <img src={t.avatarUrl} alt={t.author} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                                <div>
                                    <h4 className="text-xs font-bold text-slate-100">{t.author}</h4>
                                    <p className="text-[11px] text-slate-400">{t.role} at {t.company}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pricing Section */}
            <PricingSection />
        </div>
    );
};
