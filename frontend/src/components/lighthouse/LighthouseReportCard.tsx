import React from 'react'
import type { LighthouseReportSuite } from './types'

interface LighthouseCardProps {
  report: LighthouseReportSuite
  onSelect: (report: LighthouseReportSuite) => void
}

export const LighthouseReportCard: React.FC<LighthouseCardProps> = ({ report, onSelect }) => {
  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            {report.reportId}
          </span>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Lighthouse Score: {report.overallScore}/100
          </span>
        </div>

        <h3 className="text-xl font-black text-white mb-1">{report.targetPageUrl}</h3>
        <p className="text-xs text-slate-400 mb-4 font-mono">Audited: {report.evaluatedAt}</p>

        {/* 4 Categories Scores */}
        <div className="grid grid-cols-4 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800 mb-5 text-center">
          <div>
            <span className="text-[10px] text-slate-400 block font-bold">Perf</span>
            <span className="text-sm font-black text-emerald-400">{report.performanceScore}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold">A11y</span>
            <span className="text-sm font-black text-blue-400">{report.accessibilityScore}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold">Best</span>
            <span className="text-sm font-black text-purple-400">{report.bestPracticesScore}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold">SEO</span>
            <span className="text-sm font-black text-amber-400">{report.seoScore}</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onSelect(report)}
        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2"
      >
        <span>View Full Lighthouse Audit Scorecard</span>
      </button>
    </div>
  )
}
