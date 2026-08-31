// Resume Interview Prep Coach — Type Definitions

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

export type QuestionCategory = 'BEHAVIORAL' | 'TECHNICAL' | 'SYSTEM_DESIGN' | 'CODING' | 'SITUATIONAL' | 'CULTURE_FIT' | 'LEADERSHIP' | 'RESUME_BASED';

export type InterviewRound = 'PHONE_SCREEN' | 'TECHNICAL' | 'ONSITE' | 'FINAL' | 'HR';

export type PracticeStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REVIEWED';

export type FeedbackType = 'AI_GENERATED' | 'PEER_REVIEW' | 'SELF_ASSESSMENT' | 'MENTOR_REVIEW';

export type CompanyType = 'FAANG' | 'STARTUP' | 'ENTERPRISE' | 'AGENCY' | 'OPEN_SOURCE';

export type STARComponent = 'SITUATION' | 'TASK' | 'ACTION' | 'RESULT';

export interface InterviewQuestion {
  questionId: string;
  text: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  round: InterviewRound;
  company: string;
  companyType: CompanyType;
  frequency: number; // how often asked (1-100)
  upvotes: number;
  answer?: string;
  starBreakdown?: { component: STARComponent; content: string }[];
  tips: string[];
  relatedQuestions: string[];
  resumeReference?: string;
}

export interface PracticeSession {
  sessionId: string;
  questionId: string;
  questionText: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  status: PracticeStatus;
  userAnswer: string;
  aiFeedback?: PracticeFeedback;
  score?: number;
  timeTaken: number; // seconds
  attempts: number;
  startedAt: string;
  completedAt?: string;
}

export interface PracticeFeedback {
  feedbackId: string;
  overallScore: number;
  clarityScore: number;
  relevanceScore: number;
  structureScore: number;
  impactScore: number;
  strengths: string[];
  improvements: string[];
  suggestedAnswer?: string;
  starAnalysis?: { component: STARComponent; score: number; feedback: string }[];
  keywordsMentioned: string[];
  keywordsMissing: string[];
}

export interface InterviewCompanyProfile {
  companyId: string;
  name: string;
  type: CompanyType;
  logo: string;
  topQuestions: string[];
  avgDifficulty: QuestionDifficulty;
  cultureNotes: string;
  prepTips: string[];
  questionBank: number;
  successRate: number;
}

export interface MockInterview {
  interviewId: string;
  company: string;
  role: string;
  round: InterviewRound;
  questions: InterviewQuestion[];
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  overallScore?: number;
  duration: number; // minutes
  scheduledAt: string;
  completedAt?: string;
}

export interface STARStory {
  storyId: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  skillsDemonstrated: string[];
  applicableQuestions: string[];
  lastUsed?: string;
  rating: number;
}

export interface PrepAuditLog {
  logId: string;
  timestamp: string;
  action: 'PRACTICE_COMPLETED' | 'SESSION_STARTED' | 'STAR_SAVED' | 'MOCK_INTERVIEW_DONE' | 'FEEDBACK_RECEIVED' | 'STREAK_ACHIEVED';
  details: string;
  performer: string;
}

export interface PrepStreak {
  currentStreak: number;
  longestStreak: number;
  totalPracticeDays: number;
  totalSessions: number;
  avgScore: number;
  bestScore: number;
}

// Color maps
export const DIFFICULTY_COLORS: Record<QuestionDifficulty, string> = {
  EASY: '#22c55e', MEDIUM: '#eab308', HARD: '#f97316', EXPERT: '#ef4444'
};

export const CATEGORY_COLORS: Record<QuestionCategory, string> = {
  BEHAVIORAL: '#6366f1', TECHNICAL: '#3b82f6', SYSTEM_DESIGN: '#8b5cf6',
  CODING: '#06b6d4', SITUATIONAL: '#f59e0b', CULTURE_FIT: '#ec4899',
  LEADERSHIP: '#22c55e', RESUME_BASED: '#f97316'
};

export const CATEGORY_ICONS: Record<QuestionCategory, string> = {
  BEHAVIORAL: '🧠', TECHNICAL: '💻', SYSTEM_DESIGN: '🏗️', CODING: '⌨️',
  SITUATIONAL: '🎭', CULTURE_FIT: '🤝', LEADERSHIP: '👔', RESUME_BASED: '📄'
};

export const ROUND_COLORS: Record<InterviewRound, string> = {
  PHONE_SCREEN: '#6b7280', TECHNICAL: '#3b82f6', ONSITE: '#8b5cf6', FINAL: '#22c55e', HR: '#ec4899'
};

export const STATUS_COLORS: Record<PracticeStatus, string> = {
  NOT_STARTED: '#6b7280', IN_PROGRESS: '#3b82f6', COMPLETED: '#22c55e', REVIEWED: '#8b5cf6'
};

export const COMPANY_TYPE_ICONS: Record<CompanyType, string> = {
  FAANG: '🏢', STARTUP: '🚀', ENTERPRISE: '🏛️', AGENCY: '📋', OPEN_SOURCE: '🌐'
};

export const STAR_COLORS: Record<STARComponent, string> = {
  SITUATION: '#6366f1', TASK: '#f59e0b', ACTION: '#3b82f6', RESULT: '#22c55e'
};

// Formatters
export const formatScore = (score: number): string => `${Math.round(score)}%`;
export const getScoreColor = (score: number): string => {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  return '#ef4444';
};
export const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};
