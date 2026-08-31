import type {
  Reviewer, ReviewRequest, FeedbackItem, InlineComment, ReviewSummary,
  ReviewerLeaderboard, CollaborationActivityLog, ReviewAuditLog
} from './collabReviewTypes';

export function getReviewers(): Reviewer[] {
  return [
    { reviewerId: 'r1', name: 'Priya Sharma', avatar: '👩‍💻', role: 'RECRUITER', expertise: ['Tech Resumes', 'ATS Optimization', 'FAANG Applications'], reviewsCompleted: 142, avgRating: 4.8, responseTime: '2 hours', isAvailable: true },
    { reviewerId: 'r2', name: 'Marcus Chen', avatar: '👨‍🏫', role: 'MENTOR', expertise: ['Software Engineering', 'Career Transitions', 'System Design'], reviewsCompleted: 89, avgRating: 4.9, responseTime: '4 hours', isAvailable: true },
    { reviewerId: 'r3', name: 'Aisha Johnson', avatar: '👩‍💼', role: 'HIRING_MANAGER', expertise: ['Frontend', 'Product Design', 'Startups'], reviewsCompleted: 67, avgRating: 4.7, responseTime: '1 day', isAvailable: false },
    { reviewerId: 'r4', name: 'David Kim', avatar: '🧑‍💻', role: 'PEER', expertise: ['Full Stack', 'DevOps', 'Open Source'], reviewsCompleted: 234, avgRating: 4.6, responseTime: '1 hour', isAvailable: true },
    { reviewerId: 'r5', name: 'Sarah Williams', avatar: '👩‍🎓', role: 'CAREER_COACH', expertise: ['Executive Resumes', 'Career Strategy', 'Leadership'], reviewsCompleted: 312, avgRating: 4.9, responseTime: '6 hours', isAvailable: true },
    { reviewerId: 'r6', name: 'Raj Patel', avatar: '👨‍💻', role: 'PEER', expertise: ['Backend', 'Machine Learning', 'Data Science'], reviewsCompleted: 56, avgRating: 4.5, responseTime: '3 hours', isAvailable: true },
  ];
}

export function getReviewRequests(): ReviewRequest[] {
  return [
    {
      requestId: 'rr1', resumeTitle: 'Senior Frontend Engineer Resume', resumeVersion: 'v3.1 Optimized',
      requestorId: 'u1', requestorName: 'You',
      reviewers: [
        { reviewerId: 'r1', reviewerName: 'Priya Sharma', role: 'RECRUITER', status: 'COMPLETED', assignedAt: '2026-08-20T09:00:00Z', completedAt: '2026-08-20T11:30:00Z', overallScore: 82 },
        { reviewerId: 'r2', reviewerName: 'Marcus Chen', role: 'MENTOR', status: 'COMPLETED', assignedAt: '2026-08-20T09:00:00Z', completedAt: '2026-08-21T14:00:00Z', overallScore: 78 },
        { reviewerId: 'r4', reviewerName: 'David Kim', role: 'PEER', status: 'IN_PROGRESS', assignedAt: '2026-08-22T10:00:00Z' },
      ],
      template: 'DEEP_DIVE', status: 'IN_PROGRESS', deadline: '2026-08-28',
      createdAt: '2026-08-20T08:00:00Z', targetRole: 'Senior Frontend Engineer at Stripe',
      notes: 'Applying to Stripe, please focus on React/TypeScript skills and impact metrics.', isUrgent: false
    },
    {
      requestId: 'rr2', resumeTitle: 'Backend Developer Resume', resumeVersion: 'v2.0',
      requestorId: 'u1', requestorName: 'You',
      reviewers: [
        { reviewerId: 'r5', reviewerName: 'Sarah Williams', role: 'CAREER_COACH', status: 'COMPLETED', assignedAt: '2026-08-18T10:00:00Z', completedAt: '2026-08-19T16:00:00Z', overallScore: 71 },
      ],
      template: 'EXECUTIVE', status: 'COMPLETED', deadline: '2026-08-25',
      createdAt: '2026-08-18T09:00:00Z', targetRole: 'Senior Backend Engineer at Netflix',
      notes: 'Need executive-level polish for senior backend role.', isUrgent: true
    },
    {
      requestId: 'rr3', resumeTitle: 'Full Stack Engineer Resume', resumeVersion: 'v1.5',
      requestorId: 'u1', requestorName: 'You',
      reviewers: [
        { reviewerId: 'r3', reviewerName: 'Aisha Johnson', role: 'HIRING_MANAGER', status: 'PENDING', assignedAt: '2026-08-23T15:00:00Z' },
        { reviewerId: 'r6', reviewerName: 'Raj Patel', role: 'PEER', status: 'COMPLETED', assignedAt: '2026-08-23T15:00:00Z', completedAt: '2026-08-24T02:00:00Z', overallScore: 75 },
      ],
      template: 'ATS_CHECK', status: 'IN_PROGRESS', deadline: '2026-08-30',
      createdAt: '2026-08-23T14:00:00Z', targetRole: 'Full Stack Developer at Shopify',
      notes: 'ATS optimization focus, targeting remote roles.', isUrgent: false
    },
  ];
}

