import { describe, it, expect } from 'vitest';
import { estimateExperienceFromText } from './experienceParser';

describe('experienceParser', () => {
  it('correctly extracts month name ranges and calculates Junior experience', () => {
    const text = 'Software Engineering Intern: Jan 2022 - Jun 2022. Worked on core APIs.';
    const result = estimateExperienceFromText(text);
    // 5 months = 0.4 years -> Junior
    expect(result.estimatedYears).toBe(0.4);
    expect(result.suggestedLevel).toBe('Junior');
  });

  it('correctly extracts MM/YYYY ranges and calculates Mid-level experience', () => {
    const text = 'Full Stack Engineer: 03/2018 - 09/2021. Built scalable frontend apps.';
    const result = estimateExperienceFromText(text);
    // 42 months = 3.5 years -> Mid
    expect(result.estimatedYears).toBe(3.5);
    expect(result.suggestedLevel).toBe('Mid');
  });

  it('correctly extracts Senior experience and handles Present dates', () => {
    const text = 'Lead Engineer: Jan 2017 - Present. Designing architecture and patterns.';
    const result = estimateExperienceFromText(text);
    // Jan 2017 to Present (e.g. 2026) -> ~9 years -> Lead
    expect(result.estimatedYears).toBeGreaterThanOrEqual(8);
    expect(result.suggestedLevel).toBe('Lead');
  });

  it('returns baseline adjustment for long texts with no dates', () => {
    const text = 'A'.repeat(2000); // Long text with no dates
    const result = estimateExperienceFromText(text);
    expect(result.estimatedYears).toBe(1.5);
    expect(result.suggestedLevel).toBe('Junior');
  });

  it('returns 0 for short texts with no dates', () => {
    const text = 'Software Developer';
    const result = estimateExperienceFromText(text);
    expect(result.estimatedYears).toBe(0);
    expect(result.suggestedLevel).toBe('Junior');
  });
});
