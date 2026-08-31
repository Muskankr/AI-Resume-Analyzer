import React from 'react'
import type { VersionAuditLog } from './types'

interface VersionAuditTimelineProps {
  logs: VersionAuditLog[]
}

export const VersionAuditTimeline: React.FC<VersionAuditTimelineProps> = ({ logs }) => {
  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
      <h3 className="text-lg font-bold text-white mb-4">Resume Revision Telemetry Audit Trail</h3>
      <div className="relative border-l border-slate-800 ml-3 space-y-4">
        {logs.map((log) => (
          <div key={log.logId} className="relative pl-6">
            <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-blue-500"></div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              <div className="flex justify-between font-bold text-slate-200 mb-1">
                <span>{log.action}</span>
                <span className="font-mono text-slate-400">{log.timestamp}</span>
              </div>
              <p className="text-slate-300">{log.details}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
