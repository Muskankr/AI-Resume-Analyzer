/**
 * AI Resume Keyword Density & ATS Compatibility Analyzer
 * Analyzes resume content against industry Applicant Tracking System (ATS) parsing rules,
 * section layout conventions, contact information completeness, and keyword frequency.
 */

export interface AtsParseResult {
  candidateId: string;
  atsCompatibilityScore: number; // 0 - 100
  isAtsFriendlyFormat: boolean;
  hasContactEmail: boolean;
  hasPhone: boolean;
  hasLinkedInUrl: boolean;
  hasGitHubUrl: boolean;
  detectedSectionHeaders: string[];
  missingStandardHeaders: string[];
  keywordDensityMap: Record<string, number>;
  formattingWarnings: string[];
}

export const STANDARD_RESUME_HEADERS = [
  'Work Experience',
  'Education',
  'Skills',
  'Projects',
  'Certifications',
];

/**
 * Analyzes raw resume text content for ATS compatibility and layout compliance.
 */
export function analyzeAtsCompatibility(
  candidateId: string,
  rawResumeText: string
): AtsParseResult {
  if (!rawResumeText || rawResumeText.trim().length === 0) {
    return {
      candidateId,
      atsCompatibilityScore: 0,
      isAtsFriendlyFormat: false,
      hasContactEmail: false,
      hasPhone: false,
      hasLinkedInUrl: false,
      hasGitHubUrl: false,
      detectedSectionHeaders: [],
      missingStandardHeaders: STANDARD_RESUME_HEADERS,
      keywordDensityMap: {},
      formattingWarnings: ['Resume text content is empty.'],
    };
  }

  const text = rawResumeText;

  // Contact checks
  const hasContactEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const hasPhone = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text);
  const hasLinkedInUrl = /linkedin\.com\/in\/[a-zA-Z0-9_-]+/i.test(text);
  const hasGitHubUrl = /github\.com\/[a-zA-Z0-9_-]+/i.test(text);

  // Header detection
  const detectedHeaders: string[] = [];
  const missingHeaders: string[] = [];

  for (const header of STANDARD_RESUME_HEADERS) {
    if (new RegExp(`\\b${header}\\b`, 'i').test(text)) {
      detectedHeaders.push(header);
    } else {
      missingHeaders.push(header);
    }
  }

  // Keyword density map
  const words = text.toLowerCase().match(/\b[a-z0-9+#.#]{2,}\b/g) || [];
  const keywordDensityMap: Record<string, number> = {};
  for (const w of words) {
    if (w.length >= 3 && !['and', 'the', 'for', 'with', 'was', 'this', 'that'].includes(w)) {
      keywordDensityMap[w] = (keywordDensityMap[w] || 0) + 1;
    }
  }

  // Warnings
  const warnings: string[] = [];
  if (!hasContactEmail) warnings.push('Missing valid contact email address.');
  if (!hasPhone) warnings.push('Missing phone number.');
  if (!hasLinkedInUrl) warnings.push('Missing LinkedIn profile URL.');
  if (!hasGitHubUrl) warnings.push('Missing GitHub profile link for tech evaluation.');
  if (missingHeaders.length > 0) {
    warnings.push(`Missing standard section headers: ${missingHeaders.join(', ')}.`);
  }

  // Score computation
  let score = 40;
  if (hasContactEmail) score += 15;
  if (hasPhone) score += 10;
  if (hasLinkedInUrl) score += 10;
  if (hasGitHubUrl) score += 10;
  score += detectedHeaders.length * 3;

  score = Math.min(100, Math.max(0, score));

  return {
    candidateId,
    atsCompatibilityScore: score,
    isAtsFriendlyFormat: score >= 75,
    hasContactEmail,
    hasPhone,
    hasLinkedInUrl,
    hasGitHubUrl,
    detectedSectionHeaders: detectedHeaders,
    missingStandardHeaders: missingHeaders,
    keywordDensityMap,
    formattingWarnings: warnings,
  };
}
