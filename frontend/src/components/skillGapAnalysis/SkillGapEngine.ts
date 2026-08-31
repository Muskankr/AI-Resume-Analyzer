import type {
  UserSkill,
  TargetSkill,
  SkillGap,
  LearningResource,
  CareerPath,
  SkillOverlapAnalysis,
  CareerRecommendation,
  SkillGapAuditLog,
  SkillProficiency,
  GapSeverity
} from './skillGapTypes';
const PROFICIENCY_ORDER: Record<SkillProficiency, number> = {
  NONE: 0, BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4
};

// ──────────────────────────────────────────────────────
// Mock Data
// ──────────────────────────────────────────────────────

export function getUserSkills(): UserSkill[] {
  return [
    { skillId: 'us1', name: 'JavaScript', category: 'PROGRAMMING_LANGUAGES', proficiency: 'ADVANCED', yearsExperience: 4, lastUsedDate: '2026-08-20', endorsements: 12, projectsUsed: 8, confidenceScore: 88 },
    { skillId: 'us2', name: 'TypeScript', category: 'PROGRAMMING_LANGUAGES', proficiency: 'INTERMEDIATE', yearsExperience: 2, lastUsedDate: '2026-08-18', endorsements: 6, projectsUsed: 4, confidenceScore: 72 },
    { skillId: 'us3', name: 'React', category: 'FRAMEWORKS', proficiency: 'ADVANCED', yearsExperience: 3, lastUsedDate: '2026-08-22', endorsements: 10, projectsUsed: 7, confidenceScore: 85 },
    { skillId: 'us4', name: 'Node.js', category: 'FRAMEWORKS', proficiency: 'INTERMEDIATE', yearsExperience: 2, lastUsedDate: '2026-07-15', endorsements: 5, projectsUsed: 3, confidenceScore: 68 },
    { skillId: 'us5', name: 'Git', category: 'TOOLS', proficiency: 'ADVANCED', yearsExperience: 4, lastUsedDate: '2026-08-22', endorsements: 8, projectsUsed: 10, confidenceScore: 90 },
    { skillId: 'us6', name: 'REST APIs', category: 'FRAMEWORKS', proficiency: 'ADVANCED', yearsExperience: 3, lastUsedDate: '2026-08-10', endorsements: 7, projectsUsed: 6, confidenceScore: 82 },
    { skillId: 'us7', name: 'Python', category: 'PROGRAMMING_LANGUAGES', proficiency: 'BEGINNER', yearsExperience: 0.5, lastUsedDate: '2026-04-10', endorsements: 1, projectsUsed: 1, confidenceScore: 35 },
    { skillId: 'us8', name: 'SQL', category: 'PROGRAMMING_LANGUAGES', proficiency: 'INTERMEDIATE', yearsExperience: 2, lastUsedDate: '2026-06-20', endorsements: 4, projectsUsed: 3, confidenceScore: 65 },
    { skillId: 'us9', name: 'CSS/Sass', category: 'FRAMEWORKS', proficiency: 'ADVANCED', yearsExperience: 3, lastUsedDate: '2026-08-15', endorsements: 6, projectsUsed: 7, confidenceScore: 80 },
    { skillId: 'us10', name: 'Communication', category: 'SOFT_SKILLS', proficiency: 'ADVANCED', yearsExperience: 5, lastUsedDate: '2026-08-22', endorsements: 15, projectsUsed: 0, confidenceScore: 87 },
    { skillId: 'us11', name: 'Problem Solving', category: 'SOFT_SKILLS', proficiency: 'ADVANCED', yearsExperience: 4, lastUsedDate: '2026-08-22', endorsements: 10, projectsUsed: 0, confidenceScore: 83 },
    { skillId: 'us12', name: 'Docker', category: 'DEVOPS', proficiency: 'BEGINNER', yearsExperience: 0.5, lastUsedDate: '2026-03-05', endorsements: 1, projectsUsed: 1, confidenceScore: 30 },
  ];
}
export function getTargetSkills(): TargetSkill[] {
  const baseSkills: TargetSkill[] = [
    { skillId: 'ts1', name: 'TypeScript', category: 'PROGRAMMING_LANGUAGES', requiredProficiency: 'ADVANCED', importance: 9, demandScore: 92, salaryImpact: 12, timeToLearn: '2-4 months' },
    { skillId: 'ts2', name: 'React', category: 'FRAMEWORKS', requiredProficiency: 'EXPERT', importance: 10, demandScore: 95, salaryImpact: 15, timeToLearn: '3-6 months' },
    { skillId: 'ts3', name: 'Node.js', category: 'FRAMEWORKS', requiredProficiency: 'ADVANCED', importance: 8, demandScore: 88, salaryImpact: 10, timeToLearn: '2-4 months' },
    { skillId: 'ts4', name: 'Python', category: 'PROGRAMMING_LANGUAGES', requiredProficiency: 'INTERMEDIATE', importance: 7, demandScore: 85, salaryImpact: 8, timeToLearn: '3-5 months' },
    { skillId: 'ts5', name: 'PostgreSQL', category: 'PROGRAMMING_LANGUAGES', requiredProficiency: 'ADVANCED', importance: 7, demandScore: 80, salaryImpact: 7, timeToLearn: '2-3 months' },
    { skillId: 'ts6', name: 'AWS', category: 'CLOUD_PLATFORMS', requiredProficiency: 'INTERMEDIATE', importance: 8, demandScore: 90, salaryImpact: 14, timeToLearn: '3-6 months' },
    { skillId: 'ts7', name: 'Docker', category: 'DEVOPS', requiredProficiency: 'ADVANCED', importance: 7, demandScore: 82, salaryImpact: 9, timeToLearn: '1-3 months' },
    { skillId: 'ts8', name: 'GraphQL', category: 'FRAMEWORKS', requiredProficiency: 'INTERMEDIATE', importance: 6, demandScore: 72, salaryImpact: 6, timeToLearn: '1-2 months' },
    { skillId: 'ts9', name: 'CI/CD', category: 'DEVOPS', requiredProficiency: 'ADVANCED', importance: 7, demandScore: 78, salaryImpact: 8, timeToLearn: '2-3 months' },
    { skillId: 'ts10', name: 'System Design', category: 'DOMAIN_KNOWLEDGE', requiredProficiency: 'ADVANCED', importance: 9, demandScore: 88, salaryImpact: 18, timeToLearn: '4-8 months' },
    { skillId: 'ts11', name: 'Testing (Jest/Cypress)', category: 'TOOLS', requiredProficiency: 'ADVANCED', importance: 7, demandScore: 75, salaryImpact: 6, timeToLearn: '2-3 months' },
    { skillId: 'ts12', name: 'Leadership', category: 'SOFT_SKILLS', requiredProficiency: 'INTERMEDIATE', importance: 8, demandScore: 70, salaryImpact: 12, timeToLearn: 'Ongoing' },
  ];
  return baseSkills;
}

