import { evaluateStarBehavioralResponse, StarResponseInput } from './starBehavioralService';

describe('StarBehavioralService', () => {
  it('evaluates complete STAR response with high quantifiable impact', () => {
    const input: StarResponseInput = {
      candidateId: 'cand-star-101',
      questionId: 'q-star-01',
      situationText: 'Our legacy monolithic application was experiencing severe database lock contention during peak traffic hours.',
      taskText: 'My responsibility was to identify bottlenecks and decouple the checkout service without causing downtime.',
      actionText: 'I designed a asynchronous event queue using RabbitMQ, migrated database queries to read replicas, and implemented Redis caching.',
      resultText: 'Reduced checkout latency by 65% and eliminated 100% of peak traffic database lock timeouts.',
      includedMetrics: ['65% latency reduction', '0 lock timeouts'],
    };

    const result = evaluateStarBehavioralResponse(input);

    expect(result.candidateId).toBe('cand-star-101');
    expect(result.starScore).toBe(100);
    expect(result.metricsImpactTier).toBe('HIGH_QUANTIFIABLE_IMPACT');
    expect(result.strengths.length).toBeGreaterThan(0);
  });

  it('handles incomplete STAR response missing quantifiable metrics', () => {
    const input: StarResponseInput = {
      candidateId: 'cand-star-102',
      questionId: 'q-star-02',
      situationText: 'System was slow.',
      taskText: 'Fix it.',
      actionText: 'I refactored code.',
      resultText: 'It got better.',
      includedMetrics: [],
    };

    const result = evaluateStarBehavioralResponse(input);

    expect(result.starScore).toBeLessThan(60);
    expect(result.metricsImpactTier).toBe('QUALITATIVE_ONLY');
    expect(result.feedback.length).toBeGreaterThan(0);
  });
});
