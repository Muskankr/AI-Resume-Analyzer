import React from 'react'
import type { LighthouseAuditTimelineLog } from './types'

interface LighthouseAuditTimelineProps {
  logs: LighthouseAuditTimelineLog[]
}

export const LighthouseAuditTimeline: React.FC<LighthouseAuditTimelineProps> = ({ logs }) => {
  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <svg
              className="w-5 h-5 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Lighthouse CI Telemetry Audit Log
          </h3>
          <p className="text-xs text-slate-400">
            Automated performance & web accessibility verification history.
          </p>
        </div>
        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Lighthouse CI Passed 🟢
        </span>
      </div>

      <div className="relative border-l border-slate-800 ml-3 space-y-4">
        {logs.map((log) => (
          <div key={log.logId} className="relative pl-6">
            <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-emerald-400"></div>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
              <div className="flex justify-between font-bold text-slate-200 mb-1">
                <span>{log.eventType}</span>
                <span className="font-mono text-slate-400">{log.timestamp}</span>
              </div>
              <p className="text-slate-300 mb-1">{log.details}</p>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>
                  Performer: <strong className="text-slate-200">{log.performer}</strong>
                </span>
                <span className="text-emerald-400 font-bold">+{log.impactScoreGain} pts Gain</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
