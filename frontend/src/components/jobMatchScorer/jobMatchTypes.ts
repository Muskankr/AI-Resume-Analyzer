// Resume Job Match Scorer — Type Definitions

export type MatchScoreGrade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';

export type JobIndustry = 
  | 'TECHNOLOGY' | 'FINANCE' | 'HEALTHCARE' | 'EDUCATION' | 'RETAIL'
  | 'MANUFACTURING' | 'CONSULTING' | 'MEDIA' | 'GOVERNMENT' | 'ENERGY';

export type ExperienceLevel = 'INTERNSHIP' | 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD' | 'EXECUTIVE';

export type WorkMode = 'REMOTE' | 'HYBRID' | 'ONSITE';

export type ApplicationStatus = 'NOT_APPLIED' | 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'WITHDRAWN';

export type MatchCategory = 'SKILLS' | 'EXPERIENCE' | 'EDUCATION' | 'KEYWORDS' | 'CULTURE' | 'SALARY';

export type KeywordRelevance = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'OPTIONAL';

export type ResumeSection = 'SUMMARY' | 'EXPERIENCE' | 'SKILLS' | 'EDUCATION' | 'PROJECTS' | 'CERTIFICATIONS';

export interface JobPosting {
  jobId: string;
  title: string;
  company: string;
  industry: JobIndustry;
  location: string;
  workMode: WorkMode;
  experienceLevel: ExperienceLevel;
  salaryRange: { min: number; max: number };
  description: string;
  requirements: string[];
  niceToHaves: string[];
  postedDate: string;
  deadline: string;
  applicants: number;
  url: string;
  companyLogo: string;
  companyRating: number;
}

export interface JobKeyword {
  keyword: string;
  relevance: KeywordRelevance;
  category: MatchCategory;
  foundInResume: boolean;
  resumeSection?: ResumeSection;
  frequency: number;
  weight: number;
}

export interface SectionScore {
  section: ResumeSection;
  score: number;
  maxScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  feedback: string;
  improvementTips: string[];
}

export interface MatchScoreBreakdown {
  category: MatchCategory;
  score: number;
  maxScore: number;
  weight: number;
  grade: MatchScoreGrade;
  details: string;
}

export interface ResumeJobMatch {
  matchId: string;
  jobId: string;
  resumeVersion: string;
  overallScore: number;
  grade: MatchScoreGrade;
  passProbability: number;
  categoryBreakdown: MatchScoreBreakdown[];
  sectionScores: SectionScore[];
  jobKeywords: JobKeyword[];
  matchedCount: number;
  missingCount: number;
  totalKeywords: number;
  strengths: string[];
  weaknesses: string[];
  recommendedEdits: RecommendedEdit[];
  createdAt: string;
  status: ApplicationStatus;
}

export interface RecommendedEdit {
  editId: string;
  section: ResumeSection;
  type: 'ADD_KEYWORD' | 'REPHRASE' | 'ADD_QUANTIFICATION' | 'REMOVE_IRRELEVANT' | 'ADD_SECTION';
  description: string;
  impactScore: number;
  beforeSnippet?: string;
  afterSnippet?: string;
  priority: number;
}

export interface CompanyMatchHistory {
  companyId: string;
  companyName: string;
  jobsMatched: number;
  avgScore: number;
  bestScore: number;
  lastMatchDate: string;
}

export interface MatchTrend {
  month: string;
  avgScore: number;
  jobsAnalyzed: number;
  bestScore: number;
  applications: number;
}

export interface JobMatchAuditLog {
  logId: string;
  timestamp: string;
  action: 'MATCH_CALCULATED' | 'JOB_BOOKMARKED' | 'APPLICATION_SUBMITTED' | 'RESUME_TAILORED' | 'MATCH_EXPORTED';
  details: string;
  performer: string;
}

export interface MatchFilterQuery {
  industry?: JobIndustry;
  workMode?: WorkMode;
  minScore?: number;
  status?: ApplicationStatus;
  search?: string;
}

// Color maps
export const GRADE_COLORS: Record<MatchScoreGrade, string> = {
  'A+': '#22c55e', 'A': '#22c55e', 'B+': '#84cc16', 'B': '#eab308',
  'C+': '#f97316', 'C': '#f97316', 'D': '#ef4444', 'F': '#ef4444'
};

export const INDUSTRY_COLORS: Record<JobIndustry, string> = {
  TECHNOLOGY: '#6366f1', FINANCE: '#22c55e', HEALTHCARE: '#ef4444', EDUCATION: '#3b82f6',
  RETAIL: '#f59e0b', MANUFACTURING: '#6b7280', CONSULTING: '#8b5cf6', MEDIA: '#ec4899',
  GOVERNMENT: '#06b6d4', ENERGY: '#14b8a6'
};

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  NOT_APPLIED: '#6b7280', APPLIED: '#3b82f6', SCREENING: '#f59e0b', INTERVIEW: '#8b5cf6',
  OFFER: '#22c55e', REJECTED: '#ef4444', WITHDRAWN: '#9ca3af'
};

export const CATEGORY_COLORS: Record<MatchCategory, string> = {
  SKILLS: '#6366f1', EXPERIENCE: '#3b82f6', EDUCATION: '#06b6d4',
  KEYWORDS: '#f59e0b', CULTURE: '#ec4899', SALARY: '#22c55e'
};

export const RELEVANCE_COLORS: Record<KeywordRelevance, string> = {
  CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e', OPTIONAL: '#6b7280'
};

export const SECTION_ICONS: Record<ResumeSection, string> = {
  SUMMARY: '📝', EXPERIENCE: '💼', SKILLS: '🛠️', EDUCATION: '🎓', PROJECTS: '🚀', CERTIFICATIONS: '📜'
};

export const WORKMODE_ICONS: Record<WorkMode, string> = {
  REMOTE: '🏠', HYBRID: '🔄', ONSITE: '🏢'
};

export const INDUSTRY_ICONS: Record<JobIndustry, string> = {
  TECHNOLOGY: '💻', FINANCE: '💰', HEALTHCARE: '🏥', EDUCATION: '📚', RETAIL: '🛒',
  MANUFACTURING: '🏭', CONSULTING: '📊', MEDIA: '🎬', GOVERNMENT: '🏛️', ENERGY: '⚡'
};

// Formatters
export const formatSalary = (amount: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

export const formatScore = (score: number): string => `${Math.round(score)}%`;

export const gradeFromScore = (score: number): MatchScoreGrade => {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 65) return 'C+';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
};
