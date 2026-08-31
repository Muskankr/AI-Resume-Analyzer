/**
 * Unit Tests for Job Matcher Action Item Engine
 */

import { describe, it, expect } from 'vitest';
import { JobMatcherActionItemEngine } from './JobMatcherActionItemEngine';

describe('JobMatcherActionItemEngine Tests', () => {
  it('should generate targeted recommendations for missing skills', () => {
    const res = JobMatcherActionItemEngine.generateRecommendations(['Docker', 'Kubernetes']);
    expect(res.length).toBe(2);
    expect(res[0].actionText).toContain('Docker');
  });
});