export function getFeedbackItems(): FeedbackItem[] {
  return [
    {
      feedbackId: 'f1',
      requestId: 'rr1',
      reviewerId: 'r1',
      reviewerName: 'Priya Sharma',
      category: 'QUANTIFICATION',
      severity: 'CRITICAL',
      section: 'EXPERIENCE',
      lineReference: 'Entry 2, Line 3',
      originalText: 'Improved page load times',
      suggestedText: 'Reduced page load time by 40% (3.2s → 1.9s) through code splitting and lazy loading',
      comment: 'Quantify your impact — recruiters look for measurable results.',
      upvotes: 5,
      isAccepted: true,
      createdAt: '2026-08-20T11:30:00Z'
    },

    {
      feedbackId: 'f2',
      requestId: 'rr1',
      reviewerId: 'r1',
      reviewerName: 'Priya Sharma',
      category: 'KEYWORDS',
      severity: 'MAJOR',
      section: 'SKILLS',
      lineReference: undefined,
      originalText: undefined,
      suggestedText: 'Add "GraphQL", "Performance Optimization", "CI/CD" to skills',
      comment: 'These keywords appear in 80%+ of senior frontend job descriptions at top companies.',
      upvotes: 4,
      isAccepted: false,
      createdAt: '2026-08-20T11:35:00Z'
    },

    {
      feedbackId: 'f3',
      requestId: 'rr1',
      reviewerId: 'r2',
      reviewerName: 'Marcus Chen',
      category: 'CONTENT',
      severity: 'MAJOR',
      section: 'SUMMARY',
      lineReference: 'Line 1-3',
      originalText: 'Experienced frontend developer with 4+ years of experience.',
      suggestedText: 'Senior Frontend Engineer with 4+ years building scalable React/TypeScript applications, specializing in performance optimization and design systems that serve 10M+ users.',
      comment: 'Lead with your strongest differentiator. Include tech stack and impact.',
      upvotes: 6,
      isAccepted: false,
      createdAt: '2026-08-21T14:00:00Z'
    },

    {
      feedbackId: 'f4',
      requestId: 'rr1',
      reviewerId: 'r2',
      reviewerName: 'Marcus Chen',
      category: 'IMPACT',
      severity: 'MINOR',
      section: 'EXPERIENCE',
      lineReference: 'Entry 1',
      originalText: undefined,
      suggestedText: undefined,
      comment: 'Add a bullet about leading a team project or mentoring juniors — shows leadership readiness for senior roles.',
      upvotes: 3,
      isAccepted: false,
      createdAt: '2026-08-21T14:05:00Z'
    },

    {
      feedbackId: 'f5',
      requestId: 'rr1',
      reviewerId: 'r4',
      reviewerName: 'David Kim',
      category: 'FORMATTING',
      severity: 'SUGGESTION',
      section: 'DESIGN',
      lineReference: undefined,
      originalText: undefined,
      suggestedText: undefined,
      comment: 'Consider adding a subtle color accent to section headers — makes the resume more scannable in 6-second reviews.',
      upvotes: 2,
      isAccepted: false,
      createdAt: '2026-08-22T11:00:00Z'
    },

    {
      feedbackId: 'f6',
      requestId: 'rr1',
      reviewerId: 'r4',
      reviewerName: 'David Kim',
      category: 'CONTENT',
      severity: 'SUGGESTION',
      section: 'PROJECTS',
      lineReference: undefined,
      originalText: undefined,
      suggestedText: undefined,
      comment: 'Excellent project descriptions — the open-source contribution stand-out bullet is very compelling.',
      upvotes: 3,
      isAccepted: true,
      createdAt: '2026-08-22T11:10:00Z'
    },

    {
      feedbackId: 'f7',
      requestId: 'rr2',
      reviewerId: 'r5',
      reviewerName: 'Sarah Williams',
      category: 'CONTENT',
      severity: 'CRITICAL',
      section: 'SUMMARY',
      lineReference: 'Line 1-2',
      originalText: 'Backend developer looking for new opportunities.',
      suggestedText: 'Results-driven Backend Engineer with 5+ years architecting high-throughput distributed systems processing 50K+ requests/sec, with deep expertise in Node.js, Go, and cloud-native infrastructure.',
      comment: 'Never start with "looking for opportunities" — position yourself as a solution, not a seeker.',
      upvotes: 8,
      isAccepted: true,
      createdAt: '2026-08-19T16:00:00Z'
    },

    {
      feedbackId: 'f8',
      requestId: 'rr2',
      reviewerId: 'r5',
      reviewerName: 'Sarah Williams',
      category: 'RELEVANCE',
      severity: 'MAJOR',
      section: 'EXPERIENCE',
      lineReference: 'Entry 3',
      originalText: undefined,
      suggestedText: undefined,
      comment: 'The early-career internship entry takes up too much space. Condense to 1 line and move skills/projects higher.',
      upvotes: 5,
      isAccepted: true,
      createdAt: '2026-08-19T16:10:00Z'
    },

    {
      feedbackId: 'f9',
      requestId: 'rr3',
      reviewerId: 'r6',
      reviewerName: 'Raj Patel',
      category: 'KEYWORDS',
      severity: 'MAJOR',
      section: 'SKILLS',
      lineReference: undefined,
      originalText: undefined,
      suggestedText: 'Add: Ruby on Rails, PostgreSQL, Redis, GraphQL',
      comment: 'Shopify uses Rails heavily. These are must-have keywords for their ATS.',
      upvotes: 7,
      isAccepted: false,
      createdAt: '2026-08-24T02:00:00Z'
    },

    {
      feedbackId: 'f10',
      requestId: 'rr3',
      reviewerId: 'r6',
      reviewerName: 'Raj Patel',
      category: 'GRAMMAR',
      severity: 'MINOR',
      section: 'EXPERIENCE',
      lineReference: 'Entry 1, Line 5',
      originalText: 'Developed API endpoints and maintained database schemas.',
      suggestedText: 'Designed and developed RESTful API endpoints serving 10K+ daily active users, while optimizing PostgreSQL database schemas for 30% faster query performance.',
      comment: 'Convert passive descriptions to active, quantified achievements.',
      upvotes: 4,
      isAccepted: false,
      createdAt: '2026-08-24T02:10:00Z'
    }
  ];
}