export function getSkillGaps(userSkills: UserSkill[], targetSkills: TargetSkill[]): SkillGap[] {
  const gaps: SkillGap[] = [];

  for (const target of targetSkills) {
    const existing = userSkills.find(us => us.name === target.name);
    const currentProf = existing ? existing.proficiency : 'NONE';
    const gapPoints = PROFICIENCY_ORDER[target.requiredProficiency] - PROFICIENCY_ORDER[currentProf];

    if (gapPoints <= 0) continue;

    const gapScore = Math.min(100, gapPoints * 25 + (target.importance * 2));
    let severity: GapSeverity = 'ALIGNED';
    if (gapScore >= 80) severity = 'CRITICAL';
    else if (gapScore >= 60) severity = 'MAJOR';
    else if (gapScore >= 40) severity = 'MODERATE';
    else if (gapScore >= 20) severity = 'MINOR';

    const resources = generateLearningResources(target.name);

    gaps.push({
      gapId: `gap-${target.skillId}`,
      skillName: target.name,
      category: target.category,
      currentProficiency: currentProf,
      requiredProficiency: target.requiredProficiency,
      severity,
      gapScore,
      priority: target.importance,
      estimatedLearningTime: target.timeToLearn,
      learningResources: resources,
      relatedSkills: findRelatedSkills(target.name, userSkills),
    });
  }

  return gaps.sort((a, b) => b.priority - a.priority || b.gapScore - a.gapScore);
}

