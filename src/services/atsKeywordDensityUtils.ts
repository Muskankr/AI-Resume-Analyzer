/**
 * ATS Keyword Frequency Density & Hard Skill Extraction Utilities
 */

export interface KeywordDensityMetrics {
  totalKeywordOccurrences: number;
  keywordDensityPercent: number;
  isKeywordSpammingFlagged: boolean;
}

/**
 * Calculates ATS keyword frequency density and flags keyword stuffing/spamming.
 */
export function calculateAtsKeywordDensity(
  resumeText: string,
  targetKeyword: string
): KeywordDensityMetrics {
  const words = resumeText.toLowerCase().split(/\s+/);
  const total = words.length;
  const count = words.filter(w => w.includes(targetKeyword.toLowerCase())).length;

  const density = total > 0 ? Math.round((count / total) * 100.0 * 10) / 10 : 0;
  const spamming = density > 7.0; // Density > 7% is flagged as ATS keyword stuffing

  return {
    totalKeywordOccurrences: count,
    keywordDensityPercent: density,
    isKeywordSpammingFlagged: spamming,
  };
}
