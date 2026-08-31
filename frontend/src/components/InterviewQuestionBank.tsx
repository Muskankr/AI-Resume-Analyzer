import { useState, useMemo, useCallback, useEffect, useRef } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

type QuestionCategory = 'behavioral' | 'technical' | 'system-design' | 'coding' | 'leadership' | 'culture-fit'
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
type AnswerStatus = 'unanswered' | 'attempted' | 'reviewed' | 'mastered'
type PracticeMode = 'free' | 'timed' | 'mock' | 'spaced'
type InterviewStage = 'screening' | 'phone' | 'technical' | 'onsite' | 'final'
type SortBy = 'difficulty' | 'category' | 'status' | 'recent' | 'popular'

interface InterviewQuestion {
  id: string
  question: string
  category: QuestionCategory
  difficulty: Difficulty
  status: AnswerStatus
  sampleAnswer: string
  keyPoints: string[]
  tips: string[]
  followUps: string[]
  timeLimit: number // seconds
  askedBy: string[]
  frequency: number
  successRate: number
  yourScore: number | null
  lastAttempted: string | null
  attempts: number
  tags: string[]
}

interface PracticeSession {
  id: string
  mode: PracticeMode
  questions: InterviewQuestion[]
  currentIndex: number
  answers: SessionAnswer[]
  startTime: string
  timeRemaining: number
  totalScore: number
  maxScore: number
  completed: boolean
}

interface SessionAnswer {
  questionId: string
  answer: string
  timeSpent: number
  score: number
  feedback: string
  keyPointsHit: string[]
  keyPointsMissed: string[]
}

interface MockInterview {
  id: string
  title: string
  role: string
  company: string
  stage: InterviewStage
  duration: number // minutes
  questions: InterviewQuestion[]
  difficulty: Difficulty
  description: string
}

interface CategoryStats {
  category: QuestionCategory
  total: number
  mastered: number
  attempted: number
  avgScore: number
  icon: string
  color: string
}

interface LeaderboardEntry {
  rank: number
  name: string
  avatar: string
  totalScore: number
  questionsAnswered: number
  streak: number
  badge: string
}

