import { evaluateSystemDesignResponse } from './systemDesignEvaluatorUtils';

describe('SystemDesignEvaluatorUtils', () => {
  it('evaluates candidate system design response with high scalability and fault tolerance', () => {
    const input = {
      candidateId: 'cand-sys-101',
      promptId: 'prompt-api-gateway',
      architectureDiagramProvided: true,
      mentionedTechnologies: ['Redis', 'Kafka', 'PostgreSQL', 'Docker'],
      candidateExplanationText:
        'We use a load balancer in front of horizontal scaling worker nodes. For caching, Redis handles session states and rate limiting. We implement message queue buffering using Kafka and circuit breaker failover for fault tolerance.',
    };

    const result = evaluateSystemDesignResponse(input);

    expect(result.candidateId).toBe('cand-sys-101');
    expect(result.designScore).toBeGreaterThanOrEqual(80);
    expect(result.verdict).toBe('ARCHITECT_LEVEL_PASSED');
    expect(result.strengths.length).toBeGreaterThan(0);
  });

  it('handles blank explanation text gracefully', () => {
    const result = evaluateSystemDesignResponse({
      candidateId: 'cand-sys-empty',
      promptId: 'prompt-01',
      architectureDiagramProvided: false,
      mentionedTechnologies: [],
      candidateExplanationText: '',
    });

    expect(result.designScore).toBe(0);
    expect(result.verdict).toBe('NEEDS_REVISION');
  });
});
