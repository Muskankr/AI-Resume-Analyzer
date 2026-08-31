/**
 * Candidate System Design Interview Prompt & Scoring Evaluator
 * Evaluates candidate responses to complex system design prompts (e.g. Rate Limiters, Distributed Caches, URL Shorteners)
 * against scalability criteria, data partitioning strategies, and fault tolerance patterns.
 */

export interface SystemDesignResponseInput {
  candidateId: string;
  promptId: string;
  architectureDiagramProvided: boolean;
  mentionedTechnologies: string[];
  candidateExplanationText: string;
}

export interface SystemDesignEvaluationResult {
  candidateId: string;
  promptId: string;
  designScore: number; // 0 - 100
  evaluatedCriteria: {
    scalabilityScore: number;
    faultToleranceScore: number;
    dataStorageStrategyScore: number;
  };
  strengths: string[];
  omittedKeyConcepts: string[];
  verdict: 'ARCHITECT_LEVEL_PASSED' | 'STRONG_DESIGN_ATTEMPT' | 'NEEDS_REVISION';
}

export const SCALABILITY_KEY_TERMS = [
  'load balancer',
  'horizontal scaling',
  'caching',
  'cdn',
  'partitioning',
  'sharding',
  'replication',
  'message queue',
];

export const FAULT_TOLERANCE_KEY_TERMS = [
  'circuit breaker',
  'failover',
  'redundancy',
  'disaster recovery',
  'health check',
  'graceful degradation',
];

/**
 * Evaluates candidate explanation text for system design prompt responses.
 */
export function evaluateSystemDesignResponse(
  input: SystemDesignResponseInput
): SystemDesignEvaluationResult {
  if (!input.candidateExplanationText || input.candidateExplanationText.trim().length === 0) {
    return {
      candidateId: input.candidateId,
      promptId: input.promptId,
      designScore: 0,
      evaluatedCriteria: {
        scalabilityScore: 0,
        faultToleranceScore: 0,
        dataStorageStrategyScore: 0,
      },
      strengths: [],
      omittedKeyConcepts: [...SCALABILITY_KEY_TERMS, ...FAULT_TOLERANCE_KEY_TERMS],
      verdict: 'NEEDS_REVISION',
    };
  }

  const text = input.candidateExplanationText.toLowerCase();

  // Check Scalability
  const matchedScalability = SCALABILITY_KEY_TERMS.filter((term) => text.includes(term));
  const scalabilityScore = Math.min(100, Math.round((matchedScalability.length / 4) * 100));

  // Check Fault Tolerance
  const matchedFault = FAULT_TOLERANCE_KEY_TERMS.filter((term) => text.includes(term));
  const faultScore = Math.min(100, Math.round((matchedFault.length / 3) * 100));

  // Storage Strategy
  let storageScore = input.mentionedTechnologies.length * 20;
  if (text.includes('nosql') || text.includes('sql') || text.includes('redis')) storageScore += 20;
  storageScore = Math.min(100, storageScore);

  let overallScore = Math.round(scalabilityScore * 0.4 + faultScore * 0.4 + storageScore * 0.2);
  if (input.architectureDiagramProvided) overallScore = Math.min(100, overallScore + 10);

  const strengths: string[] = [];
  if (matchedScalability.length >= 3) {
    strengths.push(`Demonstrated solid grasp of scalability concepts (${matchedScalability.slice(0, 3).join(', ')}).`);
  }
  if (input.architectureDiagramProvided) {
    strengths.push('Provided structured architecture diagram illustrating data flows.');
  }

  const omitted = SCALABILITY_KEY_TERMS.filter((t) => !text.includes(t)).concat(
    FAULT_TOLERANCE_KEY_TERMS.filter((t) => !text.includes(t))
  );

  let verdict: SystemDesignEvaluationResult['verdict'] = 'STRONG_DESIGN_ATTEMPT';
  if (overallScore >= 80) verdict = 'ARCHITECT_LEVEL_PASSED';
  else if (overallScore < 50) verdict = 'NEEDS_REVISION';

  return {
    candidateId: input.candidateId,
    promptId: input.promptId,
    designScore: overallScore,
    evaluatedCriteria: {
      scalabilityScore,
      faultToleranceScore: faultScore,
      dataStorageStrategyScore: storageScore,
    },
    strengths,
    omittedKeyConcepts: omitted.slice(0, 5),
    verdict,
  };
}
