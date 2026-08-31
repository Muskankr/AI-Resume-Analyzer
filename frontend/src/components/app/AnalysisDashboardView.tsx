import React from 'react'
import { AtsScore } from '../../AtsScore'
import { ScoreBreakdown, type ScoreBreakdownData } from '../ScoreBreakdown'
import { FormattingChecks, type FormattingChecksData } from '../FormattingChecks'
import { TimelinePanel } from '../TimelinePanel'
import { type TimelineData } from '../../utils/timelineFormat'
import { SuggestionVote, type VoteValue } from '../SuggestionVote'
import { ShareResult } from '../ShareResult'
import { Sparkles, ThumbsUp, HelpCircle } from 'lucide-react'

export interface AnalysisDashboardViewProps {
  score: number
  scoreBreakdown?: ScoreBreakdownData | null
  formattingChecks?: FormattingChecksData | null
  timeline?: TimelineData | null
  matchedSkills?: string[]
  missingSkills?: string[]
  suggestions?: string[]
  votes?: Record<number, VoteValue>
  onVote?: (index: number, vote: VoteValue) => void
  analysisToken?: string | null
  analysisId?: number | null
}

export const AnalysisDashboardView: React.FC<AnalysisDashboardViewProps> = ({
  score,
  scoreBreakdown,
  formattingChecks,
  timeline,
  matchedSkills = [],
  missingSkills = [],
  suggestions = [],
  votes = {},
  onVote,
  analysisToken,
  analysisId,
}) => {
  return (
    <div className="analysis-dashboard-view space-y-8" data-testid="analysis-dashboard-view">
      {/* Top Score Banner & Share Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        <div className="md:col-span-1 flex flex-col justify-center items-center p-6 bg-slate-900 text-white rounded-2xl shadow-lg border border-slate-800">
          <AtsScore score={score} />
        </div>

        <div className="md:col-span-2 flex flex-col justify-between p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles size={18} className="text-blue-500" />
              <span>ATS Analysis Completed</span>
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Your resume was evaluated against industry ATS parsing algorithms and target skills.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <ShareResult score={score} analysisId={analysisId ?? undefined} token={analysisToken ?? undefined} />
          </div>
        </div>
      </div>

      {/* Score Breakdown Section */}
      {scoreBreakdown && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <ScoreBreakdown data={scoreBreakdown} />
        </div>
      )}

      {/* Formatting Checks */}
      {formattingChecks && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <FormattingChecks data={formattingChecks} />
        </div>
      )}

      {/* Timeline Panel */}
      {timeline && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <TimelinePanel data={timeline} />
        </div>
      )}

      {/* Skills Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Matched Skills */}
        <div className="p-6 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl">
          <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>✓</span> Matched Skills ({matchedSkills.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {matchedSkills.length > 0 ? (
              matchedSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                >
                  {skill}
                </span>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">No matched skills detected yet.</p>
            )}
          </div>
        </div>

        {/* Missing Skills */}
        <div className="p-6 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl">
          <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>✕</span> Missing Skills ({missingSkills.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {missingSkills.length > 0 ? (
              missingSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
                >
                  {skill}
                </span>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">Great job! No missing skills identified.</p>
            )}
          </div>
        </div>
      </div>

      {/* AI Improvement Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ThumbsUp size={18} className="text-blue-500" />
            <span>Actionable ATS Suggestions</span>
          </h3>
          <ul className="space-y-3">
            {suggestions.map((suggestion, idx) => (
              <li
                key={idx}
                className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"
              >
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {suggestion}
                  </p>
                </div>
                {onVote && (
                  <SuggestionVote
                    suggestionId={idx}
                    currentVote={votes[idx] || null}
                    onVote={(vote) => onVote(idx, vote)}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
