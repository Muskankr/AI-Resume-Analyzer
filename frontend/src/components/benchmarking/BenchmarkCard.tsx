import React from 'react'
import type { IndustryPeerComparison } from './types'

interface BenchmarkCardProps {
  comparison: IndustryPeerComparison
  onSelect: (comparison: IndustryPeerComparison) => void
}

export const BenchmarkCard: React.FC<BenchmarkCardProps> = ({ comparison, onSelect }) => {
  const getScoreBadgeColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    if (score >= 70) return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
  }

  return (
    <div className="group relative bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-300 shadow-xl hover:shadow-blue-500/10 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-4 mb-3">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
            {comparison.industryDomain}
          </span>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${getScoreBadgeColor(comparison.userScore)}`}
          >
            Score: {comparison.userScore}/100
          </span>
        </div>

        <h3 className="text-xl font-extrabold text-white group-hover:text-blue-400 transition-colors mb-1">
          {comparison.targetRole}
        </h3>
        <p className="text-xs text-slate-400 mb-5">
          Seniority Target:{' '}
          <span className="text-slate-200 font-medium">{comparison.experienceLevel}</span>
        </p>

        {/* Metric Progress Bars */}
        <div className="space-y-3 mb-6 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Industry Peer Rank</span>
              <span className="text-emerald-400 font-bold">
                {comparison.benchmarkMetrics.percentileRank}th Percentile
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${comparison.benchmarkMetrics.percentileRank}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">ATS Pass Probability</span>
              <span className="text-blue-400 font-bold">
                {comparison.benchmarkMetrics.atsPassProbability}%
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${comparison.benchmarkMetrics.atsPassProbability}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Missing High Impact Keywords */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Top Keyword Gap (Missing)
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {comparison.missingHighImpactKeywords.slice(0, 4).map((kw, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-md"
              >
                + {kw}
              </span>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => onSelect(comparison)}
        className="w-full mt-4 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide transition-all shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2"
      >
        <span>View Full Peer Benchmark Report</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        </svg>
      </button>
    </div>
  )
}
