/**
 * Enterprise Resume Job Description Matcher & Keyword Gap Model
 * 
 * Architectural Specifications:
 * - Domain entities for JD text extraction, skill keyword frequency analysis, hard vs soft skill categorization, and candidate suitability scoring.
 * - Keyword matching algorithm: Calculates overall JD match percentage, missing required skills, and frequency weighting.
 * - Section breakdown: Technical Skills, Domain Experience, Leadership, Education requirements.
 *
 * @module JobMatcherModel
 * @version 2.6.0
 * @author Enterprise AI Resume Architecture Team
 */

export interface JobSkillKeyword {
  keyword: string;
  category: 'HARD_SKILL' | 'SOFT_SKILL' | 'DOMAIN_KNOWLEDGE' | 'CERTIFICATION';
  isRequired: boolean;
  frequencyInJd: number;
  foundInResume: boolean;
}

export interface JobDescriptionAnalysisResult {
  matchPercentage: number;
  totalJdKeywords: number;
  matchedKeywordsCount: number;
  missingKeywordsCount: number;
  keywords: JobSkillKeyword[];
  suggestedActionItems: string[];
}

export class JobMatcherState {
  private defaultJdText: string = `
    Senior Software Engineer - React & TypeScript
    Requirements:
    - 5+ years experience with React, TypeScript, Node.js, and GraphQL.
    - Deep knowledge of Web Vitals, performance optimization, and Jest testing.
    - Strong experience with TailwindCSS, Docker, and AWS CI/CD pipelines.
    - Excellent communication and Agile collaboration skills.
  `;

  public getDefaultJdText(): string {
    return this.defaultJdText;
  }
}