function findRelatedSkills(
  skillName: string,
  userSkills: UserSkill[]
): string[] {
  const related: Record<string, string[]> = {
    TypeScript: ['JavaScript', 'React'],
    React: ['TypeScript', 'JavaScript', 'CSS/Sass'],

    // FIX: Node.js must be inside quotes
    'Node.js': ['JavaScript', 'REST APIs'],

    Python: ['SQL', 'Data Science'],
    PostgreSQL: ['SQL', 'Node.js'],
    AWS: ['Docker', 'CI/CD'],
    Docker: ['CI/CD', 'AWS'],
    GraphQL: ['REST APIs', 'Node.js'],
    'CI/CD': ['Docker', 'Git', 'AWS'],
    'System Design': ['Leadership', 'Problem Solving'],
    'Testing (Jest/Cypress)': ['JavaScript', 'React'],
    Leadership: ['Communication', 'Problem Solving'],
  };

  const names = related[skillName] || [];

  return userSkills
    .filter((us) => names.includes(us.name))
    .map((us) => us.name);
}

function generateLearningResources(skillName: string): LearningResource[] {
  const resourceMap: Record<string, LearningResource[]> = {
    TypeScript: [
      { resourceId: 'lr1', title: 'TypeScript Deep Dive', provider: 'Basarat', format: 'BOOK', url: '#', rating: 4.7, duration: '40 hours', cost: 'Free', relevanceScore: 95, difficulty: 'INTERMEDIATE' },
      { resourceId: 'lr2', title: 'Advanced TypeScript Patterns', provider: 'Frontend Masters', format: 'COURSE', url: '#', rating: 4.8, duration: '12 hours', cost: '$49/mo', relevanceScore: 92, difficulty: 'ADVANCED' },
    ],
    React: [
      { resourceId: 'lr3', title: 'React - The Complete Guide', provider: 'Udemy', format: 'COURSE', url: '#', rating: 4.6, duration: '60 hours', cost: '$19.99', relevanceScore: 90, difficulty: 'INTERMEDIATE' },
      { resourceId: 'lr4', title: 'Build a Full Stack App', provider: 'Project', format: 'PROJECT', url: '#', rating: 4.5, duration: '80 hours', cost: 'Free', relevanceScore: 88, difficulty: 'ADVANCED' },
    ],
    Python: [
      { resourceId: 'lr5', title: 'Python for Everybody', provider: 'Coursera', format: 'COURSE', url: '#', rating: 4.8, duration: '30 hours', cost: 'Free', relevanceScore: 92, difficulty: 'BEGINNER' },
      { resourceId: 'lr6', title: 'Automate the Boring Stuff', provider: 'Book', format: 'BOOK', url: '#', rating: 4.7, duration: '20 hours', cost: 'Free', relevanceScore: 85, difficulty: 'BEGINNER' },
    ],
    AWS: [
      { resourceId: 'lr7', title: 'AWS Cloud Practitioner', provider: 'AWS', format: 'CERTIFICATION', url: '#', rating: 4.6, duration: '40 hours', cost: '$100 exam', relevanceScore: 94, difficulty: 'BEGINNER' },
      { resourceId: 'lr8', title: 'AWS Solutions Architect', provider: 'A Cloud Guru', format: 'COURSE', url: '#', rating: 4.7, duration: '60 hours', cost: '$39/mo', relevanceScore: 90, difficulty: 'INTERMEDIATE' },
    ],
    Docker: [
      { resourceId: 'lr9', title: 'Docker Mastery', provider: 'Udemy', format: 'COURSE', url: '#', rating: 4.8, duration: '15 hours', cost: '$19.99', relevanceScore: 93, difficulty: 'INTERMEDIATE' },
      { resourceId: 'lr10', title: 'Docker in Practice', provider: 'Manning', format: 'BOOK', url: '#', rating: 4.5, duration: '25 hours', cost: '$39.99', relevanceScore: 88, difficulty: 'INTERMEDIATE' },
    ],
    Nodejs: [
      { resourceId: 'lr11', title: 'Node.js Design Patterns', provider: 'Mario Casciaro', format: 'BOOK', url: '#', rating: 4.6, duration: '30 hours', cost: '$44.99', relevanceScore: 90, difficulty: 'ADVANCED' },
      { resourceId: 'lr12', title: 'Build an API from Scratch', provider: 'Project', format: 'PROJECT', url: '#', rating: 4.4, duration: '40 hours', cost: 'Free', relevanceScore: 87, difficulty: 'INTERMEDIATE' },
    ],
    PostgreSQL: [
      { resourceId: 'lr13', title: 'PostgreSQL Bootcamp', provider: 'Udemy', format: 'COURSE', url: '#', rating: 4.5, duration: '20 hours', cost: '$19.99', relevanceScore: 88, difficulty: 'BEGINNER' },
    ],
    GraphQL: [
      { resourceId: 'lr14', title: 'GraphQL with React', provider: 'Udemy', format: 'COURSE', url: '#', rating: 4.6, duration: '14 hours', cost: '$19.99', relevanceScore: 91, difficulty: 'INTERMEDIATE' },
    ],
    'CI/CD': [
      { resourceId: 'lr15', title: 'CI/CD Pipelines', provider: 'LinkedIn Learning', format: 'COURSE', url: '#', rating: 4.4, duration: '8 hours', cost: '$29.99/mo', relevanceScore: 86, difficulty: 'INTERMEDIATE' },
      { resourceId: 'lr16', title: 'GitHub Actions Mastery', provider: 'Project', format: 'PROJECT', url: '#', rating: 4.5, duration: '15 hours', cost: 'Free', relevanceScore: 89, difficulty: 'INTERMEDIATE' },
    ],
    'System Design': [
      { resourceId: 'lr17', title: 'System Design Interview', provider: 'Alex Xu', format: 'BOOK', url: '#', rating: 4.8, duration: '50 hours', cost: '$35.99', relevanceScore: 95, difficulty: 'ADVANCED' },
      { resourceId: 'lr18', title: 'Grokking System Design', provider: 'Educative', format: 'COURSE', url: '#', rating: 4.7, duration: '40 hours', cost: '$79/mo', relevanceScore: 93, difficulty: 'INTERMEDIATE' },
    ],
    'Testing (Jest/Cypress)': [
      { resourceId: 'lr19', title: 'Testing JavaScript', provider: 'Kent C. Dodds', format: 'COURSE', url: '#', rating: 4.9, duration: '20 hours', cost: '$99', relevanceScore: 96, difficulty: 'INTERMEDIATE' },
    ],
    Leadership: [
      { resourceId: 'lr20', title: 'Tech Lead Handbook', provider: 'Book', format: 'BOOK', url: '#', rating: 4.5, duration: '15 hours', cost: 'Free', relevanceScore: 82, difficulty: 'INTERMEDIATE' },
      { resourceId: 'lr21', title: 'Mentorship Program', provider: 'Internal', format: 'MENTORSHIP', url: '#', rating: 4.6, duration: '6 months', cost: 'Free', relevanceScore: 88, difficulty: 'INTERMEDIATE' },
    ],
  };

  const key = skillName.replace(/[^a-zA-Z]/g, '');
  return resourceMap[skillName] || resourceMap[key] || [
    { resourceId: `lr-${skillName}`, title: `Learn ${skillName}`, provider: 'Online', format: 'COURSE', url: '#', rating: 4.0, duration: '20 hours', cost: 'Varies', relevanceScore: 75, difficulty: 'INTERMEDIATE' },
  ];
}

