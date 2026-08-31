/**
 * Unit Tests for Career Velocity Utilities
 */

import { describe, it, expect } from 'vitest';
import { calculateCandidateCareerVelocity } from './careerVelocityUtils';

describe('CareerVelocityUtils', () => {
  it('should evaluate rapid promotion trajectory for candidate with 2+ promotions and <= 2.5 yrs avg role duration', () => {
    const res = calculateCandidateCareerVelocity('CAN-901', 3, 2, 6);
    expect(res.averageYearsPerRole).toBe(2.0);
    expect(res.careerGrowthTrajectory).toBe('RAPID_PROMOTION_HIGH_POTENTIAL');
  });
});
