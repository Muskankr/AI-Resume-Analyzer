import React from 'react'
import type { SecurityAuditTimelineLog } from './types'

interface SecurityAuditTimelineProps {
  logs: SecurityAuditTimelineLog[]
}

export const SecurityAuditTimeline: React.FC<SecurityAuditTimelineProps> = ({ logs }) => {
  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <svg
              className="w-5 h-5 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Security & Compliance Telemetry Audit Trail
          </h3>
          <p className="text-xs text-slate-400 font-sans">
            Cryptographically verifiable DLP scanner audit log.
          </p>
        </div>
        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          SOC2 Verified
        </span>
      </div>

      <div className="relative border-l border-slate-800 ml-3 space-y-6">
        {logs.map((log) => (
          <div key={log.logId} className="relative pl-6 group">
            <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-800 border-2 border-emerald-400 group-hover:bg-emerald-300 transition-colors"></div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 transition-all hover:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-slate-200">{log.eventType}</span>
                <span className="text-[11px] font-mono text-slate-400">{log.timestamp}</span>
              </div>
              <p className="text-xs text-slate-300 mb-2">{log.details}</p>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  Actor: <strong className="text-slate-300">{log.actor}</strong>
                </span>
                <span className="text-blue-400 font-semibold">{log.complianceImpact}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
