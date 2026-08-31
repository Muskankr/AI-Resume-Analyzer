import React, { useState } from 'react'
import type { SecurityComplianceReport, SecurityVaultFilterQuery } from './types'
import { ResumeSecurityVaultEngine } from './ResumeSecurityVaultEngine'
import { SecurityVaultCard } from './SecurityVaultCard'
import { SecurityAuditTimeline } from './SecurityAuditTimeline'

export const EnterpriseResumeSecurityVaultPage: React.FC = () => {
  const [filters, setFilters] = useState<SecurityVaultFilterQuery>({
    piiRiskLevel: 'All',
    search: '',
  })

  const [selectedReport, setSelectedReport] = useState<SecurityComplianceReport | null>(null)
  const [reports, setReports] = useState(ResumeSecurityVaultEngine.getVaultReports(filters))
  const [auditLogs, setAuditLogs] = useState(ResumeSecurityVaultEngine.getAuditLogs())

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setFilters((prev) => ({ ...prev, search: val }))
    setReports(ResumeSecurityVaultEngine.getVaultReports({ ...filters, search: val }))
  }

  const handleRiskChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setFilters((prev) => ({ ...prev, piiRiskLevel: val }))
    setReports(ResumeSecurityVaultEngine.getVaultReports({ ...filters, piiRiskLevel: val }))
  }

  const handleRedact = (vaultId: string, category: string) => {
    ResumeSecurityVaultEngine.applyRedaction(vaultId, category)
    setReports(ResumeSecurityVaultEngine.getVaultReports(filters))

    const newLog = {
      logId: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      eventType: 'PII_REDACTION_APPLIED' as const,
      details: `Redacted ${category} snippet on ${vaultId}.`,
      actor: 'Admin Security Analyst',
      complianceImpact: 'Risk Remediated',
    }
    setAuditLogs((prev) => [newLog, ...prev])
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Security & DLP Vault
              </span>
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold px-3 py-1 rounded-full font-mono">
                AES-256 Envelope Encryption
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Enterprise Resume Security & Compliance Vault
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Automated Data Loss Prevention (DLP), PII detection, redaction controls, and
              multi-jurisdictional compliance auditing across candidate resume pipelines.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Search Candidate Name or Document Title
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={handleSearchChange}
              placeholder="Search candidate records..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none transition-all placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Filter by PII Risk Level
            </label>
            <select
              value={filters.piiRiskLevel}
              onChange={handleRiskChange}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none transition-all"
            >
              <option value="All">All Risk Levels</option>
              <option value="NONE">NONE (Clean)</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
        </div>

        {/* Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <SecurityVaultCard
              key={report.vaultId}
              report={report}
              onSelect={(r) => setSelectedReport(r)}
              onRedact={handleRedact}
            />
          ))}
        </div>

        {/* Selected Modal */}
        {selectedReport && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl relative">
              <button
                onClick={() => setSelectedReport(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                ✕
              </button>

              <h2 className="text-2xl font-black text-white">
                {selectedReport.candidateName} Security Audit
              </h2>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Retention Days Remaining:</span>
                  <span className="text-white font-bold">
                    {selectedReport.retentionDaysRemaining} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Audited Timestamp:</span>
                  <span className="text-mono text-slate-300">{selectedReport.lastAuditedAt}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedReport(null)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl"
              >
                Close Audit Inspection
              </button>
            </div>
          </div>
        )}

        {/* Audit Timeline */}
        <SecurityAuditTimeline logs={auditLogs} />
      </div>
    </div>
  )
}
