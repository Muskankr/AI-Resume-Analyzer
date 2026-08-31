/**
 * Candidate Technical Mock Interview Feedback Synthesizer Utility
 * Aggregates evaluations across System Design, Coding Algorithms, Framework Deep Dives, and STAR Behavioral modules
 * to produce a unified technical hiring recommendation and report.
 */

import { SystemDesignEvaluationResult } from './systemDesignEvaluatorUtils';
import { StarEvaluationResult } from './starBehavioralService';

export interface TechnicalMockInterviewSummary {
  candidateId: string;
  candidateName: string;
  targetRole: string;
  overallInterviewScore: number; // 0 - 100
  hiringRecommendation: 'STRONG_HIRE' | 'HIRE' | 'LEAN_HIRE' | 'DO_NOT_HIRE';
  systemDesignScore: number;
  behavioralStarScore: number;
  technicalDepthScore: number;
  keyStrengthsSummary: string[];
  growthAreasSummary: string[];
  generatedAt: string;
}

/**
 * Synthesizes mock interview evaluations into a final hiring recommendation report.
 */
export function synthesizeTechnicalInterviewFeedback(
  candidateId: string,
  candidateName: string,
  targetRole: string,
  systemDesignEval?: SystemDesignEvaluationResult,
  starEval?: StarEvaluationResult,
  technicalDepthScore = 75
): TechnicalMockInterviewSummary {
  const sysDesignScore = systemDesignEval ? systemDesignEval.designScore : 50;
  const starScore = starEval ? starEval.starScore : 50;

  const overallScore = Math.round(sysDesignScore * 0.35 + starScore * 0.3 + technicalDepthScore * 0.35);

  let rec: TechnicalMockInterviewSummary['hiringRecommendation'] = 'HIRE';
  if (overallScore >= 88) rec = 'STRONG_HIRE';
  else if (overallScore >= 75) rec = 'HIRE';
  else if (overallScore >= 60) rec = 'LEAN_HIRE';
  else rec = 'DO_NOT_HIRE';

  const strengths: string[] = [];
  const growthAreas: string[] = [];

  if (systemDesignEval) {
    strengths.push(...systemDesignEval.strengths);
    if (systemDesignEval.omittedKeyConcepts.length > 0) {
      growthAreas.push(`System Design: review concepts like ${systemDesignEval.omittedKeyConcepts.slice(0, 2).join(', ')}.`);
    }
  }

  if (starEval) {
    strengths.push(...starEval.strengths);
    growthAreas.push(...starEval.feedback);
  }

  return {
    candidateId,
    candidateName,
    targetRole,
    overallInterviewScore: overallScore,
    hiringRecommendation: rec,
    systemDesignScore: sysDesignScore,
    behavioralStarScore: starScore,
    technicalDepthScore,
    keyStrengthsSummary: Array.from(new Set(strengths)),
    growthAreasSummary: Array.from(new Set(growthAreas)),
    generatedAt: new Date().toISOString(),
  };
}
