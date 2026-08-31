import type {
  JobPosting, JobKeyword, SectionScore, MatchScoreBreakdown, ResumeJobMatch,
  RecommendedEdit, CompanyMatchHistory, MatchTrend, JobMatchAuditLog
} from './jobMatchTypes';
import { gradeFromScore } from './jobMatchTypes';

export function getJobPostings(): JobPosting[] {
  return [
    {
      jobId: 'jp1', title: 'Senior Frontend Engineer', company: 'Stripe', industry: 'TECHNOLOGY',
      location: 'San Francisco, CA', workMode: 'HYBRID', experienceLevel: 'SENIOR',
      salaryRange: { min: 160000, max: 210000 },
      description: 'Build the next generation of financial infrastructure UIs. Lead frontend architecture for merchant dashboard.',
      requirements: ['React', 'TypeScript', 'GraphQL', 'System Design', 'Performance Optimization', 'Testing', 'CSS-in-JS', 'CI/CD'],
      niceToHaves: ['Rust', 'WebAssembly', 'Design Systems', 'Accessibility'],
      postedDate: '2026-08-10', deadline: '2026-09-15', applicants: 245, url: '#', companyLogo: '💳', companyRating: 4.5
    },
    {
      jobId: 'jp2', title: 'Full Stack Developer', company: 'Shopify', industry: 'TECHNOLOGY',
      location: 'Toronto, Canada', workMode: 'REMOTE', experienceLevel: 'MID',
      salaryRange: { min: 120000, max: 160000 },
      description: 'Build e-commerce features used by millions of merchants worldwide. Work across the entire stack.',
      requirements: ['Ruby on Rails', 'React', 'TypeScript', 'PostgreSQL', 'REST APIs', 'Redis'],
      niceToHaves: ['GraphQL', 'Kubernetes', 'Performance Tuning'],
      postedDate: '2026-08-15', deadline: '2026-09-30', applicants: 512, url: '#', companyLogo: '🛍️', companyRating: 4.3
    },
    {
      jobId: 'jp3', title: 'ML Engineer', company: 'OpenAI', industry: 'TECHNOLOGY',
      location: 'San Francisco, CA', workMode: 'ONSITE', experienceLevel: 'SENIOR',
      salaryRange: { min: 200000, max: 350000 },
      description: 'Work on cutting-edge language models. Optimize training pipelines and inference performance.',
      requirements: ['Python', 'PyTorch', 'Transformers', 'Distributed Systems', 'CUDA', 'System Design'],
      niceToHaves: ['Rust', 'Kubernetes', 'MLOps', 'Publications'],
      postedDate: '2026-08-01', deadline: '2026-09-01', applicants: 1200, url: '#', companyLogo: '🤖', companyRating: 4.8
    },
    {
      jobId: 'jp4', title: 'DevOps Engineer', company: 'Netflix', industry: 'MEDIA',
      location: 'Los Gatos, CA', workMode: 'HYBRID', experienceLevel: 'SENIOR',
      salaryRange: { min: 180000, max: 250000 },
      description: 'Build and maintain cloud infrastructure serving 200M+ subscribers. Automate everything.',
      requirements: ['AWS', 'Kubernetes', 'Terraform', 'Python', 'CI/CD', 'Monitoring'],
      niceToHaves: ['Go', 'Chaos Engineering', 'Cost Optimization'],
      postedDate: '2026-08-12', deadline: '2026-09-20', applicants: 380, url: '#', companyLogo: '🎬', companyRating: 4.4
    },
    {
      jobId: 'jp5', title: 'Product Designer', company: 'Figma', industry: 'TECHNOLOGY',
      location: 'San Francisco, CA', workMode: 'HYBRID', experienceLevel: 'MID',
      salaryRange: { min: 130000, max: 180000 },
      description: 'Design collaborative tools used by millions of designers worldwide. Push the boundaries of web-based design.',
      requirements: ['Figma', 'Design Systems', 'Prototyping', 'User Research', 'CSS', 'Accessibility'],
      niceToHaves: ['Motion Design', 'Code Knowledge', '3D Design'],
      postedDate: '2026-08-18', deadline: '2026-09-28', applicants: 620, url: '#', companyLogo: '🎨', companyRating: 4.7
    },
    {
      jobId: 'jp6', title: 'Backend Engineer', company: 'Vercel', industry: 'TECHNOLOGY',
      location: 'Remote', workMode: 'REMOTE', experienceLevel: 'MID',
      salaryRange: { min: 140000, max: 190000 },
      description: 'Build the infrastructure powering Next.js and the modern web. Optimize build and deployment pipelines.',
      requirements: ['TypeScript', 'Node.js', 'Go', 'PostgreSQL', 'Redis', 'AWS', 'Docker'],
      niceToHaves: ['Rust', 'Edge Computing', 'CDN Optimization'],
      postedDate: '2026-08-20', deadline: '2026-09-25', applicants: 290, url: '#', companyLogo: '▲', companyRating: 4.6
    },
  ];
}