export function getInlineComments(): InlineComment[] {
  return [
    { commentId: 'ic1', requestId: 'rr1', reviewerId: 'r1', reviewerName: 'Priya Sharma', section: 'SUMMARY', lineNumber: 2, text: 'This feels generic — every frontend dev says this. What makes you unique?', type: 'QUESTION', replies: [
      { commentId: 'ic1r1', requestId: 'rr1', reviewerId: 'u1', reviewerName: 'You', section: 'SUMMARY', lineNumber: 2, text: 'Good point — I\'ll add my performance optimization specialty.', type: 'GENERAL', replies: [], resolved: false, createdAt: '2026-08-20T12:00:00Z' }
    ], resolved: false, createdAt: '2026-08-20T11:32:00Z' },
    { commentId: 'ic2', requestId: 'rr1', reviewerId: 'r2', reviewerName: 'Marcus Chen', section: 'EXPERIENCE', lineNumber: 8, text: 'Great bullet! Consider adding the business impact — how did this affect revenue or user retention?', type: 'SUGGESTION', replies: [], resolved: false, createdAt: '2026-08-21T14:02:00Z' },
    { commentId: 'ic3', requestId: 'rr1', reviewerId: 'r4', reviewerName: 'David Kim', section: 'SKILLS', lineNumber: 15, text: 'Missing GraphQL — huge for Stripe job. Also add WebSocket for real-time work.', type: 'INLINE', replies: [], resolved: false, createdAt: '2026-08-22T10:30:00Z' },
  ];
}

