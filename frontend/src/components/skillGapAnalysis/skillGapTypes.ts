// Skill Gap Analysis & Career Path Recommender — Type Definitions

export type SkillProficiency = 'NONE' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type SkillCategory = 
  | 'PROGRAMMING_LANGUAGES'
  | 'FRAMEWORKS'
  | 'TOOLS'
  | 'SOFT_SKILLS'
  | 'DOMAIN_KNOWLEDGE'
  | 'CERTIFICATIONS'
  | 'CLOUD_PLATFORMS'
  | 'DATA_SCIENCE'
  | 'DESIGN'
  | 'DEVOPS';

export type GapSeverity = 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'MINOR' | 'ALIGNED';

export type CareerPathDifficulty = 'EASY' | 'MODERATE' | 'CHALLENGING' | 'AMBITIOUS';

export type LearningFormat = 'COURSE' | 'BOOK' | 'PROJECT' | 'CERTIFICATION' | 'MENTORSHIP' | 'BOOTCAMP';

export type TimelineRange = '3_MONTHS' | '6_MONTHS' | '12_MONTHS' | '24_MONTHS';

export interface UserSkill {
  skillId: string;
  name: string;
  category: SkillCategory;
  proficiency: SkillProficiency;
  yearsExperience: number;
  lastUsedDate: string;
  endorsements: number;
  projectsUsed: number;
  confidenceScore: number; // 0-100
}

export interface TargetSkill {
  skillId: string;
  name: string;
  category: SkillCategory;
  requiredProficiency: SkillProficiency;
  importance: number; // 1-10
  demandScore: number; // 0-100
  salaryImpact: number; // percentage increase
  timeToLearn: string; // e.g., "3-6 months"
}

export interface SkillGap {
  gapId: string;
  skillName: string;
  category: SkillCategory;
  currentProficiency: SkillProficiency;
  requiredProficiency: SkillProficiency;
  severity: GapSeverity;
  gapScore: number; // 0-100 (how big the gap is)
  priority: number; // 1-10
  estimatedLearningTime: string;
  learningResources: LearningResource[];
  relatedSkills: string[];
}

export interface LearningResource {
  resourceId: string;
  title: string;
  provider: string;
  format: LearningFormat;
  url: string;
  rating: number;
  duration: string;
  cost: string;
  relevanceScore: number; // 0-100
  difficulty: SkillProficiency;
}

export interface CareerPath {
  pathId: string;
  title: string;
  description: string;
  currentRole: string;
  targetRole: string;
  difficulty: CareerPathDifficulty;
  matchScore: number; // 0-100 (how well current skills match)
  skillGaps: string[]; // skill IDs
  estimatedTimeline: string;
  salaryRange: { min: number; max: number };
  demandLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  steps: CareerStep[];
}

export interface CareerStep {
  stepId: string;
  order: number;
  title: string;
  description: string;
  skillsToAcquire: string[];
  duration: string;
  milestone: string;
  completed: boolean;
}

export interface SkillOverlapAnalysis {
  overlapId: string;
  skillName: string;
  transferableFrom: string[];
  transferableTo: string[];
  overlapPercentage: number;
  insight: string;
}

export interface CareerRecommendation {
  recommendationId: string;
  type: 'ROLE_CHANGE' | 'SKILL_UPGRADE' | 'CERTIFICATION' | 'PROJECT' | 'NETWORKING';
  title: string;
  description: string;
  impactScore: number; // 0-100
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  timeline: string;
  priority: number;
  skillsInvolved: string[];
}

export interface SkillGapReport {
  reportId: string;
  generatedAt: string;
  targetRole: string;
  overallMatchScore: number;
  totalGaps: number;
  criticalGaps: number;
  alignedSkills: number;
  skills: UserSkill[];
  targetSkills: TargetSkill[];
  gaps: SkillGap[];
  careerPaths: CareerPath[];
  recommendations: CareerRecommendation[];
  overlapAnalysis: SkillOverlapAnalysis[];
}

export interface SkillGapAuditLog {
  logId: string;
  timestamp: string;
  action: 'REPORT_GENERATED' | 'CAREER_PATH_FAVORITED' | 'RESOURCE_BOOKMARKED' | 'SKILL_SELF_ASSESSED' | 'REPORT_EXPORTED';
  details: string;
  performer: string;
}

export interface SkillGapFilterQuery {
  category?: SkillCategory;
  severity?: GapSeverity;
  search?: string;
}

// Color maps for consistent styling
export const PROFICIENCY_COLORS: Record<SkillProficiency, string> = {
  NONE: '#ef4444',
  BEGINNER: '#f97316',
  INTERMEDIATE: '#eab308',
  ADVANCED: '#22c55e',
  EXPERT: '#3b82f6'
};

export const SEVERITY_COLORS: Record<GapSeverity, string> = {
  CRITICAL: '#ef4444',
  MAJOR: '#f97316',
  MODERATE: '#eab308',
  MINOR: '#22c55e',
  ALIGNED: '#3b82f6'
};

export const CATEGORY_COLORS: Record<SkillCategory, string> = {
  PROGRAMMING_LANGUAGES: '#6366f1',
  FRAMEWORKS: '#8b5cf6',
  TOOLS: '#a855f7',
  SOFT_SKILLS: '#ec4899',
  DOMAIN_KNOWLEDGE: '#f43f5e',
  CERTIFICATIONS: '#f97316',
  CLOUD_PLATFORMS: '#06b6d4',
  DATA_SCIENCE: '#14b8a6',
  DESIGN: '#84cc16',
  DEVOPS: '#22d3ee'
};

export const CATEGORY_ICONS: Record<SkillCategory, string> = {
  PROGRAMMING_LANGUAGES: '💻',
  FRAMEWORKS: '⚛️',
  TOOLS: '🛠️',
  SOFT_SKILLS: '🤝',
  DOMAIN_KNOWLEDGE: '📖',
  CERTIFICATIONS: '📜',
  CLOUD_PLATFORMS: '☁️',
  DATA_SCIENCE: '📊',
  DESIGN: '🎨',
  DEVOPS: '🔄'
};

export const DIFFICULTY_COLORS: Record<CareerPathDifficulty, string> = {
  EASY: '#22c55e',
  MODERATE: '#eab308',
  CHALLENGING: '#f97316',
  AMBITIOUS: '#ef4444'
};

export const FORMAT_ICONS: Record<LearningFormat, string> = {
  COURSE: '🎓',
  BOOK: '📚',
  PROJECT: '🚀',
  CERTIFICATION: '📜',
  MENTORSHIP: '👨‍🏫',
  BOOTCAMP: '⚡'
};

// Formatter utilities
export const formatProficiency = (p: SkillProficiency): string => 
  p.charAt(0) + p.slice(1).toLowerCase();

export const formatGapScore = (score: number): string => {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'Major';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Minor';
  return 'Aligned';
};

export const formatSalary = (amount: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
