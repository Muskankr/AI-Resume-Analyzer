/**
 * Unit Tests for ATS Keyword Density Utilities
 */

import { describe, it, expect } from 'vitest';
import { calculateAtsKeywordDensity } from './atsKeywordDensityUtils';

describe('AtsKeywordDensityUtils', () => {
  it('should flag ATS keyword stuffing alert when keyword density > 7%', () => {
    const text = 'TypeScript React TypeScript TypeScript TypeScript TypeScript TypeScript TypeScript TypeScript TypeScript';
    const res = calculateAtsKeywordDensity(text, 'TypeScript');
    expect(res.isKeywordSpammingFlagged).toBe(true);
  });
});
