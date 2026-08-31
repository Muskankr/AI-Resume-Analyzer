import React from 'react'
import type { ResumeVersionRecord } from './types'

interface VersionCardProps {
  version: ResumeVersionRecord
  onSelect: (version: ResumeVersionRecord) => void
}

export const VersionCard: React.FC<VersionCardProps> = ({ version, onSelect }) => {
  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            {version.versionNumber}
          </span>
          {version.isCurrentActiveVersion && (
            <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
              ACTIVE VERSION
            </span>
          )}
        </div>

        <h3 className="text-xl font-black text-white mb-1">{version.versionTag}</h3>
        <p className="text-xs text-slate-400 mb-4">Author: {version.author}</p>

        <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 mb-5">
          <div>
            <span className="text-[11px] text-slate-400 block">ATS Score</span>
            <span className="text-lg font-extrabold text-emerald-400">
              {version.atsScore} / 100
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Score Gain</span>
            <span className="text-lg font-extrabold text-blue-400">
              +{version.atsScoreDelta} pts
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onSelect(version)}
        className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2"
      >
        <span>Compare Version Diff</span>
      </button>
    </div>
  )
}
