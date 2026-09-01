import React from 'react'
import type { BenchmarkAuditLog } from './types'

interface BenchmarkAuditTimelineProps {
  logs: BenchmarkAuditLog[]
}

export const BenchmarkAuditTimeline: React.FC<BenchmarkAuditTimelineProps> = ({ logs }) => {
  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Benchmarking Telemetry & Audit Log
          </h3>
          <p className="text-xs text-slate-400">
            Live audit timeline of automated ATS evaluations and profile updates.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
          Live Tracking Active
        </span>
      </div>

      <div className="relative border-l border-slate-800 ml-3 space-y-6">
        {logs.map((log) => (
          <div key={log.id} className="relative pl-6 group">
            {/* Dot marker */}
            <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-800 border-2 border-blue-500 group-hover:bg-blue-400 transition-colors"></div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 transition-all hover:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-slate-200">{log.action}</span>
                <span className="text-[11px] font-mono text-slate-400">{log.timestamp}</span>
              </div>
              <p className="text-xs text-slate-300 mb-2">{log.details}</p>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  Performer: <strong className="text-slate-300">{log.performer}</strong>
                </span>
                {log.scoreDelta && (
                  <span className="text-emerald-400 font-semibold">{log.scoreDelta}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
