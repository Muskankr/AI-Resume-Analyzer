import React from 'react';
import { calculateResumeStreak } from '../utils/resumeStreak';

export function ResumeStreakBadge({ analysisHistory = [] }) {
  const { hasStreak, totalAnalyses, percentageImprovement, isImproved } = calculateResumeStreak(analysisHistory);

  if (!hasStreak) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg shadow-sm text-xs font-medium text-emerald-800 dark:text-emerald-300">
      <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
      <span>
        {totalAnalyses} analyses, {isImproved ? `+${percentageImprovement}%` : `${percentageImprovement}%`} improvement
      </span>
    </div>
  );
}
