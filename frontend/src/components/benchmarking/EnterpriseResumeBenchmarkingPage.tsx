import React, { useState } from 'react'
import type { IndustryPeerComparison, PeerBenchmarkFilterQuery } from './types'
import { ResumeBenchmarkingEngine } from './ResumeBenchmarkingEngine'
import { BenchmarkCard } from './BenchmarkCard'
import { BenchmarkAuditTimeline } from './BenchmarkAuditTimeline'

export const EnterpriseResumeBenchmarkingPage: React.FC = () => {
  const [filters, setFilters] = useState<PeerBenchmarkFilterQuery>({
    industryDomain: 'All',
    experienceLevel: 'All',
    search: '',
  })

  const [selectedComparison, setSelectedComparison] = useState<IndustryPeerComparison | null>(null)
  const [auditLogs, setAuditLogs] = useState(ResumeBenchmarkingEngine.getAuditLogs())

  const comparisons = ResumeBenchmarkingEngine.getComparisons(filters)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: e.target.value }))
  }

  const handleIndustryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, industryDomain: e.target.value }))
  }

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, experienceLevel: e.target.value }))
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Enterprise Feature Suite
              </span>
              <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold px-3 py-1 rounded-full">
                AI Percentile Analytics
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Enterprise Resume Benchmarking & Peer Score Matrix
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Compare candidate resumes against real-world ATS benchmarks, industry keyword
              distributions, and percentile metrics across 14,000+ top candidate profiles.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const newLog = {
                  id: `LOG-${Date.now()}`,
                  timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                  action: 'BENCHMARK_CALCULATED' as const,
                  details: 'Recalculated full peer cohort benchmark index.',
                  performer: 'Admin User',
                  scoreDelta: 'Updated',
                }
                setAuditLogs((prev) => [newLog, ...prev])
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-200 transition-all shadow-md flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh Benchmarks
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Search Target Role or Industry
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={handleSearchChange}
              placeholder="e.g. Senior Full Stack Engineer, AI Infrastructure..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none transition-all placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Industry Domain</label>
            <select
              value={filters.industryDomain}
              onChange={handleIndustryChange}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none transition-all"
            >
              <option value="All">All Domains</option>
              <option value="FinTech & Banking">FinTech & Banking</option>
              <option value="Artificial Intelligence / DeepTech">AI / DeepTech</option>
              <option value="SaaS & Enterprise Cloud">SaaS & Enterprise Cloud</option>
              <option value="Healthcare & HealthTech">Healthcare & HealthTech</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Seniority Level</label>
            <select
              value={filters.experienceLevel}
              onChange={handleLevelChange}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none transition-all"
            >
              <option value="All">All Levels</option>
              <option value="Entry-Level">Entry-Level</option>
              <option value="Mid-Career">Mid-Career</option>
              <option value="Senior">Senior</option>
              <option value="Executive">Executive</option>
            </select>
          </div>
        </div>

        {/* Cards Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-white">Target Role Peer Benchmarks</h2>
            <span className="text-xs text-slate-400 font-medium">
              Showing {comparisons.length} Role Profiles
            </span>
          </div>

          {comparisons.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              No peer benchmark profiles found matching current filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {comparisons.map((item, idx) => (
                <BenchmarkCard
                  key={idx}
                  comparison={item}
                  onSelect={(c) => setSelectedComparison(c)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Selected Modal Detail / Full Analysis Section */}
        {selectedComparison && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl relative">
              <button
                onClick={() => setSelectedComparison(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>

              <h2 className="text-2xl font-black text-white">
                {selectedComparison.targetRole} Benchmark Report
              </h2>

              <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-xs text-slate-400 block">Candidate Score</span>
                  <span className="text-xl font-bold text-emerald-400">
                    {selectedComparison.userScore} / 100
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Industry Average</span>
                  <span className="text-xl font-bold text-blue-400">
                    {selectedComparison.industryAverageScore} / 100
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Recommended Certifications
                </h4>
                <ul className="space-y-2">
                  {selectedComparison.recommendedCertifications.map((cert, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {cert}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => setSelectedComparison(null)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all"
              >
                Close Detailed Report
              </button>
            </div>
          </div>
        )}

        {/* Telemetry Timeline Section */}
        <BenchmarkAuditTimeline logs={auditLogs} />
      </div>
    </div>
  )
}
