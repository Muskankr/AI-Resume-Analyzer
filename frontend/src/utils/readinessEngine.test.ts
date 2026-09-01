import { describe, it, expect } from 'vitest';
import { calculateReadinessScore } from './readinessEngine';
import type { ReadinessInputs } from './readinessEngine';

describe('readinessEngine', () => {
  it('calculates full context composite score correctly when JD is provided', () => {
    const inputs: ReadinessInputs = {
      resumeAtsScore: 80,
      experienceYears: 4,
      targetExperienceLevel: 'Mid',
      hasJobDescription: true,
      careerTrackAlignment: 90,
    };

    // experienceScore = 100 (since 4 >= 3 mid limit)
    // compositeScore = (80 * 0.40) + (90 * 0.35) + (100 * 0.25)
    //                = 32 + 31.5 + 25 = 88.5
    // rounded = 89 (Excellent Fit)
    const report = calculateReadinessScore(inputs);
    expect(report.score).toBe(89);
    expect(report.label).toBe('Excellent Fit');
    expect(report.formulaApplied).toContain('Full-Context Matrix');
    expect(report.diagnosticFeedback).toContain('competitive standing against the specific Job Description');
  });

  it('calculates profile-only baseline score correctly when JD is blank (graceful degradation)', () => {
    const inputs: ReadinessInputs = {
      resumeAtsScore: 0, // Should be ignored when hasJobDescription is false
      experienceYears: 2,
      targetExperienceLevel: 'Senior', // experienceScore = (2 / 5) * 100 = 40
      hasJobDescription: false,
      careerTrackAlignment: 75,
    };

    // compositeScore = (75 * 0.60) + (40 * 0.40)
    //                = 45 + 16 = 61
    // rounded = 61 (Developing Fit)
    const report = calculateReadinessScore(inputs);
    expect(report.score).toBe(61);
    expect(report.label).toBe('Developing Fit');
    expect(report.formulaApplied).toContain('Profile-Only Baseline');
    expect(report.diagnosticFeedback).toContain('Calculated without a target Job Description');
  });

  it('clamps readiness score between 0 and 100', () => {
    const lowestInputs: ReadinessInputs = {
      resumeAtsScore: 0,
      experienceYears: 0,
      targetExperienceLevel: 'Senior',
      hasJobDescription: true,
      careerTrackAlignment: 0,
    };

    const lowestReport = calculateReadinessScore(lowestInputs);
    expect(lowestReport.score).toBe(0);
    expect(lowestReport.label).toBe('Awaiting Calibration');

    const highestInputs: ReadinessInputs = {
      resumeAtsScore: 100,
      experienceYears: 10,
      targetExperienceLevel: 'Senior',
      hasJobDescription: true,
      careerTrackAlignment: 100,
    };

    const highestReport = calculateReadinessScore(highestInputs);
    expect(highestReport.score).toBe(100);
    expect(highestReport.label).toBe('Excellent Fit');
  });
});
