/**
 * AI Resume Semantic Skill Gap Analysis & Job Description Match Dashboard Component
 */

import React, { useState } from 'react';
import {
  evaluateResumeJobDescriptionMatch,
  calculateCandidateSkillMatchScore,
  generateResumeOptimizationAuditReport,
  TARGET_JOB_ROLES,
} from '../services/resumeAnalysisService';

export default function ResumeAnalysisDashboard() {
  const [candidate, setCandidate] = useState({
    candidateId: 'CAN-RES-501',
    candidateName: 'Clara Oswald',
    targetRole: TARGET_JOB_ROLES.SENIOR_FULLSTACK_ENGINEER,
    extractedSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'GraphQL', 'TailwindCSS'],
    requiredJobSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Kubernetes', 'AWS Cloud', 'GraphQL', 'System Design'],
    yearsOfExperience: 5,
    analyzedAt: new Date().toISOString(),
  });

  const match = evaluateResumeJobDescriptionMatch(candidate);
  const score = calculateCandidateSkillMatchScore(candidate.extractedSkills, candidate.requiredJobSkills);
  const auditReport = generateResumeOptimizationAuditReport(candidate.candidateId, candidate.candidateName, score.matchScorePercent, match.missingSkills);

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#F8FAFC' }}>
      <header style={{ marginBottom: '24px', borderBottom: '2px solid #E2E8F0', paddingBottom: '16px' }}>
        <h1 style={{ color: '#2563EB', margin: 0 }}>📄 AI Resume Analyzer & Skill Gap Command Center</h1>
        <p style={{ color: '#64748B', marginTop: '6px' }}>
          Semantic job description matching, ATS parsing compatibility score, missing keyword extraction, and career path telemetry.
        </p>
      </header>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #2563EB' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Skill Match Score</span>
          <h2 style={{ color: '#2563EB', margin: '4px 0 0 0' }}>{score.matchScorePercent}% Score</h2>
          <small style={{ color: '#64748B' }}>Tier: {score.qualificationTier}</small>
        </div>

        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #16A34A' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Matching Required Skills</span>
          <h2 style={{ color: '#16A34A', margin: '4px 0 0 0' }}>{match.matchingSkillsCount} / {candidate.requiredJobSkills.length} Skills</h2>
          <small style={{ color: '#64748B' }}>Status: {match.matchTierStatus}</small>
        </div>

        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #DC2626' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Missing Key Technical Skills</span>
          <h2 style={{ color: '#DC2626', margin: '4px 0 0 0' }}>{match.missingSkills.length} Missing</h2>
          <small style={{ color: '#64748B' }}>Missing: {match.missingSkills.slice(0, 2).join(', ')}</small>
        </div>

        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #059669' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem' }}>ATS Parser Compatibility</span>
          <h2 style={{ color: '#059669', margin: '4px 0 0 0' }}>{auditReport.atsParsingStatus}</h2>
          <small style={{ color: '#64748B' }}>Target Role: {candidate.targetRole}</small>
        </div>
      </div>

      {/* Remediation Directives */}
      <div style={{ background: '#FFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#0F172A' }}>🎯 Resume Optimization & Keyword Directives</h3>

        <ul style={{ paddingLeft: '20px', margin: 0 }}>
          {auditReport.remediationDirectives.map((dir, idx) => (
            <li key={idx} style={{ marginBottom: '8px', color: '#334155' }}>{dir}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
