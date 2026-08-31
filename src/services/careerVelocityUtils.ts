/**
 * Candidate Career Progression & Promotion Velocity Telemetry Utilities
 */

export interface CareerVelocityMetrics {
  candidateId: string;
  totalPromotionsCount: number;
  averageYearsPerRole: number;
  careerGrowthTrajectory: 'RAPID_PROMOTION_HIGH_POTENTIAL' | 'STEADY_STABLE_GROWTH' | 'STAGNANT_CAREER_WARNING';
}

/**
 * Calculates candidate career promotion velocity and growth trajectory telemetry.
 */
export function calculateCandidateCareerVelocity(
  candidateId: string,
  totalRoles: number,
  totalPromotions: number,
  totalYears: number
): CareerVelocityMetrics {
  const avgYears = totalRoles > 0 ? Math.round((totalYears / totalRoles) * 10) / 10 : 0;
  let trajectory: CareerVelocityMetrics['careerGrowthTrajectory'] = 'STEADY_STABLE_GROWTH';
  if (totalPromotions >= 2 && avgYears <= 2.5) trajectory = 'RAPID_PROMOTION_HIGH_POTENTIAL';

  return {
    candidateId,
    totalPromotionsCount: totalPromotions,
    averageYearsPerRole: avgYears,
    careerGrowthTrajectory: trajectory,
  };
}