export function getCareerPaths(): CareerPath[] {
  const paths: CareerPath[] = [
    {
      pathId: 'cp1', title: 'Full-Stack Tech Lead', description: 'Lead full-stack development teams while maintaining hands-on coding expertise.',
      currentRole: 'Frontend Developer', targetRole: 'Tech Lead', difficulty: 'MODERATE', matchScore: 72,
      skillGaps: ['System Design', 'Leadership', 'Node.js'], estimatedTimeline: '12-18 months',
      salaryRange: { min: 140000, max: 180000 }, demandLevel: 'HIGH',
      steps: [
        { stepId: 'cs1', order: 1, title: 'Master Backend Development', description: 'Strengthen Node.js and database skills.', skillsToAcquire: ['Node.js', 'PostgreSQL'], duration: '3-4 months', milestone: 'Build a full-stack project end-to-end', completed: false },
        { stepId: 'cs2', order: 2, title: 'Learn System Design', description: 'Study distributed systems and architecture patterns.', skillsToAcquire: ['System Design'], duration: '4-6 months', milestone: 'Pass system design interview practice', completed: false },
        { stepId: 'cs3', order: 3, title: 'Develop Leadership Skills', description: 'Lead a small project team and practice mentoring.', skillsToAcquire: ['Leadership'], duration: '3-6 months', milestone: 'Successfully lead a 3-person team project', completed: false },
        { stepId: 'cs4', order: 4, title: 'Apply for Tech Lead Roles', description: 'Target tech lead positions at growth-stage companies.', skillsToAcquire: [], duration: '2-3 months', milestone: 'Receive and accept a tech lead offer', completed: false },
      ]
    },
    {
      pathId: 'cp2', title: 'Cloud Solutions Architect', description: 'Design and implement cloud-native solutions on AWS/GCP.',
      currentRole: 'Frontend Developer', targetRole: 'Cloud Solutions Architect', difficulty: 'CHALLENGING', matchScore: 55,
      skillGaps: ['AWS', 'Docker', 'CI/CD', 'System Design'], estimatedTimeline: '18-24 months',
      salaryRange: { min: 150000, max: 200000 }, demandLevel: 'HIGH',
      steps: [
        { stepId: 'cs5', order: 1, title: 'AWS Fundamentals', description: 'Get AWS Cloud Practitioner and Solutions Architect Associate.', skillsToAcquire: ['AWS'], duration: '3-6 months', milestone: 'Earn AWS Solutions Architect certification', completed: false },
        { stepId: 'cs6', order: 2, title: 'Containerization & Orchestration', description: 'Master Docker and Kubernetes.', skillsToAcquire: ['Docker', 'CI/CD'], duration: '3-4 months', milestone: 'Deploy a multi-container app to production', completed: false },
        { stepId: 'cs7', order: 3, title: 'Architecture Design', description: 'Study distributed systems and cloud architecture patterns.', skillsToAcquire: ['System Design'], duration: '6-8 months', milestone: 'Design a scalable system architecture', completed: false },
        { stepId: 'cs8', order: 4, title: 'Transition to Cloud Role', description: 'Apply for cloud/SRE roles.', skillsToAcquire: [], duration: '2-3 months', milestone: 'Land a cloud architect position', completed: false },
      ]
    },
    {
      pathId: 'cp3', title: 'AI/ML Engineer', description: 'Build intelligent applications combining software engineering with machine learning.',
      currentRole: 'Frontend Developer', targetRole: 'AI/ML Engineer', difficulty: 'AMBITIOUS', matchScore: 38,
      skillGaps: ['Python', 'Data Science', 'System Design'], estimatedTimeline: '24-36 months',
      salaryRange: { min: 160000, max: 220000 }, demandLevel: 'HIGH',
      steps: [
        { stepId: 'cs9', order: 1, title: 'Python Proficiency', description: 'Master Python for data science and ML.', skillsToAcquire: ['Python'], duration: '4-6 months', milestone: 'Build 3 Python data projects', completed: false },
        { stepId: 'cs10', order: 2, title: 'ML Fundamentals', description: 'Study machine learning algorithms and frameworks.', skillsToAcquire: ['Data Science'], duration: '6-10 months', milestone: 'Complete an ML certification or course', completed: false },
        { stepId: 'cs11', order: 3, title: 'Applied ML Projects', description: 'Build real-world ML applications.', skillsToAcquire: [], duration: '6-12 months', milestone: 'Deploy an ML model to production', completed: false },
      ]
    },
    {
      pathId: 'cp4', title: 'DevOps/Platform Engineer', description: 'Build and maintain developer infrastructure, CI/CD, and platform tooling.',
      currentRole: 'Frontend Developer', targetRole: 'Platform Engineer', difficulty: 'MODERATE', matchScore: 50,
      skillGaps: ['Docker', 'CI/CD', 'AWS', 'Python'], estimatedTimeline: '12-18 months',
      salaryRange: { min: 130000, max: 175000 }, demandLevel: 'HIGH',
      steps: [
        { stepId: 'cs12', order: 1, title: 'Docker & Kubernetes', description: 'Master containerization and orchestration.', skillsToAcquire: ['Docker'], duration: '2-3 months', milestone: 'Deploy apps with Docker Compose and K8s', completed: false },
        { stepId: 'cs13', order: 2, title: 'CI/CD Mastery', description: 'Build robust CI/CD pipelines.', skillsToAcquire: ['CI/CD'], duration: '2-3 months', milestone: 'Create a production-grade pipeline', completed: false },
        { stepId: 'cs14', order: 3, title: 'Cloud Infrastructure', description: 'Learn AWS/GCP infrastructure-as-code.', skillsToAcquire: ['AWS', 'Python'], duration: '3-5 months', milestone: 'Provision infra with Terraform/Pulumi', completed: false },
      ]
    },
  ];

  return paths.sort((a, b) => b.matchScore - a.matchScore);
}

