/**
 * Unit Tests for CI Pipeline Audit Utilities
 */

import { describe, it, expect } from 'vitest';
import { auditRepositoryCiPipeline } from './ciPipelineAuditUtils';

describe('CiPipelineAuditUtils', () => {
  it('should audit GitHub Actions CI pipeline build status and test execution duration', () => {
    const res = auditRepositoryCiPipeline('https://github.com/candidate/app', true, true, 42);
    expect(res.hasGithubActionsWorkflow).toBe(true);
    expect(res.isCiBuildPassing).toBe(true);
  });
});
