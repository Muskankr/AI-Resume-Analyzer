import React from 'react'
import type { AtsCandidateAnalyticsReport } from './types'

interface AtsCardProps {
  report: AtsCandidateAnalyticsReport
  onSelect: (report: AtsCandidateAnalyticsReport) => void
}

export const AtsReportCard: React.FC<AtsCardProps> = ({ report, onSelect }) => {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'EXECUTIVE':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30'
      case 'SENIOR':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      case 'MID_LEVEL':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    }
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            {report.reportId}
          </span>
          <span
            className={`text-xs font-extrabold px-3 py-1 rounded-full border ${getTierColor(report.scoringTier)}`}
          >
            Tier: {report.scoringTier}
          </span>
        </div>

        <h3 className="text-xl font-black text-white mb-1">{report.candidateName}</h3>
        <p className="text-xs text-slate-400 font-medium mb-1">{report.targetRoleTitle}</p>
        <p className="text-[11px] font-mono text-slate-500 mb-4">{report.candidateEmail}</p>

        {/* ATS Metric Highlights */}
        <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 mb-5">
          <div>
            <span className="text-[11px] text-slate-400 block">Overall ATS Score</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-blue-400">{report.overallAtsScore}</span>
              <span className="text-xs text-slate-500 font-bold">/ 100</span>
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Pass Probability</span>
            <span className="text-xl font-black text-emerald-400">
              {report.passProbabilityPercent}%
            </span>
          </div>
        </div>

        {/* Missing Keywords Preview */}
        {report.missingCriticalKeywords.length > 0 && (
          <div className="mb-5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Missing High-Impact Keywords ({report.missingCriticalKeywords.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {report.missingCriticalKeywords.slice(0, 3).map((kw, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded"
                >
                  ✕ {kw}
                </span>
              ))}
              {report.missingCriticalKeywords.length > 3 && (
                <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                  +{report.missingCriticalKeywords.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => onSelect(report)}
        className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2"
      >
        <span>View Full ATS Analytics Breakdown</span>
      </button>
    </div>
  )
}
