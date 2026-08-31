/**
 * Unit Tests for Salary Negotiation Engine
 */

import { describe, it, expect } from 'vitest';
import { SalaryNegotiationEngine } from './SalaryNegotiationEngine';

describe('SalaryNegotiationEngine Tests', () => {
  it('should evaluate low offer and recommend counter offer', () => {
    const res = SalaryNegotiationEngine.evaluateOffer(90000, 120000);
    expect(res.negotiationRecommendation).toContain('below market p50 median');
  });
});
