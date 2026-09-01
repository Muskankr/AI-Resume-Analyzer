import React from 'react'
import type { SecurityComplianceReport } from './types'

interface SecurityVaultCardProps {
  report: SecurityComplianceReport
  onSelect: (report: SecurityComplianceReport) => void
  onRedact: (vaultId: string, category: string) => void
}

export const SecurityVaultCard: React.FC<SecurityVaultCardProps> = ({
  report,
  onSelect,
  onRedact,
}) => {
  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
      case 'HIGH':
        return 'bg-red-500/10 text-red-400 border-red-500/30'
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      case 'LOW':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    }
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
            {report.vaultId}
          </span>
          <span
            className={`text-xs font-extrabold px-3 py-1 rounded-full border ${getRiskBadgeColor(report.piiRiskLevel)}`}
          >
            PII Risk: {report.piiRiskLevel}
          </span>
        </div>

        <h3 className="text-xl font-black text-white mb-1">{report.candidateName}</h3>
        <p className="text-xs text-slate-400 mb-4 font-mono truncate">{report.documentTitle}</p>

        {/* Score & Encryption Card */}
        <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 mb-5">
          <div>
            <span className="text-[11px] text-slate-400 block">Compliance Score</span>
            <span className="text-lg font-black text-emerald-400">{report.complianceScore}%</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Encryption Standard</span>
            <span className="text-xs font-mono font-bold text-blue-400">
              {report.encryptionStatus}
            </span>
          </div>
        </div>

        {/* Standards Badges */}
        <div className="mb-5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Verified Compliance
          </span>
          <div className="flex flex-wrap gap-1.5">
            {report.standardsCompliant.map((std, idx) => (
              <span
                key={idx}
                className="text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded"
              >
                ✓ {std}
              </span>
            ))}
          </div>
        </div>

        {/* PII Findings Summary */}
        {report.piiFindings.length > 0 && (
          <div className="space-y-2 mb-5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Detected PII Items
            </span>
            {report.piiFindings.map((finding, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800"
              >
                <span className="text-slate-300 font-medium">{finding.fieldCategory}</span>
                {finding.isRedacted ? (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                    REDACTED
                  </span>
                ) : (
                  <button
                    onClick={() => onRedact(report.vaultId, finding.fieldCategory)}
                    className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-bold transition-all"
                  >
                    Apply Redaction
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => onSelect(report)}
        className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2"
      >
        <span>Open Compliance Vault Report</span>
      </button>
    </div>
  )
}
