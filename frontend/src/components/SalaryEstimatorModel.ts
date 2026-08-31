/**
 * Enterprise Resume Salary Benchmark & Market Value Estimator Model
 * 
 * Architectural Specifications:
 * - Calculates estimated market salary ranges (p25, p50 median, p75, p90) based on detected resume skills, job title, location tier, and years of experience.
 * - Compensation breakdown: Base Salary, Target Annual Bonus, Equity Grant Value.
 * - Supports currency conversion (USD, EUR, GBP, CAD, INR).
 *
 * @module SalaryEstimatorModel
 * @version 2.7.0
 * @author Enterprise AI Resume Architecture Team
 */

export type LocationTier = 'TIER_1_TECH_HUB' | 'TIER_2_METRO' | 'REMOTE_GLOBAL';

export interface SalaryBenchmarkQuery {
  jobTitle: string;
  yearsOfExperience: number;
  locationTier: LocationTier;
  detectedSkillsCount: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'INR';
}

export interface CompensationRange {
  p25BaseUsd: number;
  p50MedianUsd: number;
  p75SeniorUsd: number;
  p90TopTierUsd: number;
  estimatedTargetBonusUsd: number;
  estimatedAnnualEquityUsd: number;
  currency: string;
}

export class SalaryEstimatorState {
  private query: SalaryBenchmarkQuery = {
    jobTitle: 'Senior Frontend Engineer',
    yearsOfExperience: 5,
    locationTier: 'TIER_1_TECH_HUB',
    detectedSkillsCount: 8,
    currency: 'USD'
  };

  public getQuery(): SalaryBenchmarkQuery {
    return { ...this.query };
  }
}