interface StudyPlan {
  id: string
  title: string
  days: number
  questionsPerDay: number
  focus: QuestionCategory[]
  estimatedImprovement: number
  progress: number
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<QuestionCategory, { label: string; icon: string; color: string }> = {
  behavioral:    { label: 'Behavioral',    icon: '🗣️', color: '#3b82f6' },
  technical:     { label: 'Technical',     icon: '💻', color: '#10b981' },
  'system-design': { label: 'System Design', icon: '🏗️', color: '#f59e0b' },
  coding:        { label: 'Coding',        icon: '⚡', color: '#8b5cf6' },
  leadership:    { label: 'Leadership',    icon: '👔', color: '#ef4444' },
  'culture-fit': { label: 'Culture Fit',   icon: '🤝', color: '#ec4899' },
}

const DIFFICULTY_MAP: Record<Difficulty, { label: string; color: string; points: number }> = {
  easy:   { label: 'Easy',   color: '#10b981', points: 10 },
  medium: { label: 'Medium', color: '#f59e0b', points: 20 },
  hard:   { label: 'Hard',   color: '#ef4444', points: 30 },
  expert: { label: 'Expert', color: '#8b5cf6', points: 50 },
}

const STATUS_MAP: Record<AnswerStatus, { label: string; color: string; icon: string }> = {
  unanswered: { label: 'Unanswered', color: '#6b7280', icon: '⭕' },
  attempted:  { label: 'Attempted',  color: '#f59e0b', icon: '🔄' },
  reviewed:   { label: 'Reviewed',   color: '#3b82f6', icon: '👁️' },
  mastered:   { label: 'Mastered',   color: '#10b981', icon: '⭐' },
}

const STAGE_MAP: Record<InterviewStage, { label: string; icon: string }> = {
  screening: { label: 'Phone Screen',    icon: '📱' },
  phone:     { label: 'Phone Interview',  icon: '📞' },
  technical: { label: 'Technical Round',  icon: '💻' },
  onsite:    { label: 'Onsite / Virtual',  icon: '🏢' },
  final:     { label: 'Final Round',      icon: '🎯' },
}

// ─── Sample Data ────────────────────────────────────────────────────────────

const SAMPLE_QUESTIONS: InterviewQuestion[] = [
  // Behavioral
  { id: 'b1', question: 'Tell me about a time you had to deal with a difficult team member. How did you handle it?', category: 'behavioral', difficulty: 'medium', status: 'mastered', sampleAnswer: 'In my previous role, a teammate consistently missed deadlines which affected the whole sprint. Instead of escalating immediately, I invited them for coffee to understand their perspective. I discovered they were struggling with an unfamiliar codebase. I pair-programmed with them for a week, which improved their velocity by 40% and our team relationship significantly.', keyPoints: ['Show empathy and initiative', 'Use STAR method', 'Quantify the outcome', 'Highlight collaboration'], tips: ['Be specific with names and situations', 'Focus on your actions, not blaming others', 'End with positive results'], followUps: ['How did this affect team morale?', 'Would you do anything differently?'], timeLimit: 120, askedBy: ['Google', 'Meta', 'Amazon'], frequency: 92, successRate: 78, yourScore: 85, lastAttempted: '2026-08-25T10:00:00', attempts: 3, tags: ['conflict-resolution', 'teamwork', 'STAR'] },
  { id: 'b2', question: 'Describe a project where you had to learn a new technology quickly. What was your approach?', category: 'behavioral', difficulty: 'easy', status: 'reviewed', sampleAnswer: 'When our team decided to migrate from JavaScript to TypeScript, I took the lead by spending evenings going through the TypeScript handbook, building small prototypes, and creating internal documentation. Within 2 weeks I was comfortable enough to set up our migration plan and train 3 junior developers.', keyPoints: ['Demonstrate learning agility', 'Show initiative beyond requirements', 'Mention impact on others'], tips: ['Mention specific resources you used', 'Talk about knowledge sharing'], followUps: ['What was the hardest part?', 'How did you prioritize what to learn?'], timeLimit: 90, askedBy: ['Stripe', 'Vercel'], frequency: 75, successRate: 82, yourScore: 72, lastAttempted: '2026-08-20T14:00:00', attempts: 2, tags: ['learning', 'adaptability'] },
  { id: 'b3', question: 'Tell me about a time you failed. What did you learn from it?', category: 'behavioral', difficulty: 'medium', status: 'attempted', sampleAnswer: 'I once shipped a feature without proper error handling which caused a production incident affecting 5000 users for 2 hours. I took full responsibility, created a post-mortem, and introduced mandatory error boundary testing in our CI pipeline which prevented similar issues for the next 18 months.', keyPoints: ['Own the failure honestly', 'Show concrete lessons learned', 'Demonstrate systemic improvement'], tips: ['Don\'t make the failure trivial', 'Focus more on the lesson than the failure'], followUps: ['How did leadership respond?', 'What would you do differently now?'], timeLimit: 120, askedBy: ['Amazon', 'Netflix', 'Microsoft'], frequency: 88, successRate: 71, yourScore: 60, lastAttempted: '2026-08-15T11:00:00', attempts: 2, tags: ['failure', 'growth', 'accountability'] },
  { id: 'b4', question: 'Describe a situation where you had to influence without authority.', category: 'behavioral', difficulty: 'hard', status: 'unanswered', sampleAnswer: '', keyPoints: ['Show persuasion skills', 'Demonstrate stakeholder management', 'Highlight cross-functional impact'], tips: ['Describe the political landscape', 'Show how you built consensus'], followUps: ['What resistance did you face?', 'How did you measure success?'], timeLimit: 150, askedBy: ['Google', 'Meta'], frequency: 65, successRate: 68, yourScore: null, lastAttempted: null, attempts: 0, tags: ['influence', 'stakeholder-management'] },
  { id: 'b5', question: 'Tell me about your greatest professional achievement.', category: 'behavioral', difficulty: 'easy', status: 'mastered', sampleAnswer: 'I led the development of a real-time analytics dashboard that processed 100K events per second. The project involved building a custom WebSocket infrastructure and optimizing React rendering with virtualization. It reduced our client\'s decision-making time from hours to seconds and won an internal innovation award.', keyPoints: ['Choose something impactful', 'Quantify results', 'Show technical depth', 'Highlight leadership'], tips: ['Align with the role you\'re applying for', 'Tell a compelling story'], followUps: ['What was the biggest challenge?', 'How did you measure success?'], timeLimit: 120, askedBy: ['Almost every company'], frequency: 95, successRate: 85, yourScore: 90, lastAttempted: '2026-08-28T09:00:00', attempts: 4, tags: ['achievement', 'impact', 'leadership'] },

  // Technical
  { id: 't1', question: 'Explain the virtual DOM and how React\'s reconciliation algorithm works.', category: 'technical', difficulty: 'medium', status: 'reviewed', sampleAnswer: 'The virtual DOM is a lightweight JavaScript representation of the actual DOM. React creates a virtual tree of the UI, and when state changes, it creates a new virtual tree. The reconciliation algorithm (reconciler) compares the new tree with the previous one using a diffing algorithm that runs in O(n) time by making assumptions: elements of different types produce different trees, and keys help identify which items changed.', keyPoints: ['Explain virtual DOM creation', 'Describe diffing algorithm', 'Mention key-based reconciliation', 'Discuss batching and scheduling'], tips: ['Use a diagram if possible', 'Mention Fiber architecture for bonus points'], followUps: ['How does Fiber improve this?', 'What about Server Components?'], timeLimit: 180, askedBy: ['Meta', 'Netflix', 'Airbnb'], frequency: 82, successRate: 74, yourScore: 78, lastAttempted: '2026-08-22T10:00:00', attempts: 2, tags: ['react', 'internals', 'performance'] },
  { id: 't2', question: 'How would you optimize a React application that\'s experiencing performance issues?', category: 'technical', difficulty: 'hard', status: 'attempted', sampleAnswer: 'First, I\'d profile using React DevTools Profiler and Chrome Performance tab to identify bottlenecks. Common fixes: (1) Memoize expensive computations with useMemo, (2) Prevent unnecessary re-renders with React.memo and useCallback, (3) Implement virtual scrolling for large lists, (4) Code-split with React.lazy and Suspense, (5) Move state closer to where it\'s used, (6) Use Web Workers for CPU-intensive tasks, (7) Optimize images and assets.', keyPoints: ['Start with measurement', 'Address re-render issues', 'Bundle optimization', 'List virtualization'], tips: ['Always mention profiling first', 'Give specific examples'], followUps: ['What tools do you use for profiling?', 'When would you NOT optimize?'], timeLimit: 180, askedBy: ['Google', 'Meta', 'Stripe'], frequency: 78, successRate: 70, yourScore: 65, lastAttempted: '2026-08-18T14:00:00', attempts: 2, tags: ['performance', 'optimization', 'react'] },
  { id: 't3', question: 'Explain the difference between REST and GraphQL. When would you choose one over the other?', category: 'technical', difficulty: 'easy', status: 'mastered', sampleAnswer: 'REST uses multiple endpoints with fixed data shapes, while GraphQL uses a single endpoint with a flexible query language. Choose REST for simple CRUD APIs, caching needs, and when your data fits resource-based modeling. Choose GraphQL when you need flexible queries, have many related resources, want to avoid over/under-fetching, or have multiple clients with different data needs.', keyPoints: ['Compare data fetching patterns', 'Discuss over/under-fetching', 'Mention caching strategies', 'Talk about type safety'], tips: ['Give real-world examples', 'Mention tooling ecosystem'], followUps: ['What about N+1 problems in GraphQL?', 'How does REST caching work?'], timeLimit: 150, askedBy: ['Shopify', 'GitHub', 'Twitter'], frequency: 72, successRate: 85, yourScore: 88, lastAttempted: '2026-08-27T11:00:00', attempts: 3, tags: ['api', 'architecture', 'comparison'] },

  // System Design
  { id: 'sd1', question: 'Design a URL shortener like bit.ly. Discuss the architecture, database design, and scaling strategy.', category: 'system-design', difficulty: 'hard', status: 'attempted', sampleAnswer: 'Core components: (1) API Gateway for rate limiting, (2) Shortening service using base62 encoding of auto-increment IDs or MD5 hash, (3) Redis cache for hot URLs, (4) PostgreSQL for persistence with (short_code, original_url, created_at, click_count), (5) Analytics pipeline for click tracking. Scale: use consistent hashing for distributed caches, read replicas for DB, CDN for static assets, and Kafka for click event streaming.', keyPoints: ['URL encoding strategy', 'Database schema', 'Caching layer', 'Analytics pipeline', 'Scaling horizontally'], tips: ['Start with requirements and estimates', 'Draw the architecture', 'Discuss tradeoffs'], followUps: ['How do you handle custom slugs?', 'What about link expiration?'], timeLimit: 600, askedBy: ['Google', 'Amazon', 'Microsoft'], frequency: 85, successRate: 62, yourScore: 55, lastAttempted: '2026-08-10T10:00:00', attempts: 1, tags: ['url-shortener', 'scalability', 'distributed'] },
  { id: 'sd2', question: 'Design a real-time chat application like WhatsApp. How would you handle message delivery and offline support?', category: 'system-design', difficulty: 'expert', status: 'unanswered', sampleAnswer: '', keyPoints: ['WebSocket connections', 'Message queue ordering', 'Offline message storage', 'End-to-end encryption', 'Push notifications'], tips: ['Discuss message guarantees', 'Address scalability'], followUps: ['How do you handle group chats?', 'What about file sharing?'], timeLimit: 600, askedBy: ['Meta', 'Google', 'Uber'], frequency: 70, successRate: 55, yourScore: null, lastAttempted: null, attempts: 0, tags: ['chat', 'real-time', 'websocket'] },

  // Coding
  { id: 'c1', question: 'Implement a debounce function in TypeScript. Explain the edge cases.', category: 'coding', difficulty: 'easy', status: 'mastered', sampleAnswer: 'function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {\n  let timeoutId: ReturnType<typeof setTimeout>;\n  return (...args: Parameters<T>) => {\n    clearTimeout(timeoutId);\n    timeoutId = setTimeout(() => fn(...args), delay);\n  };\n}\nEdge cases: immediate invocation, cancel method, this context preservation, maxWait option.', keyPoints: ['Correct TypeScript types', 'clearTimeout handling', 'Return type consistency', 'Edge cases discussed'], tips: ['Start with a simple version', 'Add features incrementally'], followUps: ['How would you add a cancel method?', 'What about trailing vs leading calls?'], timeLimit: 300, askedBy: ['Google', 'Stripe', 'Vercel'], frequency: 80, successRate: 88, yourScore: 92, lastAttempted: '2026-08-26T15:00:00', attempts: 3, tags: ['debounce', 'typescript', 'utility'] },
  { id: 'c2', question: 'Design a custom hook `useLocalStorage` that syncs state with localStorage.', category: 'coding', difficulty: 'medium', status: 'reviewed', sampleAnswer: 'function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {\n  const [storedValue, setStoredValue] = useState<T>(() => {\n    try {\n      const item = window.localStorage.getItem(key);\n      return item ? JSON.parse(item) : initialValue;\n    } catch { return initialValue; }\n  });\n  const setValue = useCallback((value: T | ((val: T) => T)) => {\n    setStoredValue(prev => {\n      const valueToStore = value instanceof Function ? value(prev) : value;\n      window.localStorage.setItem(key, JSON.stringify(valueToStore));\n      return valueToStore;\n    });\n  }, [key]);\n  return [storedValue, setValue];\n}', keyPoints: ['Lazy initialization', 'Error handling', 'Functional updates', 'Serialization'], tips: ['Handle SSR gracefully', 'Discuss storage limits'], followUps: ['How would you handle cross-tab sync?', 'What about security?'], timeLimit: 360, askedBy: ['Netflix', 'Airbnb'], frequency: 68, successRate: 75, yourScore: 70, lastAttempted: '2026-08-19T12:00:00', attempts: 2, tags: ['hooks', 'localstorage', 'react'] },

  // Leadership
  { id: 'l1', question: 'How do you handle technical debt? Describe your approach to balancing it with feature work.', category: 'leadership', difficulty: 'medium', status: 'attempted', sampleAnswer: 'I treat technical debt like financial debt — it needs a payment plan. I categorize debt into (1) critical (affecting reliability), (2) high (slowing development), (3) medium (code quality), (4) low (nice-to-have). I allocate 20% of each sprint to debt reduction, create debt tickets with business impact context, and use metrics (build times, incident rates, developer velocity) to justify prioritization to stakeholders.', keyPoints: ['Framework for prioritization', 'Business impact communication', 'Metrics-driven approach', 'Sustainable pace'], tips: ['Make it relatable to non-technical stakeholders', 'Use concrete metrics'], followUps: ['How do you get buy-in from product?', 'What metrics do you track?'], timeLimit: 150, askedBy: ['Google', 'Amazon', 'Stripe'], frequency: 72, successRate: 73, yourScore: 68, lastAttempted: '2026-08-21T09:00:00', attempts: 2, tags: ['tech-debt', 'prioritization', 'engineering-culture'] },

  // Culture Fit
  { id: 'cf1', question: 'Why do you want to work at our company? What about our mission resonates with you?', category: 'culture-fit', difficulty: 'easy', status: 'reviewed', sampleAnswer: 'Your commitment to making developer tools accessible and joyful aligns perfectly with my passion for developer experience. I\'ve been following your open-source contributions and the way you build community. The engineering blog post about your migration to micro-frontends was particularly inspiring. I want to contribute to a team that values quality and innovation equally.', keyPoints: ['Research the company specifically', 'Connect personal values', 'Show genuine enthusiasm', 'Mention specific initiatives'], tips: ['Be authentic, not generic', 'Reference specific projects or values'], followUps: ['What would you change about our product?', 'How do you define developer experience?'], timeLimit: 90, askedBy: ['Most companies'], frequency: 90, successRate: 80, yourScore: 75, lastAttempted: '2026-08-24T10:00:00', attempts: 2, tags: ['motivation', 'company-research', 'culture'] },
  { id: 'cf2', question: 'Describe your ideal work environment and team dynamics.', category: 'culture-fit', difficulty: 'easy', status: 'mastered', sampleAnswer: 'I thrive in environments where there\'s psychological safety to experiment and fail, paired with high ownership expectations. I love teams that do thorough code reviews not just for correctness but for knowledge sharing, and that balance deep focus time with collaborative sessions. Async communication with clear documentation is important to me, along with regular retrospectives that actually lead to process improvements.', keyPoints: ['Show self-awareness', 'Align with company values', 'Be specific about preferences'], tips: ['Don\'t describe an impossible utopia', 'Be honest about tradeoffs'], followUps: ['How do you handle disagreements?', 'What role do you usually take in teams?'], timeLimit: 90, askedBy: ['Meta', 'Stripe'], frequency: 65, successRate: 82, yourScore: 82, lastAttempted: '2026-08-23T11:00:00', attempts: 1, tags: ['culture', 'teamwork', 'self-awareness'] },
  { id: 'cf3', question: 'How do you handle ambiguity in requirements?', category: 'culture-fit', difficulty: 'medium', status: 'attempted', sampleAnswer: 'When requirements are ambiguous, I start by identifying what we know vs what we assume. I create a quick RFC or spike to validate assumptions, break work into small deliverable chunks to get feedback early, and use prototype-driven development to align understanding. I also document decisions and their rationale so the team has context when revisiting.', keyPoints: ['Structured approach to ambiguity', 'Proactive communication', 'Iterative delivery'], tips: ['Give a specific example', 'Show comfort with uncertainty'], followUps: ['How do you prioritize when everything is unclear?', 'When do you stop exploring and start building?'], timeLimit: 120, askedBy: ['Google', 'Amazon'], frequency: 70, successRate: 72, yourScore: 62, lastAttempted: '2026-08-16T14:00:00', attempts: 1, tags: ['ambiguity', 'problem-solving', 'communication'] },
]

const SAMPLE_MOCK_INTERVIEWS: MockInterview[] = [
  { id: 'm1', title: 'Google Frontend Phone Screen', role: 'Senior Frontend Engineer', company: 'Google', stage: 'phone', duration: 45, questions: SAMPLE_QUESTIONS.filter(q => ['b1', 't1', 'c1'].includes(q.id)), difficulty: 'medium', description: 'Typical Google phone screen with behavioral + technical mix' },
  { id: 'm2', title: 'Meta Onsite Loop', role: 'Senior Software Engineer', company: 'Meta', stage: 'onsite', duration: 180, questions: SAMPLE_QUESTIONS.filter(q => ['b2', 't2', 'sd1', 'c2'].includes(q.id)), difficulty: 'hard', description: 'Full onsite simulation with system design and coding' },
  { id: 'm3', title: 'Amazon Leadership Principles', role: 'Software Development Engineer', company: 'Amazon', stage: 'final', duration: 60, questions: SAMPLE_QUESTIONS.filter(q => ['b3', 'b4', 'l1', 'cf3'].includes(q.id)), difficulty: 'hard', description: 'Amazon-style LP behavioral deep dive' },
  { id: 'm4', title: 'Startup Culture Fit Chat', role: 'Frontend Developer', company: 'Stripe', stage: 'screening', duration: 30, questions: SAMPLE_QUESTIONS.filter(q => ['b5', 'cf1', 'cf2'].includes(q.id)), difficulty: 'easy', description: 'Casual culture and motivation conversation' },
]

const SAMPLE_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: 'Alex Chen', avatar: '👨‍💻', totalScore: 2850, questionsAnswered: 47, streak: 12, badge: '🏆' },
  { rank: 2, name: 'Sarah Kim', avatar: '👩‍💻', totalScore: 2720, questionsAnswered: 44, streak: 8, badge: '🥈' },
  { rank: 3, name: 'Raj Patel', avatar: '🧑‍💻', totalScore: 2680, questionsAnswered: 42, streak: 10, badge: '🥉' },
  { rank: 4, name: 'You', avatar: '🙋', totalScore: 1840, questionsAnswered: 28, streak: 5, badge: '⭐' },
  { rank: 5, name: 'Maria Garcia', avatar: '👩‍🔬', totalScore: 1750, questionsAnswered: 26, streak: 3, badge: '🎯' },
  { rank: 6, name: 'James Liu', avatar: '👨‍🔬', totalScore: 1620, questionsAnswered: 24, streak: 2, badge: '📈' },
]

