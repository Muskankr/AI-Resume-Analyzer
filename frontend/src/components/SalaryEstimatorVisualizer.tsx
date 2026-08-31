import React, { useState, useMemo } from 'react';
import { SalaryEstimatorService } from './SalaryEstimatorService';
import { LocationTier } from './SalaryEstimatorModel';

export default function SalaryEstimatorVisualizer() {
  const [service] = useState(() => new SalaryEstimatorService());
  const [jobTitle, setJobTitle] = useState<string>('Senior Frontend Engineer');
  const [yoe, setYoe] = useState<number>(5);
  const [locationTier, setLocationTier] = useState<LocationTier>('TIER_1_TECH_HUB');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP' | 'CAD' | 'INR'>('USD');

  const range = useMemo(() => {
    return service.estimateSalaryRange({
      jobTitle,
      yearsOfExperience: yoe,
      locationTier,
      detectedSkillsCount: 10,
      currency
    });
  }, [service, jobTitle, yoe, locationTier, currency]);

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <header className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-full border border-amber-500/30 uppercase tracking-wider">
              Market Salary Benchmark & Compensation Engine
            </span>
            <span className="text-slate-400 text-xs font-mono">v2.7.0 • Experience & Skill Density Estimator</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400">
            Salary Benchmark Estimator
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            Estimate market compensation benchmarks (p25, p50 median, p75, p90) based on candidate skills, title, location tier, and experience.
          </p>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">p25 Base Salary</div>
          <div className="text-xl font-bold text-slate-300">{range.currency} ${range.p25BaseUsd.toLocaleString()}</div>
          <div className="text-slate-400 text-xs mt-1 font-mono">Entry to Mid Percentile</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">p50 Median Base</div>
          <div className="text-2xl font-extrabold text-amber-400">{range.currency} ${range.p50MedianUsd.toLocaleString()}</div>
          <div className="text-slate-400 text-xs mt-1 font-mono">Target Market Median</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">p75 Senior Market</div>
          <div className="text-xl font-bold text-emerald-400">{range.currency} ${range.p75SeniorUsd.toLocaleString()}</div>
          <div className="text-slate-400 text-xs mt-1 font-mono">High Performing Percentile</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Target Annual Equity</div>
          <div className="text-xl font-bold text-cyan-300">{range.currency} ${range.estimatedAnnualEquityUsd.toLocaleString()}</div>
          <div className="text-slate-400 text-xs mt-1 font-mono">25% Estimated RSUs / Options</div>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div>
          <label className="text-xs text-slate-400 block mb-2 font-medium">Job Title</label>
          <input
            type="text"
            value={jobTitle}
            onChange={e => setJobTitle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 font-mono"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-2 font-medium">Years of Experience</label>
          <input
            type="number"
            value={yoe}
            onChange={e => setYoe(parseInt(e.target.value) || 0)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 font-mono"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-2 font-medium">Location Tier</label>
          <select
            value={locationTier}
            onChange={e => setLocationTier(e.target.value as LocationTier)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 font-mono"
          >
            <option value="TIER_1_TECH_HUB">Tier 1 Tech Hub (SF / NYC / London)</option>
            <option value="TIER_2_METRO">Tier 2 Metro (Austin / Seattle / Berlin)</option>
            <option value="REMOTE_GLOBAL">Remote Global Benchmark</option>
          </select>
        </div>
      </div>
    </div>
  );
}
