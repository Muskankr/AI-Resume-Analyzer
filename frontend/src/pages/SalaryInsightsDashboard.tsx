import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    Briefcase, TrendingUp, DollarSign, Award, Target, HelpCircle,
    ChevronRight, Copy, CheckCircle2, AlertTriangle, ShieldCheck
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { Footer } from '../Footer';
import './Salary.css';

interface DistributionPoint {
    range: string;
    probability: number;
}

interface SalaryData {
    title: string;
    location: string;
    p25: number;
    p50: number;
    p75: number;
    distribution: DistributionPoint[];
    scripts: {
        base: string;
        equity: string;
        bonus: string;
    };
}

export const SalaryInsightsDashboard: React.FC = () => {
    const { user } = useAuth();

    // Dashboard Controls
    const [jobTitle, setJobTitle] = useState('Senior Software Engineer');
    const [experience, setExperience] = useState(5);
    const [location, setLocation] = useState('Remote');
    const [activeTab, setActiveTab] = useState<'benchmarks' | 'scripts' | 'evaluate'>('benchmarks');
    const [scriptType, setScriptType] = useState<'base' | 'equity' | 'bonus'>('base');

    const [loading, setLoading] = useState(false);
    const [salaryData, setSalaryData] = useState<SalaryData | null>(null);

    // Script Editor states
    const [editableScript, setEditableScript] = useState('');
    const [copied, setCopied] = useState(false);

    // Offer Evaluator states
    const [offerBase, setOfferBase] = useState(120000);
    const [offerEquity, setOfferEquity] = useState(20000);
    const [offerBonus, setOfferBonus] = useState(10000);

    const fetchInsights = async () => {
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:8000/api/salary/insights/', {
                job_title: jobTitle,
                experience_years: experience,
                location: location
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            setSalaryData(res.data);
            setEditableScript(res.data.scripts[scriptType]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInsights();
        // eslint-disable-next-line
    }, []); // Initial load

    useEffect(() => {
        if (salaryData) {
            setEditableScript(salaryData.scripts[scriptType]);
        }
    }, [scriptType, salaryData]);

    const handleCopy = () => {
        navigator.clipboard.writeText(editableScript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const calculateTotalComp = () => offerBase + offerEquity + offerBonus;

    const getOfferGrade = () => {
        if (!salaryData) return 'N/A';
        const total = calculateTotalComp();
        if (total >= salaryData.p75) return 'A (Excellent)';
        if (total >= salaryData.p50) return 'B (Competitive)';
        if (total >= salaryData.p25) return 'C (Average)';
        return 'D (Below Market)';
    };

    return (
        <div className="salary-dashboard">
            <div className="container mx-auto px-4 py-8">

                {/* Header Section */}
                <div className="mb-8 p-8 salary-glass-card relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                        <div>
                            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center gap-4 mb-2">
                                <DollarSign size={36} className="text-emerald-400" />
                                AI Salary & Negotiation Analyzer
                            </h1>
                            <p className="text-slate-400 text-lg">
                                Leverage real-time market data to benchmark offers, evaluate total compensation, and generate persuasive negotiation scripts tailored to your specific leverage points.
                            </p>
                        </div>

                        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 flex flex-col gap-3 min-w-[300px]">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Target Role</span>
                                <input
                                    className="bg-transparent text-right font-bold text-emerald-400 border-none outline-none focus:ring-0"
                                    value={jobTitle}
                                    onChange={e => setJobTitle(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Experience: {experience} YOE</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="25"
                                    value={experience}
                                    onChange={e => setExperience(parseInt(e.target.value))}
                                    className="custom-range-slider"
                                />
                            </div>
                            <button
                                onClick={fetchInsights}
                                className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold py-2 rounded-lg transition-colors border border-emerald-500/30 mt-2"
                            >
                                {loading ? 'Analyzing Market...' : 'Refresh Benchmarks'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-4 mb-6 sticky top-4 z-20 bg-slate-900/80 backdrop-blur-md p-2 rounded-xl">
                    {[
                        { id: 'benchmarks', label: 'Market Benchmarks', icon: TrendingUp },
                        { id: 'evaluate', label: 'Offer Evaluator', icon: Target },
                        { id: 'scripts', label: 'Negotiation Scripts', icon: ShieldCheck },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${activeTab === tab.id
                                    ? 'bg-emerald-600 text-white shadow-lg'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="min-h-[500px]">
                    {loading || !salaryData ? (
                        <div className="h-[400px] flex items-center justify-center">
                            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'benchmarks' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-1 space-y-6">
                                        <div className="salary-glass-card p-6 stat-glow">
                                            <h3 className="text-slate-400 font-medium mb-1">Median Base (P50)</h3>
                                            <p className="text-4xl font-black text-white tracking-tight">
                                                ${salaryData.p50.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="salary-glass-card p-6 bg-emerald-900/20 border-emerald-500/30">
                                            <h3 className="text-emerald-400 font-medium mb-1">Top Tier (P75)</h3>
                                            <p className="text-3xl font-bold text-white tracking-tight">
                                                ${salaryData.p75.toLocaleString()}
                                            </p>
                                            <p className="text-sm text-slate-400 mt-2">
                                                Target this range for strong performance evaluations and competing counter-offers.
                                            </p>
                                        </div>
                                        <div className="salary-glass-card p-6">
                                            <h3 className="text-slate-400 font-medium mb-1">Lower Bound (P25)</h3>
                                            <p className="text-2xl font-bold text-slate-300 tracking-tight">
                                                ${salaryData.p25.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-2 salary-glass-card p-6 flex flex-col">
                                        <h3 className="text-xl font-bold text-white mb-6">Probability Density Curve</h3>
                                        <div className="flex-1 min-h-[350px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={salaryData.distribution}>
                                                    <defs>
                                                        <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                    <XAxis dataKey="range" stroke="#94a3b8" />
                                                    <YAxis stroke="#94a3b8" />
                                                    <RechartsTooltip
                                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                                                        itemStyle={{ color: '#10b981' }}
                                                        formatter={(value: number) => [`${value}% of Market`, 'Probability']}
                                                    />
                                                    <Area type="monotone" dataKey="probability" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProb)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'evaluate' && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="salary-glass-card p-8">
                                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                            <Target className="text-blue-400" /> Enter Offer Details
                                        </h2>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-slate-400 text-sm font-bold mb-2">Base Salary (Annual)</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-blue-500"
                                                        value={offerBase}
                                                        onChange={e => setOfferBase(Number(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-slate-400 text-sm font-bold mb-2">Equity / RSU (Annualized)</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-blue-500"
                                                        value={offerEquity}
                                                        onChange={e => setOfferEquity(Number(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-slate-400 text-sm font-bold mb-2">Target Bonus / Sign-on (Year 1)</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-blue-500"
                                                        value={offerBonus}
                                                        onChange={e => setOfferBonus(Number(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="salary-glass-card p-8 bg-gradient-to-br from-slate-900 to-blue-900/30 flex flex-col justify-center items-center text-center">
                                        <h3 className="text-xl text-slate-300 font-bold mb-2">Total First-Year Compensation</h3>
                                        <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-8 tracking-tighter">
                                            ${calculateTotalComp().toLocaleString()}
                                        </p>

                                        <div className="w-full max-w-sm bg-slate-950/50 rounded-2xl p-6 border border-white/5 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400 font-medium">Offer Grade</span>
                                                <span className="text-lg font-bold text-white px-3 py-1 bg-white/10 rounded-lg">
                                                    {getOfferGrade()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500">vs. Market Base</span>
                                                <span className={offerBase >= salaryData.p50 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                                                    {offerBase >= salaryData.p50 ? '+ Above Market' : '- Below Market'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'scripts' && (
                                <div className="salary-glass-card p-0 flex flex-col md:flex-row overflow-hidden min-h-[600px]">

                                    {/* Script Sidebar */}
                                    <div className="w-full md:w-64 bg-slate-900/80 border-r border-slate-700/50 p-4 shrink-0 flex flex-col gap-2">
                                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Select Scenario</h3>
                                        {[
                                            { id: 'base', label: 'Push for Higher Base' },
                                            { id: 'equity', label: 'Negotiate Equity Grant' },
                                            { id: 'bonus', label: 'Request Sign-on Bonus' }
                                        ].map(st => (
                                            <button
                                                key={st.id}
                                                onClick={() => setScriptType(st.id as any)}
                                                className={`text-left px-4 py-3 rounded-xl font-medium transition-all ${scriptType === st.id
                                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                        : 'text-slate-400 hover:bg-slate-800'
                                                    }`}
                                            >
                                                {st.label}
                                            </button>
                                        ))}

                                        <div className="mt-auto p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                            <HelpCircle size={20} className="text-blue-400 mb-2" />
                                            <p className="text-xs text-blue-200">
                                                These scripts are dynamically tailored to leverage your specific years of experience ({experience} YOE) and current market conditions.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Script Editor */}
                                    <div className="flex-1 flex flex-col p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-xl font-bold flex items-center gap-2">
                                                <ShieldCheck className="text-emerald-400" />
                                                AI Personalized Script
                                            </h2>
                                            <button
                                                onClick={handleCopy}
                                                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors font-medium border border-slate-700"
                                            >
                                                {copied ? <CheckCircle2 size={16} className="text-emerald-300" /> : <Copy size={16} />}
                                                {copied ? 'Copied to Clipboard' : 'Copy Text'}
                                            </button>
                                        </div>

                                        <textarea
                                            className="flex-1 w-full p-6 text-lg leading-relaxed rounded-2xl script-editor-textarea resize-none"
                                            value={editableScript}
                                            onChange={e => setEditableScript(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
};
