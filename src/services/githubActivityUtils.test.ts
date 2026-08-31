/**
 * Unit Tests for GitHub Activity Utilities
 */

import { describe, it, expect } from 'vitest';
import { evaluateGithubCommitActivity } from './githubActivityUtils';

describe('GithubActivityUtils', () => {
  it('should validate active GitHub open-source contribution streak', () => {
    const res = evaluateGithubCommitActivity(320, 14);
    expect(res.totalCommitsLastYear).toBe(320);
    expect(res.isContributionActive).toBe(true);
  });
});
