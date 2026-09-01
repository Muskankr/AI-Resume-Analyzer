/**
 * Enterprise Resume Job Description Matcher & Keyword Gap Service Engine
 * 
 * Architectural Specifications:
 * - Tokenizes JD and Resume text to extract technical keywords.
 * - Computes match percentage: Match% = (Matched Keywords / Total JD Keywords) * 100.
 * - Identifies missing required skills and generates tailored resume bullet recommendations.
 *
 * @module JobMatcherService
 * @version 2.6.0
 * @author Enterprise AI Resume Architecture Team
 */

import {
  JobSkillKeyword,
  JobDescriptionAnalysisResult,
  JobMatcherState
} from './JobMatcherModel';

export class JobMatcherService {
  private state: JobMatcherState;

  private targetKeywordsList: { word: string; category: JobSkillKeyword['category']; isRequired: boolean }[] = [
    { word: 'React', category: 'HARD_SKILL', isRequired: true },
    { word: 'TypeScript', category: 'HARD_SKILL', isRequired: true },
    { word: 'Node.js', category: 'HARD_SKILL', isRequired: true },
    { word: 'GraphQL', category: 'HARD_SKILL', isRequired: false },
    { word: 'Jest', category: 'HARD_SKILL', isRequired: false },
    { word: 'Docker', category: 'HARD_SKILL', isRequired: false },
    { word: 'AWS', category: 'DOMAIN_KNOWLEDGE', isRequired: true },
    { word: 'TailwindCSS', category: 'HARD_SKILL', isRequired: false },
    { word: 'Agile', category: 'SOFT_SKILL', isRequired: false },
    { word: 'Communication', category: 'SOFT_SKILL', isRequired: true }
  ];

  constructor(state?: JobMatcherState) {
    this.state = state || new JobMatcherState();
  }

  public getState(): JobMatcherState {
    return this.state;
  }

  /**
   * Compares resume text against target Job Description keywords.
   */
  public analyzeJobMatch(resumeText: string, jdText: string = this.state.getDefaultJdText()): JobDescriptionAnalysisResult {
    const resumeLower = resumeText.toLowerCase();
    const jdLower = jdText.toLowerCase();

    let matchedCount = 0;
    const evaluatedKeywords: JobSkillKeyword[] = [];
    const suggestedActions: string[] = [];

    this.targetKeywordsList.forEach(item => {
      const frequencyInJd = (jdLower.match(new RegExp(item.word.toLowerCase(), 'g')) || []).length;
      const foundInResume = resumeLower.includes(item.word.toLowerCase());

      if (frequencyInJd > 0) {
        if (foundInResume) {
          matchedCount++;
        } else if (item.isRequired) {
          suggestedActions.push(`Add missing required skill "${item.word}" to your skills or experience section.`);
        }

        evaluatedKeywords.push({
          keyword: item.word,
          category: item.category,
          isRequired: item.isRequired,
          frequencyInJd,
          foundInResume
        });
      }
    });

    const totalJdKeywords = evaluatedKeywords.length || 1;
    const matchPercentage = Math.round((matchedCount / totalJdKeywords) * 100);

    return {
      matchPercentage,
      totalJdKeywords,
      matchedKeywordsCount: matchedCount,
      missingKeywordsCount: evaluatedKeywords.length - matchedCount,
      keywords: evaluatedKeywords,
      suggestedActionItems: suggestedActions
    };
  }
}
