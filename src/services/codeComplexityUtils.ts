/**
 * Portfolio Project Code Cyclomatic Complexity & Maintainability Index Utilities
 */

export interface CodeComplexityMetrics {
  cyclomaticComplexityNumber: number;
  maintainabilityIndexScore: number;
  isCodeCleanAndMaintainable: boolean;
}

/**
 * Calculates code cyclomatic complexity and maintainability index score.
 */
export function calculateCodeComplexityMetrics(
  complexityNum: number,
  maintainabilityScore: number
): CodeComplexityMetrics {
  const isMaintainable = complexityNum <= 10 && maintainabilityScore >= 70;

  return {
    cyclomaticComplexityNumber: complexityNum,
    maintainabilityIndexScore: maintainabilityScore,
    isCodeCleanAndMaintainable: isMaintainable,
  };
}
