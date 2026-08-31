import React, { useState } from 'react'
import type { LighthouseReportSuite } from './types'
import { LighthouseAnalyticsEngine } from './LighthouseAnalyticsEngine'
import { LighthouseReportCard } from './LighthouseReportCard'
import { LighthouseAuditTimeline } from './LighthouseAuditTimeline'

/**
 * Enterprise Lighthouse CI & Web Accessibility Analytics Page
 */
export const EnterpriseLighthouseAnalyticsPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<LighthouseReportSuite | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')

  const reports = LighthouseAnalyticsEngine.getReports({ search: searchQuery })
  const auditLogs = LighthouseAnalyticsEngine.getAuditLogs()
  const categorySummaries = LighthouseAnalyticsEngine.computeCategorySummaries()
  const averageOverallScore = LighthouseAnalyticsEngine.calculateAverageOverallScore()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans space-y-8">
      {/* Header Banner */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <span className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              ⚡
            </span>
            Enterprise Lighthouse CI & Accessibility Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time web performance, WCAG AAA accessibility, and automated SEO audit telemetry
            suite.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
              Average Overall Score
            </span>
            <span className="text-xl font-extrabold text-emerald-400 font-mono">
              {averageOverallScore}/100
            </span>
          </div>
        </div>
      </header>

      {/* Top 4 Metric Summaries */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-xs text-slate-400 font-bold block mb-1">Performance</span>
          <span className="text-2xl font-black text-emerald-400">
            {categorySummaries.performance}
          </span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-xs text-slate-400 font-bold block mb-1">Accessibility (A11y)</span>
          <span className="text-2xl font-black text-blue-400">
            {categorySummaries.accessibility}
          </span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-xs text-slate-400 font-bold block mb-1">Best Practices</span>
          <span className="text-2xl font-black text-purple-400">
            {categorySummaries.bestPractices}
          </span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-xs text-slate-400 font-bold block mb-1">SEO Compliance</span>
          <span className="text-2xl font-black text-amber-400">{categorySummaries.seo}</span>
        </div>
      </section>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search page URL or report ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Showing {reports.length} audit reports
        </span>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <LighthouseReportCard
            key={report.reportId}
            report={report}
            onSelect={(r) => setSelectedReport(r)}
          />
        ))}
      </div>

      {/* Detailed Scorecard Modal / Panel */}
      {selectedReport && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 space-y-4 shadow-2xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-white">
              Lighthouse Metrics for{' '}
              <span className="text-emerald-400">{selectedReport.targetPageUrl}</span>
            </h2>
            <button
              onClick={() => setSelectedReport(null)}
              className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl font-bold hover:bg-slate-700 transition"
            >
              Close Scorecard
            </button>
          </div>
          {selectedReport.auditMetrics.map((m, idx) => (
            <div
              key={idx}
              className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1 text-xs"
            >
              <div className="flex justify-between font-bold text-emerald-400">
                <span>
                  {m.title} [{m.type}]
                </span>
                <span>Score: {m.score}/100</span>
              </div>
              <p className="text-slate-300">{m.recommendation}</p>
            </div>
          ))}
        </div>
      )}

      {/* Audit Logs */}
      <LighthouseAuditTimeline logs={auditLogs} />
    </div>
  )
}
