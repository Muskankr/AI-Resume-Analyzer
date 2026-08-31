/**
 * Candidate Technical Interview Readiness & Skill Depth Telemetry Utilities
 */

export interface InterviewReadinessMetrics {
  candidateId: string;
  interviewPrepScorePercent: number;
  recommendedTechnicalTopics: string[];
  isReadyForTechnicalScreen: boolean;
}

/**
 * Calculates candidate interview readiness score based on skill overlap and years of experience.
 */
export function calculateCandidateInterviewReadiness(
  candidateId: string,
  matchScorePercent: number,
  yearsExperience: number
): InterviewReadinessMetrics {
  const prepScore = Math.min(100, Math.round(matchScorePercent * 0.7 + yearsExperience * 5));
  const topics: string[] = ['System Architecture & Scalability', 'Distributed Locking & Caching', 'CI/CD Pipeline Security'];

  return {
    candidateId,
    interviewPrepScorePercent: prepScore,
    recommendedTechnicalTopics: topics,
    isReadyForTechnicalScreen: prepScore >= 70,
  };
}
