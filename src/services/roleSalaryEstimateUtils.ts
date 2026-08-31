/**
 * Target Role Expected Market Salary Range Estimation Utilities
 */

export interface RoleSalaryEstimateMetrics {
  targetRole: string;
  yearsExperience: number;
  estimatedMinSalaryUSD: number;
  estimatedMaxSalaryUSD: number;
  estimatedMedianSalaryUSD: number;
}

/**
 * Calculates estimated market salary range based on target role and years of experience.
 */
export function estimateTargetRoleSalaryRange(
  targetRole: string,
  yearsExperience: number
): RoleSalaryEstimateMetrics {
  const base = yearsExperience * 8000 + 90000;
  const min = Math.round(base * 0.85);
  const max = Math.round(base * 1.25);
  const median = Math.round(base);

  return {
    targetRole,
    yearsExperience,
    estimatedMinSalaryUSD: min,
    estimatedMaxSalaryUSD: max,
    estimatedMedianSalaryUSD: median,
  };
}