export function getReviewSummary(requestId: string): ReviewSummary {
  return {
    requestId,
    overallScore: requestId === 'rr1' ? 80 : requestId === 'rr2' ? 71 : 75,
    categoryScores: [
      { category: 'CONTENT', score: 75, count: 3 },
      { category: 'QUANTIFICATION', score: 65, count: 2 },
      { category: 'KEYWORDS', score: 70, count: 3 },
      { category: 'FORMATTING', score: 88, count: 1 },
      { category: 'IMPACT', score: 72, count: 2 },
      { category: 'GRAMMAR', score: 90, count: 1 },
      { category: 'RELEVANCE', score: 68, count: 1 },
      { category: 'DESIGN', score: 85, count: 1 },
    ],
    totalFeedback: requestId === 'rr1' ? 6 : requestId === 'rr2' ? 2 : 2,
    criticalCount: requestId === 'rr1' ? 1 : requestId === 'rr2' ? 1 : 0,
    majorCount: requestId === 'rr1' ? 2 : requestId === 'rr2' ? 1 : 1,
    minorCount: requestId === 'rr1' ? 1 : 0,
    suggestionCount: requestId === 'rr1' ? 1 : 0,
    praiseCount: requestId === 'rr1' ? 1 : 0,
    acceptedCount: requestId === 'rr1' ? 2 : requestId === 'rr2' ? 2 : 0,
    rejectedCount: 0,
    topStrengths: ['Strong project descriptions', 'Good technical depth', 'Relevant experience'],
    topImprovements: ['Add quantified metrics everywhere', 'Strengthen summary statement', 'Add missing keywords (GraphQL, CI/CD)'],
    consensusItems: ['Summary needs rewrite', 'More metrics needed'],
    divergentItems: ['Formatting preferences differ between reviewers'],
  };
}

export function getLeaderboard(): ReviewerLeaderboard[] {
  return [
    { reviewerId: 'r5', name: 'Sarah Williams', avatar: '👩‍🎓', role: 'CAREER_COACH', totalReviews: 312, avgScore: 4.9, helpfulVotes: 1245, responseTimeHours: 6, specializations: ['Executive', 'Leadership', 'Strategy'] },
    { reviewerId: 'r4', name: 'David Kim', avatar: '🧑‍💻', role: 'PEER', totalReviews: 234, avgScore: 4.6, helpfulVotes: 890, responseTimeHours: 1, specializations: ['Full Stack', 'DevOps', 'Open Source'] },
    { reviewerId: 'r1', name: 'Priya Sharma', avatar: '👩‍💻', role: 'RECRUITER', totalReviews: 142, avgScore: 4.8, helpfulVotes: 678, responseTimeHours: 2, specializations: ['Tech', 'ATS', 'FAANG'] },
    { reviewerId: 'r2', name: 'Marcus Chen', avatar: '👨‍🏫', role: 'MENTOR', totalReviews: 89, avgScore: 4.9, helpfulVotes: 534, responseTimeHours: 4, specializations: ['Software Eng', 'Career Transitions'] },
    { reviewerId: 'r3', name: 'Aisha Johnson', avatar: '👩‍💼', role: 'HIRING_MANAGER', totalReviews: 67, avgScore: 4.7, helpfulVotes: 412, responseTimeHours: 24, specializations: ['Frontend', 'Product', 'Startups'] },
    { reviewerId: 'r6', name: 'Raj Patel', avatar: '👨‍💻', role: 'PEER', totalReviews: 56, avgScore: 4.5, helpfulVotes: 234, responseTimeHours: 3, specializations: ['Backend', 'ML', 'Data Science'] },
  ];
}

