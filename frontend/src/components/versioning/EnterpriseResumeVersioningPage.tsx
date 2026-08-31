import React, { useState } from 'react'
import type { ResumeVersionRecord } from './types'
import { ResumeVersioningEngine } from './ResumeVersioningEngine'
import { VersionCard } from './VersionCard'
import { VersionAuditTimeline } from './VersionAuditTimeline'

export const EnterpriseResumeVersioningPage: React.FC = () => {
  const [selectedVersion, setSelectedVersion] = useState<ResumeVersionRecord | null>(null)
  const versions = ResumeVersioningEngine.getVersions({})
  const auditLogs = ResumeVersioningEngine.getAuditLogs()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white">
          Enterprise Resume Versioning & ATS Diff Engine
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Track side-by-side keyword score diffs and version revisions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {versions.map((ver) => (
          <VersionCard key={ver.versionId} version={ver} onSelect={(v) => setSelectedVersion(v)} />
        ))}
      </div>

      {selectedVersion && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white">
            Side-by-Side Diff Analysis for {selectedVersion.versionNumber}
          </h2>
          {selectedVersion.sectionDiffs.map((diff, idx) => (
            <div
              key={idx}
              className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs"
            >
              <span className="font-bold text-blue-400">{diff.sectionName}</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-500/10 text-red-300 p-2.5 rounded border border-red-500/20">
                  {diff.originalText}
                </div>
                <div className="bg-emerald-500/10 text-emerald-300 p-2.5 rounded border border-emerald-500/20">
                  {diff.revisedText}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <VersionAuditTimeline logs={auditLogs} />
    </div>
  )
}
