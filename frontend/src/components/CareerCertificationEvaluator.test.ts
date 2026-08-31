/**
 * Unit Tests for Career Certification Evaluator
 */

import { describe, it, expect } from 'vitest';
import { CareerCertificationEvaluator } from './CareerCertificationEvaluator';

describe('CareerCertificationEvaluator Tests', () => {
  it('should recommend AWS & Kubernetes certifications for Software Engineering track', () => {
    const certs = CareerCertificationEvaluator.evaluateCertifications('SOFTWARE_ENGINEERING');
    expect(certs.length).toBe(2);
    expect(certs[0].certificationName).toContain('AWS');
  });
});
