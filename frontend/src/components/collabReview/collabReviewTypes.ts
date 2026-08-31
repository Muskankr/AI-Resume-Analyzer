// Resume Collaboration & Peer Review — Type Definitions

export type ReviewStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED';

export type ReviewerRole = 'PEER' | 'MENTOR' | 'RECRUITER' | 'HIRING_MANAGER' | 'CAREER_COACH';

export type FeedbackCategory = 'CONTENT' | 'FORMATTING' | 'KEYWORDS' | 'QUANTIFICATION' | 'GRAMMAR' | 'RELEVANCE' | 'IMPACT' | 'DESIGN';

export type FeedbackSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'SUGGESTION' | 'PRAISE';

export type ReviewTemplate = 'QUICK_SCAN' | 'DEEP_DIVE' | 'ATS_CHECK' | 'EXECUTIVE' | 'CUSTOM';

export type CommentType = 'GENERAL' | 'INLINE' | 'SUGGESTION' | 'QUESTION' | 'RESOLVED';

export type CollaborationActivity = 'REVIEW_REQUESTED' | 'REVIEW_SUBMITTED' | 'COMMENT_ADDED' | 'REVISION_MADE' | 'REVIEW_COMPLETED' | 'RESUME_SHARED';

export interface Reviewer {
  reviewerId: string;
  name: string;
  avatar: string;
  role: ReviewerRole;
  expertise: string[];
  reviewsCompleted: number;
  avgRating: number;
  responseTime: string;
  isAvailable: boolean;
}

export interface ReviewRequest {
  requestId: string;
  resumeTitle: string;
  resumeVersion: string;
  requestorId: string;
  requestorName: string;
  reviewers: ReviewerAssignment[];
  template: ReviewTemplate;
  status: ReviewStatus;
  deadline: string;
  createdAt: string;
  targetRole: string;
  notes: string;
  isUrgent: boolean;
}

export interface ReviewerAssignment {
  reviewerId: string;
  reviewerName: string;
  role: ReviewerRole;
  status: ReviewStatus;
  assignedAt: string;
  completedAt?: string;
  overallScore?: number;
}

export interface FeedbackItem {
  feedbackId: string;
  requestId: string;
  reviewerId: string;
  reviewerName: string;
  category: FeedbackCategory;
  severity: FeedbackSeverity;
  section: string;
  lineReference?: string;
  originalText?: string;
  suggestedText?: string;
  comment: string;
  upvotes: number;
  isAccepted: boolean;
  createdAt: string;
}

export interface InlineComment {
  commentId: string;
  requestId: string;
  reviewerId: string;
  reviewerName: string;
  section: string;
  lineNumber: number;
  text: string;
  type: CommentType;
  replyTo?: string;
  replies: InlineComment[];
  resolved: boolean;
  createdAt: string;
}

export interface ReviewSummary {
  requestId: string;
  overallScore: number;
  categoryScores: { category: FeedbackCategory; score: number; count: number }[];
  totalFeedback: number;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  suggestionCount: number;
  praiseCount: number;
  acceptedCount: number;
  rejectedCount: number;
  topStrengths: string[];
  topImprovements: string[];
  consensusItems: string[];
  divergentItems: string[];
}

export interface ReviewComparison {
  versionA: string;
  versionB: string;
  scoreImprovement: number;
  feedbackResolved: number;
  feedbackRemaining: number;
  newIssues: number;
  sectionsImproved: string[];
  sectionsRegressed: string[];
}

export interface ReviewerLeaderboard {
  reviewerId: string;
  name: string;
  avatar: string;
  role: ReviewerRole;
  totalReviews: number;
  avgScore: number;
  helpfulVotes: number;
  responseTimeHours: number;
  specializations: string[];
}

export interface CollaborationActivityLog {
  activityId: string;
  type: CollaborationActivity;
  actorName: string;
  actorAvatar: string;
  targetResume: string;
  details: string;
  timestamp: string;
}

export interface ReviewAuditLog {
  logId: string;
  timestamp: string;
  action: 'REVIEW_CREATED' | 'REVIEW_COMPLETED' | 'FEEDBACK_ADDED' | 'REVISION_UPLOADED' | 'REVIEW_EXPORTED';
  details: string;
  performer: string;
}

// Color maps
export const STATUS_COLORS: Record<ReviewStatus, string> = {
  PENDING: '#f59e0b', IN_PROGRESS: '#3b82f6', COMPLETED: '#22c55e', DECLINED: '#ef4444'
};

export const ROLE_COLORS: Record<ReviewerRole, string> = {
  PEER: '#6366f1', MENTOR: '#22c55e', RECRUITER: '#f59e0b', HIRING_MANAGER: '#ec4899', CAREER_COACH: '#06b6d4'
};

export const SEVERITY_COLORS: Record<FeedbackSeverity, string> = {
  CRITICAL: '#ef4444', MAJOR: '#f97316', MINOR: '#eab308', SUGGESTION: '#3b82f6', PRAISE: '#22c55e'
};

export const CATEGORY_ICONS: Record<FeedbackCategory, string> = {
  CONTENT: '📝', FORMATTING: '🎨', KEYWORDS: '🔑', QUANTIFICATION: '📊', GRAMMAR: '✍️', RELEVANCE: '🎯', IMPACT: '💥', DESIGN: '🖼️'
};

export const TEMPLATE_LABELS: Record<ReviewTemplate, string> = {
  QUICK_SCAN: 'Quick Scan (5 min)', DEEP_DIVE: 'Deep Dive (20 min)', ATS_CHECK: 'ATS Check (10 min)',
  EXECUTIVE: 'Executive Review (30 min)', CUSTOM: 'Custom'
};

export const ROLE_ICONS: Record<ReviewerRole, string> = {
  PEER: '👥', MENTOR: '🎓', RECRUITER: '💼', HIRING_MANAGER: '👔', CAREER_COACH: '🧭'
};

export const ACTIVITY_ICONS: Record<CollaborationActivity, string> = {
  REVIEW_REQUESTED: '📨', REVIEW_SUBMITTED: '✅', COMMENT_ADDED: '💬',
  REVISION_MADE: '✏️', REVIEW_COMPLETED: '🏁', RESUME_SHARED: '🔗'
};

// Formatters
export const formatScore = (score: number): string => `${Math.round(score)}%`;

export const getScoreColor = (score: number): string => {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  return '#ef4444';
};
