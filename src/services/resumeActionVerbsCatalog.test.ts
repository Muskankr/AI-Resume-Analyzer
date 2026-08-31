/**
 * Unit Tests for Resume Action Verbs Catalog Utilities
 */

import { describe, it, expect } from 'vitest';
import { validateResumeActionVerbStrength, RESUME_ACTION_VERBS_CATALOG } from './resumeActionVerbsCatalog';

describe('ResumeActionVerbsCatalog', () => {
  it('should validate strong engineering leadership action verb in bullet point', () => {
    const isStrong = validateResumeActionVerbStrength('Architected real-time microservices distributed cluster');
    expect(isStrong).toBe(true);
  });

  it('should contain catalog of strong high-impact resume action verbs', () => {
    expect(RESUME_ACTION_VERBS_CATALOG.length).toBeGreaterThanOrEqual(3);
  });
});
