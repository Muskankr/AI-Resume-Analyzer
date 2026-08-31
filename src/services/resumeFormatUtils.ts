/**
 * AI Resume Formatting & Layout Density Telemetry Utilities
 */

export interface ResumeFormatMetrics {
  pageCount: number;
  wordCount: number;
  hasUnreadableTablesOrImages: boolean;
  isLengthOptimal: boolean;
}

/**
 * Validates resume page length and formatting layout density.
 */
export function evaluateResumeFormatDensity(
  pageCount: number,
  wordCount: number,
  hasTables: boolean
): ResumeFormatMetrics {
  const isOptimal = pageCount <= 2 && wordCount >= 300 && wordCount <= 1200;

  return {
    pageCount,
    wordCount,
    hasUnreadableTablesOrImages: hasTables,
    isLengthOptimal: isOptimal,
  };
}
