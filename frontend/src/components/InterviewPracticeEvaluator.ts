/**
 * Interview Prep Practice Mode & Score Evaluator Extensions
 */

export interface PracticeEvaluationResult {
  score: number;
  hasQuantifiedMetricInResult: boolean;
  feedback: string;
}

export class InterviewPracticeEvaluator {
  public static evaluateAnswer(answerText: string): PracticeEvaluationResult {
    const hasMetric = /\d+%|\d+x|\$\d+|\d+ms/i.test(answerText);
    const score = hasMetric ? 90 : 65;

    return {
      score,
      hasQuantifiedMetricInResult: hasMetric,
      feedback: hasMetric
        ? 'Excellent STAR response! Quantified metrics clearly highlight business impact.'
        : 'Good response. Try adding quantified metrics (% improvement, latency reduction, cost savings) to your Result section.'
    };
  }
}
