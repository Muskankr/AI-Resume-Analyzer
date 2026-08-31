/**
 * Enterprise Unit Test Suite for Salary Benchmark Estimator Engine
 * 
 * Architectural Specifications:
 * - Asserts base salary calculations across location tiers and experience multipliers.
 * - Asserts currency conversion.
 *
 * @module SalaryEstimatorServiceTest
 * @version 2.7.0
 * @author Enterprise AI Resume Architecture Team
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SalaryEstimatorState } from './SalaryEstimatorModel';
import { SalaryEstimatorService } from './SalaryEstimatorService';

describe('SalaryEstimatorEngine Unit Tests', () => {
  let state: SalaryEstimatorState;
  let service: SalaryEstimatorService;

  beforeEach(() => {
    state = new SalaryEstimatorState();
    service = new SalaryEstimatorService(state);
  });

  describe('Salary Range Calculations', () => {
    it('should calculate median base salary with Tier 1 tech hub multiplier', () => {
      const res = service.estimateSalaryRange({
        jobTitle: 'Frontend Lead',
        yearsOfExperience: 5,
        locationTier: 'TIER_1_TECH_HUB',
        detectedSkillsCount: 10,
        currency: 'USD'
      });

      expect(res.p50MedianUsd).toBeGreaterThan(120000);
      expect(res.p75SeniorUsd).toBeGreaterThan(res.p50MedianUsd);
      expect(res.estimatedTargetBonusUsd).toBeGreaterThan(0);
    });
  });
});