export function matchResumeToJob(job: JobPosting): ResumeJobMatch {
  // Simulated matching logic based on resume skills
  const resumeSkills = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Git', 'REST APIs', 'CSS/Sass', 'SQL', 'Python', 'Docker'];

  const categoryScores: MatchScoreBreakdown[] = [];
  const sectionScores: SectionScore[] = [];
  const jobKeywords: JobKeyword[] = [];
  const recommendedEdits: RecommendedEdit[] = [];

  // Score each category
  const skillsMatch = job.requirements.filter(r => resumeSkills.some(s => s.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(s.toLowerCase())));
  const skillsScore = Math.min(100, Math.round((skillsMatch.length / job.requirements.length) * 100));
  categoryScores.push({ category: 'SKILLS', score: skillsScore, maxScore: 100, weight: 35, grade: gradeFromScore(skillsScore), details: `${skillsMatch.length}/${job.requirements.length} required skills matched` });

  const expScore = job.experienceLevel === 'SENIOR' ? 65 : job.experienceLevel === 'MID' ? 85 : job.experienceLevel === 'JUNIOR' ? 95 : 70;
  categoryScores.push({ category: 'EXPERIENCE', score: expScore, maxScore: 100, weight: 25, grade: gradeFromScore(expScore), details: `Resume experience level vs ${job.experienceLevel} requirement` });

  const eduScore = 78;
  categoryScores.push({ category: 'EDUCATION', score: eduScore, maxScore: 100, weight: 15, grade: gradeFromScore(eduScore), details: 'Degree matches job education requirement' });

  const allRequired = [...job.requirements, ...job.niceToHaves];
  const keywordsFound = allRequired.filter(k => resumeSkills.some(s => s.toLowerCase().includes(k.toLowerCase())));
  const kwScore = Math.min(100, Math.round((keywordsFound.length / allRequired.length) * 100));
  categoryScores.push({ category: 'KEYWORDS', score: kwScore, maxScore: 100, weight: 15, grade: gradeFromScore(kwScore), details: `${keywordsFound.length}/${allRequired.length} keywords found in resume` });

  const cultureScore = 72;
  categoryScores.push({ category: 'CULTURE', score: cultureScore, maxScore: 100, weight: 5, grade: gradeFromScore(cultureScore), details: 'Company culture alignment based on work style' });

  const salaryMin = job.salaryRange.min;
  const salaryScore = salaryMin <= 180000 ? 90 : 70;
  categoryScores.push({ category: 'SALARY', score: salaryScore, maxScore: 100, weight: 5, grade: gradeFromScore(salaryScore), details: `Expected salary aligned with ${job.company} range` });

  // Overall score
  const overallScore = Math.round(categoryScores.reduce((sum, c) => sum + (c.score * c.weight / 100), 0));

  // Build keywords
  job.requirements.forEach(req => {
    const found = resumeSkills.some(s => s.toLowerCase().includes(req.toLowerCase()));
    jobKeywords.push({
      keyword: req, relevance: 'CRITICAL', category: 'SKILLS',
      foundInResume: found, resumeSection: found ? 'SKILLS' : undefined,
      frequency: found ? Math.floor(Math.random() * 3) + 1 : 0, weight: 10
    });
  });

  job.niceToHaves.forEach(req => {
    const found = resumeSkills.some(s => s.toLowerCase().includes(req.toLowerCase()));
    jobKeywords.push({
      keyword: req, relevance: 'MEDIUM', category: 'SKILLS',
      foundInResume: found, resumeSection: found ? 'SKILLS' : undefined,
      frequency: found ? 1 : 0, weight: 5
    });
  });

  // Section scores
  sectionScores.push({
    section: 'SKILLS', score: skillsScore, maxScore: 100,
    matchedKeywords: skillsMatch, missingKeywords: job.requirements.filter(r => !skillsMatch.includes(r)),
    feedback: skillsScore >= 80 ? 'Strong skill alignment' : 'Consider adding more relevant skills',
    improvementTips: job.requirements.filter(r => !skillsMatch.includes(r)).map(r => `Add "${r}" to your skills section`)
  });
  sectionScores.push({
    section: 'EXPERIENCE', score: expScore, maxScore: 100,
    matchedKeywords: [], missingKeywords: [],
    feedback: 'Experience level is relevant', improvementTips: ['Add more quantified achievements']
  });
  sectionScores.push({
    section: 'SUMMARY', score: 75, maxScore: 100,
    matchedKeywords: [], missingKeywords: [],
    feedback: 'Summary could be more targeted', improvementTips: [`Mention "${job.company}" specifically`, `Highlight ${job.industry} domain experience`]
  });

  // Recommended edits
  const missingKws = job.requirements.filter(r => !resumeSkills.some(s => s.toLowerCase().includes(r.toLowerCase())));
  missingKws.forEach((kw, i) => {
    recommendedEdits.push({
      editId: `re-${job.jobId}-${i}`, section: 'SKILLS', type: 'ADD_KEYWORD',
      description: `Add "${kw}" to your skills — it's a critical requirement for this role`,
      impactScore: Math.floor(Math.random() * 15) + 8, priority: i + 1
    });
  });

  if (skillsScore < 80) {
    recommendedEdits.push({
      editId: `re-${job.jobId}-exp`, section: 'EXPERIENCE', type: 'ADD_QUANTIFICATION',
      description: 'Add quantified achievements to your experience section (e.g., "improved performance by 40%")',
      impactScore: 12, priority: missingKws.length + 1
    });
  }

  const strengths = skillsMatch.slice(0, 4).map(s => `Strong ${s} expertise`);
  if (expScore >= 80) strengths.push('Experience level aligns well');
  strengths.push('Good overall keyword coverage');

  const weaknesses = missingKws.slice(0, 3).map(k => `Missing "${k}" — critical skill gap`);
  if (expScore < 70) weaknesses.push('May need more senior-level experience');

  return {
    matchId: `match-${job.jobId}`, jobId: job.jobId, resumeVersion: 'v2.1 ATS-Optimized',
    overallScore, grade: gradeFromScore(overallScore),
    passProbability: Math.min(98, Math.round(overallScore * 1.1 + 5)),
    categoryBreakdown: categoryScores, sectionScores, jobKeywords,
    matchedCount: job.requirements.filter(r => resumeSkills.some(s => s.toLowerCase().includes(r.toLowerCase()))).length,
    missingCount: missingKws.length,
    totalKeywords: allRequired.length,
    strengths, weaknesses, recommendedEdits,
    createdAt: new Date().toISOString(), status: 'NOT_APPLIED'
  };
}