export function getOverlapAnalysis(): SkillOverlapAnalysis[] {
  return [
    { overlapId: 'oa1', skillName: 'React → Full-Stack', transferableFrom: ['React', 'JavaScript'], transferableTo: ['Node.js', 'TypeScript'], overlapPercentage: 65, insight: 'Your React expertise transfers well to full-stack development. Adding Node.js and TypeScript will complete the picture.' },
    { overlapId: 'oa2', skillName: 'REST → GraphQL', transferableFrom: ['REST APIs'], transferableTo: ['GraphQL'], overlapPercentage: 55, insight: 'Understanding REST API design patterns gives you a strong foundation for GraphQL schema design.' },
    { overlapId: 'oa3', skillName: 'Git → CI/CD', transferableFrom: ['Git'], transferableTo: ['CI/CD', 'Docker'], overlapPercentage: 40, insight: 'Your Git workflow knowledge is the starting point for understanding CI/CD pipeline triggers and version control strategies.' },
    { overlapId: 'oa4', skillName: 'Problem Solving → System Design', transferableFrom: ['Problem Solving'], transferableTo: ['System Design'], overlapPercentage: 45, insight: 'Strong problem-solving skills directly support system design thinking. Focus on scaling patterns next.' },
    { overlapId: 'oa5', skillName: 'SQL → PostgreSQL', transferableFrom: ['SQL'], transferableTo: ['PostgreSQL'], overlapPercentage: 80, insight: 'Your SQL knowledge is highly transferable. PostgreSQL-specific features like JSONB and window functions will be quick to learn.' },
  ];
}