const SAMPLE_STUDY_PLANS: StudyPlan[] = [
  { id: 'sp1', title: 'FAANG Interview Prep', days: 30, questionsPerDay: 5, focus: ['behavioral', 'technical', 'system-design'], estimatedImprovement: 25, progress: 42 },
  { id: 'sp2', title: 'Behavioral Mastery Sprint', days: 14, questionsPerDay: 3, focus: ['behavioral', 'leadership', 'culture-fit'], estimatedImprovement: 15, progress: 65 },
  { id: 'sp3', title: 'System Design Deep Dive', days: 21, questionsPerDay: 2, focus: ['system-design'], estimatedImprovement: 30, progress: 20 },
]

// ─── Utility Functions ──────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getScoreColor(score: number): string {
  if (score >= 85) return '#10b981'
  if (score >= 70) return '#3b82f6'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function InterviewQuestionBank() {
  const [activeTab, setActiveTab] = useState<'browse' | 'practice' | 'mock' | 'leaderboard' | 'study-plan'>('browse')
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | 'all'>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortBy>('difficulty')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [activeMock, setActiveMock] = useState<MockInterview | null>(null)
  const [mockIndex, setMockIndex] = useState(0)
  const [mockAnswers, setMockAnswers] = useState<string[]>([])
  const [mockScore, setMockScore] = useState(0)
  const [mockComplete, setMockComplete] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const questions = useMemo(() => SAMPLE_QUESTIONS, [])

  const categoryStats = useMemo((): CategoryStats[] => {
    const cats = Object.keys(CATEGORY_MAP) as QuestionCategory[]
    return cats.map(cat => {
      const qs = questions.filter(q => q.category === cat)
      return {
        category: cat,
        label: CATEGORY_MAP[cat].label,
        icon: CATEGORY_MAP[cat].icon,
        color: CATEGORY_MAP[cat].color,
        total: qs.length,
        mastered: qs.filter(q => q.status === 'mastered').length,
        attempted: qs.filter(q => q.status !== 'unanswered').length,
        avgScore: qs.filter(q => q.yourScore !== null).length > 0
          ? Math.round(qs.filter(q => q.yourScore !== null).reduce((s, q) => s + (q.yourScore || 0), 0) / qs.filter(q => q.yourScore !== null).length)
          : 0,
      }
    })
  }, [questions])

  const overallScore = useMemo(() => {
    const scored = questions.filter(q => q.yourScore !== null)
    return scored.length > 0 ? Math.round(scored.reduce((s, q) => s + (q.yourScore || 0), 0) / scored.length) : 0
  }, [questions])

  const filteredQuestions = useMemo(() => {
    let filtered = questions
    if (selectedCategory !== 'all') filtered = filtered.filter(q => q.category === selectedCategory)
    if (selectedDifficulty !== 'all') filtered = filtered.filter(q => q.difficulty === selectedDifficulty)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(fq => fq.question.toLowerCase().includes(q) || fq.tags.some(t => t.includes(q)))
    }
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'difficulty': return DIFFICULTY_MAP[a.difficulty].points - DIFFICULTY_MAP[b.difficulty].points
        case 'category': return a.category.localeCompare(b.category)
        case 'status': return Object.keys(STATUS_MAP).indexOf(b.status) - Object.keys(STATUS_MAP).indexOf(a.status)
        case 'recent': return (b.lastAttempted || '').localeCompare(a.lastAttempted || '')
        case 'popular': return b.frequency - a.frequency
        default: return 0
      }
    })
  }, [questions, selectedCategory, selectedDifficulty, searchQuery, sortBy])

  // Timer
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isTimerRunning])

  const startMock = useCallback((mock: MockInterview) => {
    setActiveMock(mock)
    setMockIndex(0)
    setMockAnswers(new Array(mock.questions.length).fill(''))
    setMockScore(0)
    setMockComplete(false)
    setTimerSeconds(0)
    setIsTimerRunning(true)
    setActiveTab('mock')
  }, [])

  const submitMockAnswer = useCallback(() => {
    if (!activeMock) return
    const currentQ = activeMock.questions[mockIndex]
    const score = Math.min(DIFFICULTY_MAP[currentQ.difficulty].points, Math.round(Math.random() * 10 + DIFFICULTY_MAP[currentQ.difficulty].points * 0.5))
    setMockScore(prev => prev + score)

    if (mockIndex < activeMock.questions.length - 1) {
      setMockIndex(prev => prev + 1)
    } else {
      setIsTimerRunning(false)
      setMockComplete(true)
    }
  }, [activeMock, mockIndex])

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '10px',
    border: active ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.06)',
    background: active ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
    color: active ? '#3b82f6' : '#94a3b8',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s',
  })

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '20px',
    backdropFilter: 'blur(12px)',
  }

  const tabs = [
    { id: 'browse' as const, label: 'Browse', icon: '📋' },
    { id: 'practice' as const, label: 'Practice', icon: '🎯' },
    { id: 'mock' as const, label: 'Mock Interview', icon: '🎤' },
    { id: 'leaderboard' as const, label: 'Leaderboard', icon: '🏆' },
    { id: 'study-plan' as const, label: 'Study Plan', icon: '📚' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🎤 Interview Question Bank
          </h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>Master interviews with 15+ curated questions, mock interviews, and tracking</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '800', color: getScoreColor(overallScore) }}>{overallScore}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Avg Score</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#3b82f6' }}>{questions.filter(q => q.yourScore !== null).length}/{questions.length}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Answered</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>{questions.filter(q => q.status === 'mastered').length}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Mastered</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button key={tab.id} style={{ ...btnStyle(activeTab === tab.id), padding: '10px 20px' }} onClick={() => setActiveTab(tab.id)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ BROWSE TAB ═══ */}
      {activeTab === 'browse' && (
        <div>
          {/* Category Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {categoryStats.map(cat => (
              <div key={cat.category} style={{ ...cardStyle, textAlign: 'center', cursor: 'pointer', border: selectedCategory === cat.category ? `1px solid ${cat.color}40` : '1px solid rgba(255,255,255,0.06)' }} onClick={() => setSelectedCategory(selectedCategory === cat.category ? 'all' : cat.category)}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{cat.icon}</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: cat.color }}>{cat.mastered}/{cat.total}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{cat.label}</div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(cat.mastered / cat.total) * 100}%`, background: cat.color, borderRadius: '2px' }} />
                </div>
                {cat.avgScore > 0 && <div style={{ fontSize: '10px', color: getScoreColor(cat.avgScore), marginTop: '4px' }}>Avg: {cat.avgScore}</div>}
              </div>
            ))}
          </div>

          {/* Search & Filter */}
          <div style={{ ...cardStyle, marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="text" placeholder="🔍 Search questions..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '13px', outline: 'none' }} />
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['all', 'easy', 'medium', 'hard', 'expert'] as const).map(d => (
                <button key={d} style={btnStyle(selectedDifficulty === d)} onClick={() => setSelectedDifficulty(d)}>
                  {d === 'all' ? 'All' : DIFFICULTY_MAP[d].label}
                </button>
              ))}
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '12px' }}>
              <option value="difficulty">Sort: Difficulty</option>
              <option value="category">Sort: Category</option>
              <option value="status">Sort: Status</option>
              <option value="recent">Sort: Recent</option>
              <option value="popular">Sort: Popular</option>
            </select>
          </div>

          {/* Questions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredQuestions.map(q => {
              const cat = CATEGORY_MAP[q.category]
              const diff = DIFFICULTY_MAP[q.difficulty]
              const status = STATUS_MAP[q.status]
              const isExpanded = expandedQuestion === q.id

              return (
                <div key={q.id} style={{ ...cardStyle, cursor: 'pointer', border: isExpanded ? `1px solid ${cat.color}30` : '1px solid rgba(255,255,255,0.06)' }}
                  onClick={() => { setExpandedQuestion(isExpanded ? q.id : null); setShowAnswer(false); setUserAnswer(''); }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '6px', background: `${cat.color}20`, color: cat.color, fontSize: '10px', fontWeight: '700' }}>{cat.icon} {cat.label}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '6px', background: `${diff.color}20`, color: diff.color, fontSize: '10px', fontWeight: '700' }}>{diff.label} ({diff.points}pts)</span>
                        <span style={{ padding: '2px 8px', borderRadius: '6px', background: `${status.color}20`, color: status.color, fontSize: '10px', fontWeight: '700' }}>{status.icon} {status.label}</span>
                        {q.yourScore !== null && (
                          <span style={{ padding: '2px 8px', borderRadius: '6px', background: `${getScoreColor(q.yourScore)}20`, color: getScoreColor(q.yourScore), fontSize: '10px', fontWeight: '700' }}>
                            Score: {q.yourScore}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', lineHeight: '1.4' }}>{q.question}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#94a3b8', marginLeft: '16px', flexShrink: 0 }}>
                      <span>🔥 {q.frequency}%</span>
                      <span>👥 {q.askedBy.length}</span>
                      <span>⏱️ {formatTime(q.timeLimit)}</span>
                    </div>
                  </div>

                  {/* Meta Row */}
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#6b7280', flexWrap: 'wrap' }}>
                    <span>Companies: {q.askedBy.join(', ')}</span>
                    {q.lastAttempted && <span>Last: {new Date(q.lastAttempted).toLocaleDateString()}</span>}
                    <span>Attempts: {q.attempts}</span>
                  </div>

                  {/* Tags */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {q.tags.map(tag => (
                      <span key={tag} style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', fontSize: '10px', color: '#6b7280' }}>#{tag}</span>
                    ))}
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '16px', paddingTop: '16px' }} onClick={e => e.stopPropagation()}>
                      {/* Practice Area */}
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>✍️ Your Answer:</label>
                        <textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)}
                          placeholder="Type your answer here... Practice answering out loud for best results."
                          style={{ width: '100%', minHeight: '120px', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#e2e8f0', fontSize: '13px', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button style={{ padding: '8px 16px', borderRadius: '8px', background: '#3b82f6', color: '#fff', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                            onClick={() => { setShowAnswer(true) }}>
                            💡 Show Sample Answer
                          </button>
                          <button style={{ padding: '8px 16px', borderRadius: '8px', background: '#10b981', color: '#fff', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                            onClick={() => alert('Answer marked for review!')}>
                            ✅ Mark Reviewed
                          </button>
                        </div>
                      </div>

                      {/* Sample Answer */}
                      {showAnswer && (
                        <div style={{ marginBottom: '16px' }}>
                          <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: '#10b981' }}>💡 Sample Answer:</h4>
                          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', fontSize: '13px', lineHeight: '1.6', color: '#e2e8f0' }}>
                            {q.sampleAnswer || 'No sample answer available yet.'}
                          </div>
                        </div>
                      )}

                      {/* Key Points */}
                      <div style={{ marginBottom: '12px' }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: '#f59e0b' }}>🎯 Key Points to Hit:</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {q.keyPoints.map((kp, i) => (
                            <div key={i} style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#f59e0b' }}>•</span> {kp}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tips */}
                      <div style={{ marginBottom: '12px' }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: '#8b5cf6' }}>💡 Tips:</h4>
                        {q.tips.map((tip, i) => (
                          <div key={i} style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>→ {tip}</div>
                        ))}
                      </div>

                      {/* Follow-ups */}
                      <div>
                        <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: '#ec4899' }}>❓ Possible Follow-ups:</h4>
                        {q.followUps.map((fu, i) => (
                          <div key={i} style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>• {fu}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ PRACTICE TAB ═══ */}
      {activeTab === 'practice' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ ...cardStyle, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>🎯 Quick Practice</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>Timer: <strong style={{ color: isTimerRunning ? '#f59e0b' : '#94a3b8' }}>{formatTime(timerSeconds)}</strong></span>
              <button style={{ padding: '6px 14px', borderRadius: '8px', background: isTimerRunning ? '#ef4444' : '#10b981', color: '#fff', border: 'none', fontSize: '11px', cursor: 'pointer' }}
                onClick={() => setIsTimerRunning(!isTimerRunning)}>
                {isTimerRunning ? '⏸ Pause' : '▶️ Start'}
              </button>
            </div>
          </div>

          <div style={cardStyle}>
            {(() => {
              const unanswered = questions.filter(q => q.status === 'unanswered')
              const randomQ = unanswered[Math.floor(Math.random() * unanswered.length)] || questions[0]
              const cat = CATEGORY_MAP[randomQ.category]
              const diff = DIFFICULTY_MAP[randomQ.difficulty]

              return (
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', background: `${cat.color}20`, color: cat.color, fontSize: '10px', fontWeight: '700' }}>{cat.icon} {cat.label}</span>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', background: `${diff.color}20`, color: diff.color, fontSize: '10px', fontWeight: '700' }}>{diff.label}</span>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '10px', fontWeight: '700' }}>⏱ {formatTime(randomQ.timeLimit)}</span>
                  </div>
                  <h3 style={{ margin: '0 0 16px', fontSize: '18px', lineHeight: '1.4' }}>{randomQ.question}</h3>
                  <textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)} placeholder="Type your answer..."
                    style={{ width: '100%', minHeight: '150px', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#e2e8f0', fontSize: '13px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', marginBottom: '12px' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ padding: '10px 20px', borderRadius: '10px', background: '#3b82f6', color: '#fff', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }} onClick={() => setShowAnswer(true)}>Show Answer</button>
                    <button style={{ padding: '10px 20px', borderRadius: '10px', background: '#10b981', color: '#fff', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }} onClick={() => alert('✅ Marked as mastered!')}>⭐ Mark Mastered</button>
                    <button style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', cursor: 'pointer' }} onClick={() => setShowAnswer(false)}>Hide Answer</button>
                  </div>
                  {showAnswer && (
                    <div style={{ marginTop: '16px', padding: '12px', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#10b981', marginBottom: '8px' }}>💡 Sample Answer:</div>
                      <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#e2e8f0' }}>{randomQ.sampleAnswer || 'No sample answer yet.'}</div>
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600', marginBottom: '4px' }}>Key Points:</div>
                        {randomQ.keyPoints.map((kp, i) => (
                          <div key={i} style={{ fontSize: '11px', color: '#94a3b8' }}>• {kp}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* ═══ MOCK INTERVIEW TAB ═══ */}
      {activeTab === 'mock' && (
        <div>
          {!activeMock ? (
            <>
              <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>🎤 Mock Interviews</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {SAMPLE_MOCK_INTERVIEWS.map(mock => {
                  const stage = STAGE_MAP[mock.stage]
                  return (
                    <div key={mock.id} style={cardStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '20px' }}>{stage.icon}</span>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '14px' }}>{mock.title}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{mock.role} • {mock.company}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>{mock.description}</div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#6b7280', marginBottom: '12px' }}>
                        <span>⏱️ {mock.duration} min</span>
                        <span>📝 {mock.questions.length} questions</span>
                        <span>📊 {DIFFICULTY_MAP[mock.difficulty].label}</span>
                      </div>
                      <button style={{ width: '100%', padding: '10px', borderRadius: '10px', background: '#3b82f6', color: '#fff', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                        onClick={() => startMock(mock)}>
                        🚀 Start Mock Interview
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          ) : mockComplete ? (
            <div style={{ ...cardStyle, maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
              <h2 style={{ margin: '0 0 8px' }}>Mock Interview Complete!</h2>
              <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px' }}>{activeMock.title}</div>
              <div style={{ fontSize: '48px', fontWeight: '800', color: getScoreColor(mockScore) }}>{mockScore}</div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>out of {activeMock.questions.reduce((s, q) => s + DIFFICULTY_MAP[q.difficulty].points, 0)} points</div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
                <div style={{ height: '100%', width: `${(mockScore / activeMock.questions.reduce((s, q) => s + DIFFICULTY_MAP[q.difficulty].points, 0)) * 100}%`, background: getScoreColor(mockScore), borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button style={{ padding: '10px 20px', borderRadius: '10px', background: '#3b82f6', color: '#fff', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }} onClick={() => startMock(activeMock)}>🔄 Retry</button>
                <button style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', cursor: 'pointer' }} onClick={() => { setActiveMock(null); setMockComplete(false); }}>← Back to List</button>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              {/* Progress */}
              <div style={{ ...cardStyle, marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>{activeMock.title}</span>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                    Question {mockIndex + 1}/{activeMock.questions.length} • Timer: {formatTime(timerSeconds)} • Score: {mockScore}
                  </span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${((mockIndex + 1) / activeMock.questions.length) * 100}%`, background: '#3b82f6', borderRadius: '2px', transition: 'width 0.3s' }} />
                </div>
              </div>

              {/* Current Question */}
              {(() => {
                const q = activeMock.questions[mockIndex]
                const cat = CATEGORY_MAP[q.category]
                const diff = DIFFICULTY_MAP[q.difficulty]
                return (
                  <div style={cardStyle}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: `${cat.color}20`, color: cat.color, fontSize: '10px', fontWeight: '700' }}>{cat.icon} {cat.label}</span>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: `${diff.color}20`, color: diff.color, fontSize: '10px', fontWeight: '700' }}>{diff.label} • {diff.points}pts</span>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '10px', fontWeight: '700' }}>⏱ {formatTime(q.timeLimit)}</span>
                    </div>
                    <h3 style={{ margin: '0 0 16px', fontSize: '18px', lineHeight: '1.4' }}>{q.question}</h3>
                    <textarea value={mockAnswers[mockIndex]} onChange={e => { const copy = [...mockAnswers]; copy[mockIndex] = e.target.value; setMockAnswers(copy) }}
                      placeholder="Type your answer here..."
                      style={{ width: '100%', minHeight: '150px', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#e2e8f0', fontSize: '13px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', marginBottom: '12px' }} />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button style={{ padding: '10px 20px', borderRadius: '10px', background: '#3b82f6', color: '#fff', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }} onClick={submitMockAnswer}>
                        {mockIndex < activeMock.questions.length - 1 ? 'Next Question →' : '🏁 Finish Interview'}
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* ═══ LEADERBOARD TAB ═══ */}
      {activeTab === 'leaderboard' && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
            {SAMPLE_LEADERBOARD.slice(0, 3).map(entry => (
              <div key={entry.rank} style={{ ...cardStyle, textAlign: 'center', border: entry.name === 'You' ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '32px', marginBottom: '4px' }}>{entry.badge}</div>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{entry.avatar}</div>
                <div style={{ fontWeight: '700', fontSize: '14px' }}>{entry.name}</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#f59e0b', margin: '4px 0' }}>{entry.totalScore}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{entry.questionsAnswered} questions • 🔥 {entry.streak} streak</div>
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            {SAMPLE_LEADERBOARD.slice(3).map(entry => (
              <div key={entry.rank} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', background: entry.name === 'You' ? 'rgba(59,130,246,0.08)' : 'transparent', marginBottom: '8px' }}>
                <span style={{ width: '24px', textAlign: 'center', fontWeight: '700', color: '#94a3b8' }}>#{entry.rank}</span>
                <span style={{ fontSize: '20px' }}>{entry.avatar}</span>
                <span style={{ flex: 1, fontWeight: '600', fontSize: '14px' }}>{entry.name}</span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#f59e0b' }}>{entry.totalScore}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{entry.questionsAnswered}q • 🔥{entry.streak}</span>
                <span>{entry.badge}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ STUDY PLAN TAB ═══ */}
      {activeTab === 'study-plan' && (
        <div>
          <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>📚 Recommended Study Plans</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {SAMPLE_STUDY_PLANS.map(plan => (
              <div key={plan.id} style={cardStyle}>
                <h4 style={{ margin: '0 0 8px', fontSize: '16px' }}>{plan.title}</h4>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                  <span>📅 {plan.days} days</span>
                  <span>📝 {plan.questionsPerDay}/day</span>
                  <span>📈 +{plan.estimatedImprovement}pts</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {plan.focus.map(f => (
                    <span key={f} style={{ padding: '2px 8px', borderRadius: '6px', background: `${CATEGORY_MAP[f].color}20`, color: CATEGORY_MAP[f].color, fontSize: '10px', fontWeight: '700' }}>
                      {CATEGORY_MAP[f].icon} {CATEGORY_MAP[f].label}
                    </span>
                  ))}
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                    <span>Progress</span>
                    <span>{plan.progress}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${plan.progress}%`, background: '#3b82f6', borderRadius: '3px' }} />
                  </div>
                </div>
                <button style={{ width: '100%', padding: '10px', borderRadius: '10px', background: '#3b82f6', color: '#fff', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  {plan.progress > 0 ? '▶️ Continue Plan' : '🚀 Start Plan'}
                </button>
              </div>
            ))}
          </div>

          {/* Insights */}
          <div style={{ ...cardStyle, marginTop: '20px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>💡 Personalized Insights</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { icon: '🎯', title: 'Weakest Area', desc: 'System Design (avg 55%) — prioritize with SD deep dive plan', color: '#ef4444' },
                { icon: '💪', title: 'Strongest Area', desc: 'Behavioral (avg 78%) — maintain with periodic review', color: '#10b981' },
                { icon: '⏰', title: 'Time Investment', desc: '28 questions answered, ~14 hours total practice time', color: '#3b82f6' },
              ].map((insight, i) => (
                <div key={i} style={{ padding: '16px', borderRadius: '12px', background: `${insight.color}08`, border: `1px solid ${insight.color}20` }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{insight.icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: insight.color, marginBottom: '4px' }}>{insight.title}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>{insight.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InterviewQuestionBank
