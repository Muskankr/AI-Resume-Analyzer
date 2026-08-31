import type {
  InterviewQuestion, PracticeSession, InterviewCompanyProfile,
  STARStory, PrepAuditLog, PrepStreak
} from './interviewPrepTypes';

export function getQuestions(): InterviewQuestion[] {
  return [
    { questionId: 'q1', text: 'Tell me about a time you had to debug a critical production issue under pressure.', category: 'BEHAVIORAL', difficulty: 'MEDIUM', round: 'TECHNICAL', company: 'Stripe', companyType: 'FAANG', frequency: 92, upvotes: 234, tips: ['Use STAR method', 'Mention tools and process', 'Quantify impact', 'Show calm under pressure'], relatedQuestions: ['q2', 'q5'], resumeReference: 'Experience Entry 2' },
    { questionId: 'q2', text: 'How do you approach performance optimization in a React application?', category: 'TECHNICAL', difficulty: 'HARD', round: 'TECHNICAL', company: 'Google', companyType: 'FAANG', frequency: 88, upvotes: 189, tips: ['Mention profiling tools', 'Discuss memo/useMemo tradeoffs', 'Talk about bundle analysis', 'Real examples from projects'], relatedQuestions: ['q1', 'q8'], resumeReference: 'Skills: React' },
    { questionId: 'q3', text: 'Describe a system you designed that handled high traffic. What trade-offs did you make?', category: 'SYSTEM_DESIGN', difficulty: 'EXPERT', round: 'ONSITE', company: 'Netflix', companyType: 'FAANG', frequency: 85, upvotes: 167, tips: ['Start with requirements', 'Draw high-level diagram', 'Discuss scalability', 'Mention monitoring and fallbacks'], relatedQuestions: ['q7'], resumeReference: 'Projects: Real-time Dashboard' },
    { questionId: 'q4', text: 'Why are you interested in joining our team, and how does your background align?', category: 'CULTURE_FIT', difficulty: 'EASY', round: 'HR', company: 'Shopify', companyType: 'FAANG', frequency: 95, upvotes: 312, tips: ['Research the company', 'Connect resume to their mission', 'Mention specific products', 'Show genuine enthusiasm'], relatedQuestions: ['q9'], resumeReference: 'Summary' },
    { questionId: 'q5', text: 'Tell me about a time you disagreed with a technical decision. How did you handle it?', category: 'LEADERSHIP', difficulty: 'MEDIUM', round: 'FINAL', company: 'Stripe', companyType: 'FAANG', frequency: 78, upvotes: 156, tips: ['Show respect for others', 'Present data-driven arguments', 'Show compromise', 'Mention outcome'], relatedQuestions: ['q1'], resumeReference: 'Experience Entry 1' },
    { questionId: 'q6', text: 'Implement a function that finds the longest substring without repeating characters.', category: 'CODING', difficulty: 'MEDIUM', round: 'TECHNICAL', company: 'Amazon', companyType: 'FAANG', frequency: 82, upvotes: 203, tips: ['Think out loud', 'Start with brute force', 'Optimize to sliding window', 'Discuss time/space complexity'], relatedQuestions: ['q10'], resumeReference: 'Skills: Problem Solving' },
    { questionId: 'q7', text: 'Your resume mentions a real-time dashboard. Walk me through the architecture decisions.', category: 'RESUME_BASED', difficulty: 'HARD', round: 'ONSITE', company: 'Vercel', companyType: 'STARTUP', frequency: 70, upvotes: 134, tips: ['Be specific about tech choices', 'Explain WebSocket vs SSE', 'Discuss scaling challenges', 'Mention monitoring'], relatedQuestions: ['q3', 'q8'], resumeReference: 'Projects: Real-time Dashboard' },
    { questionId: 'q8', text: 'How do you ensure code quality and maintainability in a fast-paced team?', category: 'SITUATIONAL', difficulty: 'MEDIUM', round: 'PHONE_SCREEN', company: 'Shopify', companyType: 'FAANG', frequency: 75, upvotes: 145, tips: ['Mention code reviews', 'Talk about testing strategy', 'Discuss documentation', 'Show awareness of tradeoffs'], relatedQuestions: ['q2', 'q5'], resumeReference: 'Experience' },
    { questionId: 'q9', text: 'Describe a project where you had to learn a new technology quickly. How did you approach it?', category: 'BEHAVIORAL', difficulty: 'EASY', round: 'PHONE_SCREEN', company: 'Figma', companyType: 'STARTUP', frequency: 80, upvotes: 178, tips: ['Show learning process', 'Mention resources used', 'Talk about application', 'Quantify outcome'], relatedQuestions: ['q4', 'q1'], resumeReference: 'Projects' },
    { questionId: 'q10', text: 'Explain the difference between TCP and UDP. When would you use each?', category: 'TECHNICAL', difficulty: 'EASY', round: 'PHONE_SCREEN', company: 'Netflix', companyType: 'FAANG', frequency: 65, upvotes: 98, tips: ['Explain reliability vs speed', 'Real-world examples', 'Mention HTTP/3 and QUIC', 'Connect to your projects'], relatedQuestions: ['q6'], resumeReference: 'Skills: Networking' },
  ];
}

