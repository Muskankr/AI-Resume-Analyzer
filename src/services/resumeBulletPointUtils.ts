/**
 * Candidate Resume Action Verb & Impact Statement Evaluator
 * Evaluates candidate resume bullet points for strong action verbs, quantifiable achievements,
 * leadership voice indicators, and tech stack specificity.
 */

export interface BulletPointAnalysisResult {
  totalBulletPoints: number;
  strongActionVerbsCount: number;
  quantifiedAchievementsCount: number;
  weakPassivePhrasesCount: number;
  overallImpactScore: number; // 0 - 100
  bulletPointFeedback: Array<{
    bulletIndex: number;
    text: string;
    hasStrongVerb: boolean;
    isQuantified: boolean;
    suggestion?: string;
  }>;
}

export const STRONG_ACTION_VERBS = [
  'Architected',
  'Spearheaded',
  'Engineered',
  'Orchestrated',
  'Implemented',
  'Optimized',
  'Automated',
  'Deployed',
  'Refactored',
  'Designed',
  'Scaled',
  'Streamlined',
];

export const WEAK_PASSIVE_PHRASES = [
  'Responsible for',
  'Worked on',
  'Helped with',
  'Assisted in',
  'Handled',
  'Tasked with',
];

/**
 * Analyzes resume bullet points to evaluate candidate impact statement quality.
 */
export function evaluateResumeBulletPoints(bulletPoints: string[]): BulletPointAnalysisResult {
  if (!bulletPoints || bulletPoints.length === 0) {
    return {
      totalBulletPoints: 0,
      strongActionVerbsCount: 0,
      quantifiedAchievementsCount: 0,
      weakPassivePhrasesCount: 0,
      overallImpactScore: 0,
      bulletPointFeedback: [],
    };
  }

  let strongCount = 0;
  let quantifiedCount = 0;
  let weakCount = 0;

  const feedback: BulletPointAnalysisResult['bulletPointFeedback'] = [];

  bulletPoints.forEach((bullet, index) => {
    const text = bullet.trim();
    const hasStrong = STRONG_ACTION_VERBS.some((verb) => new RegExp(`\\b${verb}\\b`, 'i').test(text));
    const isQuantified = /\b\d+(%|\+|k|x|M|ms|s)?\b/i.test(text);
    const hasWeak = WEAK_PASSIVE_PHRASES.some((phrase) => new RegExp(`\\b${phrase}\\b`, 'i').test(text));

    if (hasStrong) strongCount++;
    if (isQuantified) quantifiedCount++;
    if (hasWeak) weakCount++;

    let suggestion: string | undefined = undefined;
    if (hasWeak) {
      suggestion = 'Replace passive phrasing (e.g. "Worked on") with a strong active verb (e.g. "Engineered").';
    } else if (!isQuantified) {
      suggestion = 'Add quantifiable metrics (e.g. "reduced latency by 35%" or "managed 10k users").';
    }

    feedback.push({
      bulletIndex: index,
      text,
      hasStrongVerb: hasStrong,
      isQuantified,
      suggestion,
    });
  });

  const total = bulletPoints.length;
  const verbPct = (strongCount / total) * 40;
  const quantPct = (quantifiedCount / total) * 40;
  const passivePenalty = (weakCount / total) * 20;

  const score = Math.max(0, Math.min(100, Math.round(verbPct + quantPct + (20 - passivePenalty))));

  return {
    totalBulletPoints: total,
    strongActionVerbsCount: strongCount,
    quantifiedAchievementsCount: quantifiedCount,
    weakPassivePhrasesCount: weakCount,
    overallImpactScore: score,
    bulletPointFeedback: feedback,
  };
}
