/**
 * Candidate Behavioral STAR Interview Simulator & Scoring Service
 * Evaluates candidate responses to behavioral interview prompts structured around Situation, Task, Action, and Result (STAR).
 */

export interface StarResponseInput {
  candidateId: string;
  questionId: string;
  situationText: string;
  taskText: string;
  actionText: string;
  resultText: string;
  includedMetrics: string[];
}

export interface StarEvaluationResult {
  candidateId: string;
  questionId: string;
  starScore: number; // 0 - 100
  structureBreakdown: {
    situationScore: number;
    taskScore: number;
    actionScore: number;
    resultScore: number;
  };
  metricsImpactTier: 'HIGH_QUANTIFIABLE_IMPACT' | 'MODERATE_IMPACT' | 'QUALITATIVE_ONLY';
  strengths: string[];
  feedback: string[];
}

/**
 * Evaluates candidate STAR framework response quality.
 */
export function evaluateStarBehavioralResponse(input: StarResponseInput): StarEvaluationResult {
  const evalSection = (text: string, minWords: number): number => {
    if (!text || text.trim().length === 0) return 0;
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount >= minWords) return 100;
    return Math.round((wordCount / minWords) * 100);
  };

  const sitScore = evalSection(input.situationText, 15);
  const taskScore = evalSection(input.taskText, 15);
  const actScore = evalSection(input.actionText, 25);
  const resScore = evalSection(input.resultText, 20);

  let starScore = Math.round(sitScore * 0.15 + taskScore * 0.15 + actScore * 0.4 + resScore * 0.3);

  // Bonus for quantified metrics in results
  if (input.includedMetrics && input.includedMetrics.length > 0) {
    starScore = Math.min(100, starScore + 10);
  }

  const strengths: string[] = [];
  const feedback: string[] = [];

  if (actScore >= 80) {
    strengths.push('Provided detailed description of specific engineering actions taken.');
  } else {
    feedback.push('Elaborate further on the specific technical actions you personally executed.');
  }

  if (input.includedMetrics && input.includedMetrics.length > 0) {
    strengths.push(`Included ${input.includedMetrics.length} quantifiable metrics in the result outcome.`);
  } else {
    feedback.push('Incorporate measurable outcomes (e.g. % performance increase, revenue saved, bug reduction).');
  }

  let metricsTier: StarEvaluationResult['metricsImpactTier'] = 'QUALITATIVE_ONLY';
  if (input.includedMetrics && input.includedMetrics.length >= 2) {
    metricsTier = 'HIGH_QUANTIFIABLE_IMPACT';
  } else if (input.includedMetrics && input.includedMetrics.length === 1) {
    metricsTier = 'MODERATE_IMPACT';
  }

  return {
    candidateId: input.candidateId,
    questionId: input.questionId,
    starScore,
    structureBreakdown: {
      situationScore: sitScore,
      taskScore,
      actionScore: actScore,
      resultScore: resScore,
    },
    metricsImpactTier: metricsTier,
    strengths,
    feedback,
  };
}