export function getCompanyProfiles(): InterviewCompanyProfile[] {
  return [
    { companyId: 'cp1', name: 'Stripe', type: 'FAANG', logo: '💳', topQuestions: ['q1', 'q5', 'q2'], avgDifficulty: 'HARD', cultureNotes: 'Values clear communication, data-driven decisions, and user-first thinking.', prepTips: ['Study payment systems', 'Know their API docs', 'Practice system design'], questionBank: 45, successRate: 32 },
    { companyId: 'cp2', name: 'Google', type: 'FAANG', logo: '🔍', topQuestions: ['q2', 'q3', 'q6'], avgDifficulty: 'EXPERT', cultureNotes: 'Focus on Googleyness, leadership, and general cognitive ability.', prepTips: ['Practice LeetCode mediums/hards', 'Study distributed systems', 'Prepare behavioral stories'], questionBank: 120, successRate: 18 },
    { companyId: 'cp3', name: 'Netflix', type: 'FAANG', logo: '🎬', topQuestions: ['q3', 'q10', 'q7'], avgDifficulty: 'HARD', cultureNotes: 'Freedom and responsibility culture. High performance expected.', prepTips: ['Study streaming architecture', 'Know their tech blog', 'Prepare culture fit answers'], questionBank: 38, successRate: 25 },
    { companyId: 'cp4', name: 'Shopify', type: 'FAANG', logo: '🛍️', topQuestions: ['q4', 'q8', 'q9'], avgDifficulty: 'MEDIUM', cultureNotes: 'Entrepreneurial mindset, merchant-first approach.', prepTips: ['Know their platform', 'Study commerce patterns', 'Show entrepreneurial spirit'], questionBank: 42, successRate: 35 },
    { companyId: 'cp5', name: 'Vercel', type: 'STARTUP', logo: '▲', topQuestions: ['q7', 'q2', 'q3'], avgDifficulty: 'HARD', cultureNotes: 'Developer experience obsessed. Ship fast, iterate.', prepTips: ['Know Next.js deeply', 'Study edge computing', 'Show open-source passion'], questionBank: 28, successRate: 28 },
  ];
}

export function getPracticeSessions(): PracticeSession[] {
  return [
    { sessionId: 'ps1', questionId: 'q1', questionText: 'Tell me about a time you had to debug a critical production issue under pressure.', category: 'BEHAVIORAL', difficulty: 'MEDIUM', status: 'COMPLETED', userAnswer: 'When our payment service went down during peak hours, I immediately set up a war room, identified the root cause through log analysis, created a hotfix, and deployed it within 30 minutes.', score: 85, timeTaken: 180, attempts: 2, startedAt: '2026-08-23T10:00:00Z', completedAt: '2026-08-23T10:03:00Z' },
    { sessionId: 'ps2', questionId: 'q2', questionText: 'How do you approach performance optimization in a React application?', category: 'TECHNICAL', difficulty: 'HARD', status: 'COMPLETED', userAnswer: 'I start by profiling with React DevTools, identify re-renders, apply useMemo and React.memo strategically, code-split with lazy loading, and optimize bundle size with tree shaking.', score: 78, timeTaken: 240, attempts: 1, startedAt: '2026-08-23T11:00:00Z', completedAt: '2026-08-23T11:04:00Z' },
    { sessionId: 'ps3', questionId: 'q6', questionText: 'Implement a function that finds the longest substring without repeating characters.', category: 'CODING', difficulty: 'MEDIUM', status: 'COMPLETED', userAnswer: 'Use sliding window with a Set. Move right pointer, add chars. If duplicate, move left pointer until removed. Track max length.', score: 92, timeTaken: 300, attempts: 1, startedAt: '2026-08-24T09:00:00Z', completedAt: '2026-08-24T09:05:00Z' },
    { sessionId: 'ps4', questionId: 'q4', questionText: 'Why are you interested in joining our team?', category: 'CULTURE_FIT', difficulty: 'EASY', status: 'IN_PROGRESS', userAnswer: '', timeTaken: 0, attempts: 0, startedAt: '2026-08-24T14:00:00Z' },
  ];
}

