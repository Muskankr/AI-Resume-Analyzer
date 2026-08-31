import { synthesizeTechnicalInterviewFeedback } from './mockInterviewSynthesizerUtils';

describe('MockInterviewSynthesizerUtils', () => {
  it('synthesizes high scoring interview evaluations into a STRONG_HIRE recommendation', () => {
    const sysDesignEval = {
      candidateId: 'cand-synth-101',
      promptId: 'prompt-01',
      designScore: 90,
      evaluatedCriteria: { scalabilityScore: 90, faultToleranceScore: 90, dataStorageStrategyScore: 90 },
      strengths: ['Great load balancing design.'],
      omittedKeyConcepts: [],
      verdict: 'ARCHITECT_LEVEL_PASSED' as const,
    };

    const starEval = {
      candidateId: 'cand-synth-101',
      questionId: 'q-star-01',
      starScore: 95,
      structureBreakdown: { situationScore: 100, taskScore: 100, actionScore: 100, resultScore: 100 },
      metricsImpactTier: 'HIGH_QUANTIFIABLE_IMPACT' as const,
      strengths: ['Clear STAR structure.'],
      feedback: [],
    };

    const summary = synthesizeTechnicalInterviewFeedback(
      'cand-synth-101',
      'Alex Smith',
      'Senior Systems Engineer',
      sysDesignEval,
      starEval,
      90
    );

    expect(summary.candidateId).toBe('cand-synth-101');
    expect(summary.overallInterviewScore).toBeGreaterThanOrEqual(88);
    expect(summary.hiringRecommendation).toBe('STRONG_HIRE');
    expect(summary.keyStrengthsSummary.length).toBeGreaterThan(0);
  });
});