export function getRecommendations(): CareerRecommendation[] {
  return [
    {
      recommendationId: 'rec1',
      type: 'SKILL_UPGRADE',
      title: 'Level Up TypeScript to Advanced',
      description: 'TypeScript is in the top 3 most demanded skills. Bridging this gap will significantly boost your profile.',
      impactScore: 88,
      effort: 'MEDIUM',
      timeline: '2-4 months',
      priority: 1,
      skillsInvolved: ['TypeScript']
    },
    {
      recommendationId: 'rec2',
      type: 'CERTIFICATION',
      title: 'AWS Cloud Practitioner',
      description: 'Cloud skills are the highest-paying additions. Start with AWS certification to open cloud architect paths.',
      impactScore: 82,
      effort: 'MEDIUM',
      timeline: '3-4 months',
      priority: 2,
      skillsInvolved: ['AWS']
    },
    {
      recommendationId: 'rec3',
      type: 'PROJECT',
      title: 'Build a Dockerized Full-Stack App',
      description: 'Deploy your next project with Docker and CI/CD to build DevOps skills naturally.',
      impactScore: 78,
      effort: 'MEDIUM',
      timeline: '1-2 months',
      priority: 3,
      skillsInvolved: ['Docker', 'CI/CD', 'Node.js']
    },
    {
      recommendationId: 'rec4',
      type: 'PROJECT',
      title: 'System Design Course',
      description: 'System design has the highest salary impact (+18%). Invest in this for long-term career growth.',
      impactScore: 90,
      effort: 'HIGH',
      timeline: '4-8 months',
      priority: 4,
      skillsInvolved: ['System Design']
    },
    {
      recommendationId: 'rec5',
      type: 'ROLE_CHANGE',
      title: 'Target Full-Stack Tech Lead',
      description: 'Your current skills align 72% with a Tech Lead role. With targeted upskilling, this is achievable in 12 months.',
      impactScore: 85,
      effort: 'HIGH',
      timeline: '12-18 months',
      priority: 5,
      skillsInvolved: ['System Design', 'Leadership', 'Node.js']
    }
  ];
}

