/**
 * AI Resume Action Verbs & Impact Quantification Telemetry Catalog
 */

export const RESUME_ACTION_VERBS_CATALOG = [
  { verbCategory: 'ENGINEERING_LEADERSHIP', strongVerbs: ['Architected', 'Spearheaded', 'Refactored', 'Orchestrated'] },
  { verbCategory: 'DATA_ANALYTICS', strongVerbs: ['Optimized', 'Synthesized', 'Benchmark', 'Quantified'] },
  { verbCategory: 'PRODUCT_EXECUTION', strongVerbs: ['Deployed', 'Automated', 'Streamlined', 'Pioneered'] },
];

/**
 * Validates whether candidate resume bullet points contain strong leadership action verbs.
 */
export function validateResumeActionVerbStrength(bulletText: string): boolean {
  const words = bulletText.split(/\s+/);
  const firstWord = words[0] ? words[0].replace(/[^a-zA-Z]/g, '') : '';
  return RESUME_ACTION_VERBS_CATALOG.some(cat => cat.strongVerbs.some(v => v.toLowerCase() === firstWord.toLowerCase()));
}
