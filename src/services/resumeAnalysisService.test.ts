/**
 * AI Resume Semantic Skill Gap Analysis & Job Description Match Unit Test Suite
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateResumeJobDescriptionMatch,
  calculateCandidateSkillMatchScore,
  generateResumeOptimizationAuditReport,
  TARGET_JOB_ROLES,
} from './resumeAnalysisService';

describe('ResumeAnalysisService', () => {
  const sampleCandidate = {
    candidateId: 'CAN-RES-901',
    candidateName: 'Eleanor Vance',
    targetRole: TARGET_JOB_ROLES.SENIOR_FULLSTACK_ENGINEER,
    extractedSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'GraphQL'],
    requiredJobSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Kubernetes', 'AWS', 'System Design'],
    yearsOfExperience: 6,
    analyzedAt: '2026-08-30T10:00:00Z',
  };

  it('should evaluate resume skills against job description requirements', () => {
    const match = evaluateResumeJobDescriptionMatch(sampleCandidate);

    expect(match).toBeDefined();
    expect(match.isMatchApproved).toBe(true);
    expect(match.matchingSkillsCount).toBe(4);
    expect(match.missingSkills.length).toBeGreaterThanOrEqual(3);
  });

  it('should calculate candidate overall match percentage score', () => {
    const score = calculateCandidateSkillMatchScore(
      sampleCandidate.extractedSkills,
      sampleCandidate.requiredJobSkills
    );

    expect(score).toBeDefined();
    expect(score.matchScorePercent).toBeCloseTo(57.1, 1);
    expect(score.qualificationTier).toBe('COMPETITIVE_CANDIDATE');
  });

  it('should generate ATS resume optimization audit report with keyword directives', () => {
    const report = generateResumeOptimizationAuditReport(
      sampleCandidate.candidateId,
      sampleCandidate.candidateName,
      57.1,
      ['Kubernetes', 'AWS', 'System Design']
    );

    expect(report).toBeDefined();
    expect(report.candidateId).toBe('CAN-RES-901');
    expect(report.atsParsingStatus).toBe('ATS_PARSER_OPTIMIZED');
    expect(report.remediationDirectives.length).toBeGreaterThanOrEqual(3);
  });
});
