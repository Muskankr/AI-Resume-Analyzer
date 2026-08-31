/**
 * Candidate Coding Architecture Pattern & Framework Diversity Telemetry Utilities
 */

export interface FrameworkDiversityMetrics {
  totalFrameworksUsedCount: number;
  detectedFrameworks: string[];
  isPolyglotDeveloperFlagged: boolean;
}

/**
 * Validates candidate technical versatility and multi-framework polyglot engineering depth.
 */
export function evaluateCandidateFrameworkDiversity(
  frameworks: string[]
): FrameworkDiversityMetrics {
  const isPolyglot = frameworks.length >= 4;

  return {
    totalFrameworksUsedCount: frameworks.length,
    detectedFrameworks: frameworks,
    isPolyglotDeveloperFlagged: isPolyglot,
  };
}
