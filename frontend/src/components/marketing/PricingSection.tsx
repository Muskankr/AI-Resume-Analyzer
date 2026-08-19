import React, { useState } from 'react';
import { Check, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import { PRICING_PLANS, PricingPlan } from '../../services/marketingEngine';

export const PricingSection: React.FC = () => {
    const [isAnnual, setIsAnnual] = useState<boolean>(true);

    return (
        <div className="space-y-8">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    Transparent Investment
                </span>
                <h2 className="text-3xl font-black text-slate-100">Simple Plans Built for Job Candidates</h2>
                <p className="text-xs sm:text-sm text-slate-400">Start free or upgrade to unlock unlimited ATS scans, Workday simulation, and AI cover letter generation.</p>

                {/* Billing Cycle Toggle */}
                <div className="inline-flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 mt-2">
                    <button
                        type="button"
                        onClick={() => setIsAnnual(false)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            !isAnnual ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Monthly Billing
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsAnnual(true)}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isAnnual ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Annual Billing <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full">Save 25%</span>
                    </button>
                </div>
            </div>

            {/* Plans Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PRICING_PLANS.map((plan) => {
                    const price = isAnnual ? plan.priceAnnual : plan.priceMonthly;
                    return (
                        <div
                            key={plan.id}
                            className={`relative bg-slate-900/90 border rounded-3xl p-6 shadow-2xl flex flex-col justify-between transition-all duration-200 hover:scale-105 ${
                                plan.isPopular
                                    ? 'border-indigo-500/60 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/30 shadow-indigo-500/10'
                                    : 'border-slate-800'
                            }`}
                        >
                            {plan.badge && (
                                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-indigo-500 to-teal-500 text-white shadow-md">
                                    {plan.badge}
                                </span>
                            )}

                            <div>
                                <h3 className="text-xl font-bold text-slate-100">{plan.name}</h3>
                                <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.description}</p>

                                <div className="my-6">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-slate-100">${price}</span>
                                        <span className="text-xs text-slate-400 font-medium">/ month</span>
                                    </div>
                                    {isAnnual && price > 0 && (
                                        <span className="text-[10px] text-emerald-400 font-medium block mt-1">Billed annually (${price * 12}/yr)</span>
                                    )}
                                </div>

                                <div className="space-y-3 border-t border-slate-800/80 pt-4">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Included Features:</span>
                                    {plan.features.map((feat, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                                            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                            <span>{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="button"
                                className={`w-full py-3 rounded-2xl font-bold text-xs shadow-lg transition-all mt-8 flex items-center justify-center gap-2 ${
                                    plan.isPopular
                                        ? 'bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white shadow-indigo-500/25'
                                        : 'bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-200'
                                }`}
                            >
                                {plan.ctaText} <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