export function getAuditLogs(): SkillGapAuditLog[] {
  return [
    { logId: 'al1', timestamp: '2026-08-24T10:30:00Z', action: 'REPORT_GENERATED', details: 'Generated skill gap report for Senior Full-Stack Engineer role', performer: 'You' },
    { logId: 'al2', timestamp: '2026-08-24T10:32:00Z', action: 'CAREER_PATH_FAVORITED', details: 'Favorited career path: Full-Stack Tech Lead', performer: 'You' },
    { logId: 'al3', timestamp: '2026-08-23T14:15:00Z', action: 'SKILL_SELF_ASSESSED', details: 'Updated TypeScript proficiency from Beginner to Intermediate', performer: 'You' },
    { logId: 'al4', timestamp: '2026-08-22T09:00:00Z', action: 'RESOURCE_BOOKMARKED', details: 'Bookmarked "TypeScript Deep Dive" learning resource', performer: 'You' },
    { logId: 'al5', timestamp: '2026-08-20T16:45:00Z', action: 'REPORT_EXPORTED', details: 'Exported skill gap report as PDF', performer: 'You' },
  ];
}

export function getMonthlyTrends() {
  return [
    { month: 'Jan', overallMatchScore: 52, skillsAcquired: 1, gapsClosed: 0 },
    { month: 'Feb', overallMatchScore: 55, skillsAcquired: 1, gapsClosed: 1 },
    { month: 'Mar', overallMatchScore: 55, skillsAcquired: 0, gapsClosed: 0 },
    { month: 'Apr', overallMatchScore: 58, skillsAcquired: 1, gapsClosed: 0 },
    { month: 'May', overallMatchScore: 62, skillsAcquired: 1, gapsClosed: 1 },
    { month: 'Jun', overallMatchScore: 65, skillsAcquired: 1, gapsClosed: 1 },
    { month: 'Jul', overallMatchScore: 65, skillsAcquired: 0, gapsClosed: 0 },
    { month: 'Aug', overallMatchScore: 68, skillsAcquired: 0, gapsClosed: 0 },
  ];
}