export function getSTARStories(): STARStory[] {
  return [
    { storyId: 'ss1', title: 'Production Debug War Room', situation: 'Our payment processing service crashed during Black Friday peak hours (50K concurrent users).', task: 'As the on-call engineer, I needed to identify the root cause and deploy a fix within 30 minutes.', action: 'Set up a war room, analyzed distributed traces, identified a memory leak in the connection pool, wrote a hotfix, and coordinated deployment across 3 regions.', result: 'Service restored in 25 minutes. Zero lost transactions. Implemented monitoring that prevented 3 future incidents.', skillsDemonstrated: ['Debugging', 'Crisis Management', 'Distributed Systems', 'Communication'], applicableQuestions: ['q1', 'q5'], lastUsed: '2026-08-23', rating: 5 },
    { storyId: 'ss2', title: 'React Performance Optimization', situation: 'Our dashboard had 50+ components with frequent unnecessary re-renders, causing 3s load times.', task: 'I was tasked with reducing load time to under 1s without rewriting the entire app.', action: 'Profiled with React DevTools, identified 12 components re-rendering unnecessarily, applied React.memo and useMemo, code-split with lazy loading, optimized image loading.', result: 'Load time reduced from 3.2s to 0.8s (75% improvement). Lighthouse score went from 45 to 92.', skillsDemonstrated: ['React', 'Performance', 'Profiling', 'Optimization'], applicableQuestions: ['q2', 'q8'], lastUsed: '2026-08-23', rating: 5 },
    { storyId: 'ss3', title: 'Mentoring Junior Developer', situation: 'A new junior developer was struggling with our codebase and feeling overwhelmed.', task: 'As their assigned mentor, I needed to bring them up to speed within their first month.', action: 'Created a structured onboarding plan, paired programmed for 2 weeks, established weekly 1:1s, created documentation for common patterns, and gave progressively harder tasks.', result: 'They shipped their first feature in 3 weeks (ahead of typical 6-week timeline). They now mentor other juniors.', skillsDemonstrated: ['Leadership', 'Mentoring', 'Communication', 'Planning'], applicableQuestions: ['q5', 'q9'], lastUsed: '2026-08-20', rating: 4 },
  ];
}

export function getStreak(): PrepStreak {
  return {
    currentStreak: 5, longestStreak: 12, totalPracticeDays: 47,
    totalSessions: 156, avgScore: 82, bestScore: 95
  };
}

export function getAuditLogs(): PrepAuditLog[] {
  return [
    { logId: 'ipl1', timestamp: '2026-08-24T09:05:00Z', action: 'PRACTICE_COMPLETED', details: 'Completed coding question: Longest Substring — scored 92%', performer: 'You' },
    { logId: 'ipl2', timestamp: '2026-08-24T09:00:00Z', action: 'SESSION_STARTED', details: 'Started practice session for coding question', performer: 'You' },
    { logId: 'ipl3', timestamp: '2026-08-23T11:04:00Z', action: 'PRACTICE_COMPLETED', details: 'Completed technical question: React Performance — scored 78%', performer: 'You' },
    { logId: 'ipl4', timestamp: '2026-08-23T10:03:00Z', action: 'FEEDBACK_RECEIVED', details: 'AI feedback received for behavioral question — 85% score, 3 strengths, 2 improvements', performer: 'AI Coach' },
    { logId: 'ipl5', timestamp: '2026-08-23T10:00:00Z', action: 'SESSION_STARTED', details: 'Started practice for behavioral question from Stripe interview', performer: 'You' },
    { logId: 'ipl6', timestamp: '2026-08-22T15:00:00Z', action: 'STAR_SAVED', details: 'Saved new STAR story: React Performance Optimization', performer: 'You' },
    { logId: 'ipl7', timestamp: '2026-08-21T09:00:00Z', action: 'STREAK_ACHIEVED', details: 'Achieved 5-day practice streak! 🔥', performer: 'System' },
  ];
}

export function getMonthlyTrends() {
  return [
    { month: 'Mar', sessions: 8, avgScore: 65, streak: 3 },
    { month: 'Apr', sessions: 12, avgScore: 70, streak: 5 },
    { month: 'May', sessions: 15, avgScore: 74, streak: 8 },
    { month: 'Jun', sessions: 18, avgScore: 78, streak: 10 },
    { month: 'Jul', sessions: 22, avgScore: 82, streak: 12 },
    { month: 'Aug', sessions: 14, avgScore: 85, streak: 5 },
  ];
}
