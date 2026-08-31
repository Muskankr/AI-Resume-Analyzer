/**
 * Enterprise Resume Salary Benchmark & Market Value Estimator Service Engine
 * 
 * Architectural Specifications:
 * - Base Salary formula: Base = AnchorRate * (1 + 0.08 * YOE) * SkillMultiplier * LocationMultiplier.
 * - Multipliers:
 *   - Tier 1 Tech Hub (SF/NYC): 1.25x
 *   - Tier 2 Metro: 1.05x
 *   - Remote Global: 1.00x
 *
 * @module SalaryEstimatorService
 * @version 2.7.0
 * @author Enterprise AI Resume Architecture Team
 */

import {
  SalaryBenchmarkQuery,
  CompensationRange,
  SalaryEstimatorState
} from './SalaryEstimatorModel';

export class SalaryEstimatorService {
  private state: SalaryEstimatorState;

  private currencyRates: Record<string, number> = {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    CAD: 1.35,
    INR: 83.5
  };

  constructor(state?: SalaryEstimatorState) {
    this.state = state || new SalaryEstimatorState();
  }

  public getState(): SalaryEstimatorState {
    return this.state;
  }

  /**
   * Estimates market salary benchmarks based on candidate profile telemetry.
   */
  public estimateSalaryRange(query: SalaryBenchmarkQuery = this.state.getQuery()): CompensationRange {
    const anchorSalary = 100000; // $100k USD base anchor
    const experienceMultiplier = 1 + Math.min(query.yearsOfExperience, 15) * 0.07;
    const skillMultiplier = 1 + Math.min(query.detectedSkillsCount, 15) * 0.02;

    let locationMultiplier = 1.0;
    if (query.locationTier === 'TIER_1_TECH_HUB') locationMultiplier = 1.30;
    else if (query.locationTier === 'TIER_2_METRO') locationMultiplier = 1.10;

    const baseMedianUsd = anchorSalary * experienceMultiplier * skillMultiplier * locationMultiplier;

    const fxRate = this.currencyRates[query.currency] || 1.0;

    const p50Median = baseMedianUsd * fxRate;
    const p25Base = p50Median * 0.82;
    const p75Senior = p50Median * 1.20;
    const p90TopTier = p50Median * 1.45;

    const estimatedTargetBonus = p50Median * 0.15; // 15% target bonus
    const estimatedAnnualEquity = p50Median * 0.25; // 25% annual equity grant

    return {
      p25BaseUsd: Number(p25Base.toFixed(0)),
      p50MedianUsd: Number(p50Median.toFixed(0)),
      p75SeniorUsd: Number(p75Senior.toFixed(0)),
      p90TopTierUsd: Number(p90TopTier.toFixed(0)),
      estimatedTargetBonusUsd: Number(estimatedTargetBonus.toFixed(0)),
      estimatedAnnualEquityUsd: Number(estimatedAnnualEquity.toFixed(0)),
      currency: query.currency
    };
  }
}
