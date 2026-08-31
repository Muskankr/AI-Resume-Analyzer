import { useState, useMemo } from 'react'
// Import the actual service class (needed for runtime instantiation)
import { CareerRoadmapService } from './CareerRoadmapService'
import type { CareerTrack } from './CareerRoadmapModel'

export default function CareerRoadmapVisualizer() {
  // 1. Service is instantiated as a constant value
  const [service] = useState(() => new CareerRoadmapService())

  // 2. Extracted pure state values to prevent TS6133 "declared but never read" errors
  const [currentRole] = useState<string>('Frontend Engineer')
  const [targetRole] = useState<string>('Staff Frontend Architect')
  const [track] = useState<CareerTrack>('SOFTWARE_ENGINEERING')

  const trajectory = useMemo(() => {
    return service.generateCareerRoadmap(currentRole, targetRole, track)
  }, [service, currentRole, targetRole, track])

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <header className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-semibold rounded-full border border-indigo-500/30 uppercase tracking-wider">
              Career Trajectory & Milestone Engine
            </span>
            <span className="text-slate-400 text-xs font-mono">
              v2.8.0 • Automated Multi-Year Roadmap
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
            Career Path Roadmap Generator
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            Generate step-by-step career progression milestones, required technical competencies,
            and project impact goals to achieve your target title.
          </p>
        </div>
      </header>

      {/* Trajectory Timeline Cards */}
      <div className="space-y-6 mb-8">
        {trajectory.milestones.map((ms, idx) => (
          <div
            key={ms.milestoneId}
            className={`p-6 rounded-xl border transition-all ${
              ms.isCurrentStage
                ? 'bg-slate-900 border-indigo-500/50 shadow-xl shadow-indigo-500/10'
                : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-xs font-mono text-indigo-400 font-bold">
                  STAGE {idx + 1} ({ms.targetTimeframeMonths} Months)
                </span>
                <h3 className="text-xl font-extrabold text-slate-100">{ms.stageTitle}</h3>
              </div>
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full font-mono ${ms.isCurrentStage ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-400'}`}
              >
                {ms.isCurrentStage ? 'CURRENT STAGE' : 'FUTURE TARGET'}
              </span>
            </div>

            <p className="text-xs text-slate-300 font-mono mb-4">
              <strong className="text-indigo-300">Suggested Project Impact: </strong>
              {ms.suggestedProjectImpact}
            </p>

            <div className="flex flex-wrap gap-2">
              {ms.requiredSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-slate-300 text-[11px] rounded-md font-mono"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