export function getActivityLog(): CollaborationActivityLog[] {
  return [
    { activityId: 'al1', type: 'REVIEW_SUBMITTED', actorName: 'Priya Sharma', actorAvatar: '👩‍💻', targetResume: 'Senior Frontend Engineer Resume', details: 'Completed deep dive review — 82% score', timestamp: '2026-08-20T11:30:00Z' },
    { activityId: 'al2', type: 'REVIEW_SUBMITTED', actorName: 'Marcus Chen', actorAvatar: '👨‍🏫', targetResume: 'Senior Frontend Engineer Resume', details: 'Completed mentor review — 78% score', timestamp: '2026-08-21T14:00:00Z' },
    { activityId: 'al3', type: 'COMMENT_ADDED', actorName: 'David Kim', actorAvatar: '🧑‍💻', targetResume: 'Senior Frontend Engineer Resume', details: 'Added 2 inline comments on SKILLS section', timestamp: '2026-08-22T10:30:00Z' },
    { activityId: 'al4', type: 'REVISION_MADE', actorName: 'You', actorAvatar: '🎯', targetResume: 'Senior Frontend Engineer Resume', details: 'Accepted critical feedback: quantified 3 experience bullets', timestamp: '2026-08-23T09:00:00Z' },
    { activityId: 'al5', type: 'REVIEW_COMPLETED', actorName: 'Sarah Williams', actorAvatar: '👩‍🎓', targetResume: 'Backend Developer Resume', details: 'Executive review completed — 71% score, 2 critical items', timestamp: '2026-08-19T16:00:00Z' },
    { activityId: 'al6', type: 'REVIEW_REQUESTED', actorName: 'You', actorAvatar: '🎯', targetResume: 'Full Stack Engineer Resume', details: 'Requested ATS check from Aisha Johnson and Raj Patel', timestamp: '2026-08-23T14:00:00Z' },
  ];
}

export function getAuditLogs(): ReviewAuditLog[] {
  return [
    { logId: 'ral1', timestamp: '2026-08-24T10:00:00Z', action: 'REVISION_UPLOADED', details: 'Uploaded v3.2 with 3 quantified experience bullets', performer: 'You' },
    { logId: 'ral2', timestamp: '2026-08-23T14:00:00Z', action: 'REVIEW_CREATED', details: 'New review request for Full Stack Engineer Resume', performer: 'You' },
    { logId: 'ral3', timestamp: '2026-08-22T11:00:00Z', action: 'FEEDBACK_ADDED', details: 'David Kim added 2 feedback items and 3 inline comments', performer: 'David Kim' },
    { logId: 'ral4', timestamp: '2026-08-21T14:00:00Z', action: 'REVIEW_COMPLETED', details: 'Marcus Chen completed mentor review — 78% score', performer: 'Marcus Chen' },
    { logId: 'ral5', timestamp: '2026-08-20T11:30:00Z', action: 'REVIEW_COMPLETED', details: 'Priya Sharma completed recruiter review — 82% score', performer: 'Priya Sharma' },
    { logId: 'ral6', timestamp: '2026-08-20T09:00:00Z', action: 'REVIEW_CREATED', details: 'Review request created for Senior Frontend Engineer Resume', performer: 'You' },
  ];
}

export function getMonthlyTrends() {
  return [
    { month: 'Mar', avgScore: 62, reviewsCompleted: 3, feedbackItems: 12 },
    { month: 'Apr', avgScore: 68, reviewsCompleted: 5, feedbackItems: 18 },
    { month: 'May', avgScore: 72, reviewsCompleted: 4, feedbackItems: 15 },
    { month: 'Jun', avgScore: 75, reviewsCompleted: 6, feedbackItems: 22 },
    { month: 'Jul', avgScore: 78, reviewsCompleted: 4, feedbackItems: 14 },
    { month: 'Aug', avgScore: 82, reviewsCompleted: 3, feedbackItems: 10 },
  ];
}