export function getCompanyHistory(): CompanyMatchHistory[] {
  return [
    { companyId: 'ch1', companyName: 'Stripe', jobsMatched: 3, avgScore: 82, bestScore: 88, lastMatchDate: '2026-08-20' },
    { companyId: 'ch2', companyName: 'Google', jobsMatched: 5, avgScore: 68, bestScore: 75, lastMatchDate: '2026-08-15' },
    { companyId: 'ch3', companyName: 'Meta', jobsMatched: 4, avgScore: 72, bestScore: 80, lastMatchDate: '2026-08-10' },
    { companyId: 'ch4', companyName: 'Vercel', jobsMatched: 2, avgScore: 85, bestScore: 91, lastMatchDate: '2026-08-18' },
    { companyId: 'ch5', companyName: 'Netflix', jobsMatched: 2, avgScore: 65, bestScore: 70, lastMatchDate: '2026-08-12' },
  ];
}

export function getMatchTrends(): MatchTrend[] {
  return [
    { month: 'Mar', avgScore: 58, jobsAnalyzed: 8, bestScore: 72, applications: 3 },
    { month: 'Apr', avgScore: 62, jobsAnalyzed: 12, bestScore: 78, applications: 5 },
    { month: 'May', avgScore: 68, jobsAnalyzed: 10, bestScore: 82, applications: 4 },
    { month: 'Jun', avgScore: 72, jobsAnalyzed: 15, bestScore: 86, applications: 7 },
    { month: 'Jul', avgScore: 75, jobsAnalyzed: 11, bestScore: 90, applications: 5 },
    { month: 'Aug', avgScore: 78, jobsAnalyzed: 6, bestScore: 91, applications: 2 },
  ];
}

export function getAuditLogs(): JobMatchAuditLog[] {
  return [
    { logId: 'jal1', timestamp: '2026-08-24T10:30:00Z', action: 'MATCH_CALCULATED', details: 'Scored resume against Senior Frontend Engineer at Stripe — 82% match', performer: 'You' },
    { logId: 'jal2', timestamp: '2026-08-24T10:15:00Z', action: 'JOB_BOOKMARKED', details: 'Bookmarked Full Stack Developer at Shopify', performer: 'You' },
    { logId: 'jal3', timestamp: '2026-08-23T14:00:00Z', action: 'RESUME_TAILORED', details: 'Created tailored resume version for Stripe application', performer: 'You' },
    { logId: 'jal4', timestamp: '2026-08-22T09:30:00Z', action: 'APPLICATION_SUBMITTED', details: 'Applied to Backend Engineer at Vercel (85% match)', performer: 'You' },
    { logId: 'jal5', timestamp: '2026-08-20T16:00:00Z', action: 'MATCH_EXPORTED', details: 'Exported match report for ML Engineer at OpenAI', performer: 'You' },
    { logId: 'jal6', timestamp: '2026-08-18T11:45:00Z', action: 'MATCH_CALCULATED', details: 'Scored resume against Product Designer at Figma — 65% match', performer: 'You' },
  ];
}
