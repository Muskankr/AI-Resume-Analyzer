import React, { useState } from 'react'
import type { AtsCandidateAnalyticsReport, AtsAnalyticsFilterQuery } from './types'
import { AtsScoringAnalyticsEngine } from './AtsScoringAnalyticsEngine'
import { AtsReportCard } from './AtsReportCard'
import { AtsAnalyticsAuditTimeline } from './AtsAnalyticsAuditTimeline'

export const EnterpriseAtsScoringAnalyticsPage: React.FC = () => {
  const [filters, setFilters] = useState<AtsAnalyticsFilterQuery>({
    scoringTier: 'All',
    search: '',
  })

  const [selectedReport, setSelectedReport] = useState<AtsCandidateAnalyticsReport | null>(null)
  const [reports, setReports] = useState(AtsScoringAnalyticsEngine.getReports(filters))
  const [auditLogs] = useState(AtsScoringAnalyticsEngine.getAuditLogs())

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setFilters((prev) => ({ ...prev, search: val }))
    setReports(AtsScoringAnalyticsEngine.getReports({ ...filters, search: val }))
  }

  const handleTierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setFilters((prev) => ({ ...prev, scoringTier: val }))
    setReports(AtsScoringAnalyticsEngine.getReports({ ...filters, scoringTier: val }))
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                ATS Analytics & Rules Matrix
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-3 py-1 rounded-full font-mono">
                Taleo / Workday / Greenhouse Ready
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Enterprise ATS Scoring & Analytics Suite
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              High-precision ATS scoring breakdown, keyword gap matrix, formatting parser
              compliance, and pass probability metrics tailored for enterprise hiring pipelines.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Search Candidate, Role, or Email
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
              Filter by Scoring Tier
            </label>
            <select
              value={filters.scoringTier}
              onChange={handleTierChange}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none transition-all"
            >
              <option value="All">All Scoring Tiers</option>
              <option value="EXECUTIVE">Executive Tier</option>
              <option value="SENIOR">Senior Tier</option>
              <option value="MID_LEVEL">Mid Level Tier</option>
              <option value="ENTRY_LEVEL">Entry Level Tier</option>
            </select>
          </div>
        </div>

        {/* Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <AtsReportCard
              key={report.reportId}
              report={report}
              onSelect={(r) => setSelectedReport(r)}
            />
          ))}
        </div>

        {/* Selected Report Inspection Modal */}
        {selectedReport && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl relative">
              <button
                onClick={() => setSelectedReport(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                ✕
              </button>

              <div>
                <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                  Report ID: {selectedReport.reportId}
                </span>
                <h2 className="text-2xl font-black text-white mt-2">
                  {selectedReport.candidateName}
                </h2>
                <p className="text-xs text-slate-400">
                  {selectedReport.targetRoleTitle} • {selectedReport.candidateEmail}
                </p>
              </div>

              {/* Category Breakdown */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  ATS Category Breakdown
                </h3>
                {selectedReport.categoryBreakdown.map((cat, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2"
                  >
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-blue-400">{cat.categoryName}</span>
                      <span className="text-emerald-400">
                        {cat.score} / 100 (Percentile: {cat.benchmarkPercentile}%)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{cat.recommendations[0]}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setSelectedReport(null)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl"
              >
                Close Report Inspection
              </button>
            </div>
          </div>
        )}

        {/* Audit Timeline */}
        <AtsAnalyticsAuditTimeline logs={auditLogs} />
      </div>
    </div>
  )
}
