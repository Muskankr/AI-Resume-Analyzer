/**
 * Unit Tests for Framework Diversity Utilities
 */

import { describe, it, expect } from 'vitest';
import { evaluateCandidateFrameworkDiversity } from './frameworkDiversityUtils';

describe('FrameworkDiversityUtils', () => {
  it('should flag polyglot developer status when candidate uses 4+ frameworks across projects', () => {
    const res = evaluateCandidateFrameworkDiversity(['React', 'Node.js', 'PyTorch', 'Go', 'Docker']);
    expect(res.totalFrameworksUsedCount).toBe(5);
    expect(res.isPolyglotDeveloperFlagged).toBe(true);
  });
});
