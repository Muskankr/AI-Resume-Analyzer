/**
 * Resume Grammar & Proofreading Telemetry Utilities
 */

export interface ResumeGrammarMetrics {
  totalSpellingErrors: number;
  totalGrammarWarnings: number;
  grammarQualityScorePercent: number;
  isGrammarAuditPassed: boolean;
}

/**
 * Evaluates candidate resume spelling, grammar errors, and overall proofreading score.
 */
export function evaluateResumeGrammarQuality(
  spellingErrors: number,
  grammarWarnings: number,
  totalWordCount: number
): ResumeGrammarMetrics {
  const penalty = (spellingErrors * 5 + grammarWarnings * 2) / (totalWordCount / 100);
  const score = Math.max(0, Math.round(100 - penalty));

  return {
    totalSpellingErrors: spellingErrors,
    totalGrammarWarnings: grammarWarnings,
    grammarQualityScorePercent: score,
    isGrammarAuditPassed: score >= 90,
  };
}
