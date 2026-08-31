import { analyzeAtsCompatibility } from './atsCompatibilityService';

describe('AtsCompatibilityService', () => {
  const sampleResumeText = `
    Jane Doe
    Email: jane.doe@example.com | Phone: (555) 123-4567
    LinkedIn: linkedin.com/in/janedoe | GitHub: github.com/janedoe

    Work Experience
    Senior Full Stack Engineer at Tech Corp
    Architected React and Node.js web applications.

    Education
    B.S. Computer Science

    Skills
    React, TypeScript, Node.js, PostgreSQL, Docker, AWS

    Projects
    AI Resume Analyzer

    Certifications
    AWS Certified Solutions Architect
  `;

  it('analyzes ATS compatibility and contact info correctly', () => {
    const result = analyzeAtsCompatibility('cand-ats-101', sampleResumeText);

    expect(result.candidateId).toBe('cand-ats-101');
    expect(result.atsCompatibilityScore).toBeGreaterThanOrEqual(85);
    expect(result.isAtsFriendlyFormat).toBe(true);
    expect(result.hasContactEmail).toBe(true);
    expect(result.hasPhone).toBe(true);
    expect(result.hasLinkedInUrl).toBe(true);
    expect(result.hasGitHubUrl).toBe(true);
    expect(result.detectedSectionHeaders.length).toBe(5);
    expect(result.missingStandardHeaders.length).toBe(0);
  });

  it('detects missing contact details and missing sections', () => {
    const result = analyzeAtsCompatibility('cand-ats-empty', '');

    expect(result.atsCompatibilityScore).toBe(0);
    expect(result.isAtsFriendlyFormat).toBe(false);
    expect(result.formattingWarnings).toContain('Resume text content is empty.');
  });
});
