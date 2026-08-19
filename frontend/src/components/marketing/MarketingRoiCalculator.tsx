import React, { useState } from 'react';
import { Calculator, DollarSign, TrendingUp, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { calculateHiringRoi } from '../../services/marketingEngine';

export const MarketingRoiCalculator: React.FC = () => {
    const [currentSalary, setCurrentSalary] = useState<number>(95000);
    const [expectedIncrease, setExpectedIncrease] = useState<number>(20);
    const [monthsSaved, setMonthsSaved] = useState<number>(2);

    const roi = calculateHiringRoi(currentSalary, expectedIncrease, monthsSaved);

    return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-10 -right-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                        <Calculator className="w-4 h-4" /> Interactive Career Growth Calculator
                    </div>
                    <h3 className="text-xl font-bold text-slate-100 mt-1">Calculate Your Job Search ROI</h3>
                </div>

                <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                    Real-time ROI Estimate
                </span>
            </div>

            {/* Controls Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2">
                        <span>Current Annual Salary:</span>
                        <span className="font-mono font-bold text-slate-200">${currentSalary.toLocaleString()}</span>
                    </div>
                    <input
                        type="range"
                        min={40000}
                        max={250000}
                        step={5000}
                        value={currentSalary}
                        onChange={(e) => setCurrentSalary(Number(e.target.value))}
                        className="w-full accent-indigo-500 bg-slate-950 rounded-lg cursor-pointer"
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2">
                        <span>Target Salary Jump:</span>
                        <span className="font-mono font-bold text-emerald-400">+{expectedIncrease}%</span>
                    </div>
                    <input
                        type="range"
                        min={5}
                        max={50}
                        step={5}
                        value={expectedIncrease}
                        onChange={(e) => setExpectedIncrease(Number(e.target.value))}
                        className="w-full accent-emerald-500 bg-slate-950 rounded-lg cursor-pointer"
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2">
                        <span>Job Search Time Saved:</span>
                        <span className="font-mono font-bold text-teal-400">{monthsSaved} Month{monthsSaved > 1 ? 's' : ''}</span>
                    </div>
                    <input
                        type="range"
                        min={1}
                        max={6}
                        step={1}
                        value={monthsSaved}
                        onChange={(e) => setMonthsSaved(Number(e.target.value))}
                        className="w-full accent-teal-500 bg-slate-950 rounded-lg cursor-pointer"
                    />
                </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
                    <span className="text-[11px] text-slate-400 font-medium block">Yearly Salary Boost</span>
                    <span className="text-xl font-black text-emerald-400 mt-1 block">
                        +${roi.extraEarningsYearly.toLocaleString()}
                    </span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
                    <span className="text-[11px] text-slate-400 font-medium block">Value of Saved Search Time</span>
                    <span className="text-xl font-black text-teal-400 mt-1 block">
                        +${Math.round(roi.timeValueSaved).toLocaleString()}
                    </span>
                </div>

                <div className="bg-indigo-950/60 border border-indigo-500/40 rounded-2xl p-4 text-center shadow-lg shadow-indigo-500/10">
                    <span className="text-[11px] text-indigo-300 font-medium block">Total Value Added</span>
                    <span className="text-2xl font-black text-indigo-200 mt-1 block">
                        +${Math.round(roi.totalValueAdded).toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );
};
