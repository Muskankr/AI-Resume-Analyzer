import { useState, useMemo, useCallback } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface InterviewQuestion {
  id: string;
  category: 'technical' | 'behavioral' | 'situational' | 'culture-fit' | 'leadership';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  keyPoints: string[];
  sampleAnswer: string;
  tips: string[];
  skillTags: string[];
  companies: string[];
  frequency: number; // how often asked (1-10)
  timeEstimate: string;
}

interface PracticeSession {
  id: string;
  date: string;
  questionsAnswered: number;
  avgScore: number;
  strongest: string;
  weakest: string;
  duration: string;
  notes: string;
}

interface Company {
  name: string;
  culture: string;
  interviewStyle: string;
 常见Questions: string[];
  tips: string[];
  avgDifficulty: 'easy' | 'medium' | 'hard';
  responseRate: string;
  avgInterviewRounds: number;
}

interface StarExample {
  situation: string;
  task: string;
  action: string;
  result: string;
}

interface PrepProgress {
  totalQuestions: number;
  practiced: number;
  mastered: number;
  weakAreas: string[];
  strongAreas: string[];
  studyStreak: number;
  totalPracticeHours: number;
}

/* ─── Mock Data ─────────────────────────────────────────────────────── */
const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'q1', category: 'technical', difficulty: 'hard',
    question: 'Explain the React reconciliation algorithm and how Virtual DOM diffing works. When would you use React.memo vs useMemo?',
    keyPoints: ['Virtual DOM tree comparison', 'Fiber architecture', 'Key prop significance', 'Re-render triggers', 'Memoization strategies'],
    sampleAnswer: 'React uses a reconciliation algorithm that compares the new Virtual DOM tree with the previous one. When state changes, React creates a new Virtual DOM tree and diffs it against the old one using a heuristic O(n) algorithm. The Fiber architecture enables incremental rendering, allowing React to pause and resume work. React.memo prevents re-renders when props haven\'t changed (shallow comparison), while useMemo caches expensive computations. I use React.memo for child components that receive stable props, and useMemo for costly calculations inside renders.',
    tips: ['Mention Fiber architecture for depth', 'Give specific performance scenarios', 'Compare class vs hooks approaches', 'Discuss concurrent features'],
    skillTags: ['React', 'JavaScript', 'Performance'],
    companies: ['Meta', 'Netflix', 'Airbnb'],
    frequency: 9, timeEstimate: '5-7 min',
  },
  {
    id: 'q2', category: 'technical', difficulty: 'medium',
    question: 'How would you design a real-time notification system? Walk through the architecture from frontend to backend.',
    keyPoints: ['WebSocket vs SSE vs polling', 'Message queuing', 'Push notifications', 'Offline handling', 'Scaling strategies'],
    sampleAnswer: 'I\'d use WebSockets for real-time bidirectional communication, with Server-Sent Events as a fallback. On the server, I\'d implement a message queue (Redis Pub/Sub or RabbitMQ) to handle high throughput. Each client subscribes to channels based on their interests. For mobile, I\'d integrate Firebase Cloud Messaging. Offline support would use service workers to cache notifications. For scaling, I\'d use sticky sessions or a Redis adapter across server instances.',
    tips: ['Start with requirements gathering', 'Mention trade-offs between approaches', 'Discuss scaling from day one', 'Include error handling strategy'],
    skillTags: ['System Design', 'WebSockets', 'Node.js'],
    companies: ['Discord', 'Slack', 'Twitter'],
    frequency: 8, timeEstimate: '8-10 min',
  },
  {
    id: 'q3', category: 'behavioral', difficulty: 'medium',
    question: 'Tell me about a time you had to work with a difficult team member. How did you handle the situation?',
    keyPoints: ['Specific situation details', 'Empathy and understanding', 'Communication strategy', 'Resolution outcome', 'Lessons learned'],
    sampleAnswer: 'In my previous role, a senior developer consistently dismissed my ideas in code reviews. Instead of escalating, I scheduled a casual coffee chat to understand their perspective. I learned they were concerned about maintaining code quality during a tight deadline. I proposed a pre-review sync where I\'d walk them through my approach before formal review. This reduced friction by 80%, and we ended up collaborating on a component library that the whole team adopted.',
    tips: ['Use the STAR method', 'Show emotional intelligence', 'Focus on actions, not blame', 'Quantify the positive outcome'],
    skillTags: ['Communication', 'Teamwork', 'Conflict Resolution'],
    companies: ['Google', 'Amazon', 'Microsoft'],
    frequency: 10, timeEstimate: '3-5 min',
  },
  {
    id: 'q4', category: 'technical', difficulty: 'easy',
    question: 'What is the difference between REST and GraphQL? When would you choose one over the other?',
    keyPoints: ['Endpoint design', 'Data fetching patterns', 'Type safety', 'Caching strategies', 'Learning curve'],
    sampleAnswer: 'REST uses multiple endpoints with fixed data structures, while GraphQL uses a single endpoint with flexible queries. I choose REST for simple CRUD APIs where caching is important, and GraphQL for complex data requirements where clients need different data shapes. REST is easier to cache with HTTP caching, while GraphQL requires client-side caching libraries like Apollo. GraphQL excels in mobile apps where bandwidth matters, as it eliminates over-fetching.',
    tips: ['Give specific project examples', 'Mention real trade-offs', 'Discuss tooling ecosystem', 'Address when neither is ideal'],
    skillTags: ['REST', 'GraphQL', 'API Design'],
    companies: ['GitHub', 'Shopify', 'Hasura'],
    frequency: 7, timeEstimate: '3-4 min',
  },
  {
    id: 'q5', category: 'situational', difficulty: 'hard',
    question: 'Your production application is experiencing a 50% increase in response times. Walk me through your debugging and resolution process.',
    keyPoints: ['Systematic approach', 'Monitoring tools', 'Root cause analysis', 'Communication', 'Prevention'],
    sampleAnswer: 'First, I\'d check monitoring dashboards (Datadog/Grafana) for CPU, memory, and database metrics. I\'d identify if the spike correlates with a recent deploy. If database-related, I\'d check slow query logs and connection pool status. If application-level, I\'d examine thread dumps and GC logs. I\'d communicate with stakeholders about ETA while investigating. Once identified, I\'d implement the fix, verify with load testing, and create a post-mortem with prevention measures like automated performance regression tests.',
    tips: ['Show structured thinking', 'Mention specific tools', 'Include communication steps', 'Discuss prevention measures'],
    skillTags: ['Debugging', 'DevOps', 'Monitoring'],
    companies: ['Amazon', 'Netflix', 'Stripe'],
    frequency: 7, timeEstimate: '6-8 min',
  },
  {
    id: 'q6', category: 'culture-fit', difficulty: 'easy',
    question: 'Why do you want to work at our company? What about our mission resonates with you?',
    keyPoints: ['Company research', 'Personal values alignment', 'Specific projects/products', 'Growth opportunities', 'Authenticity'],
    sampleAnswer: 'I\'ve been following your company\'s work in [specific area] and was impressed by [specific project/product]. Your mission to [company mission] aligns with my passion for [relevant area]. I\'m particularly excited about the engineering challenges of [specific technical challenge]. I\'m looking for a place where I can grow as an engineer while contributing to meaningful work that impacts [user base/industry].',
    tips: ['Research recent news and products', 'Connect personal story to company', 'Mention specific technical challenges', 'Be genuine, not generic'],
    skillTags: ['Communication', 'Research'],
    companies: ['All'],
    frequency: 10, timeEstimate: '2-3 min',
  },
  {
    id: 'q7', category: 'leadership', difficulty: 'hard',
    question: 'Describe a project where you had to make a critical technical decision with incomplete information. What was your approach?',
    keyPoints: ['Decision framework', 'Risk assessment', 'Stakeholder communication', 'Reversibility analysis', 'Outcome'],
    sampleAnswer: 'When building our notification system, I had to choose between WebSockets and SSE without complete performance data. I created a decision matrix weighing: implementation complexity, browser support, scaling characteristics, and reversibility. I built a proof-of-concept with both, measured key metrics, and presented findings to the team with my recommendation. We chose WebSockets for bidirectional needs, with SSE as fallback. Six months later, this architecture handled 100K concurrent connections during our product launch.',
    tips: ['Show decision-making framework', 'Include risk assessment', 'Demonstrate stakeholder management', 'Quantify the outcome'],
    skillTags: ['Leadership', 'Architecture', 'Decision Making'],
    companies: ['Meta', 'Google', 'Amazon'],
    frequency: 6, timeEstimate: '5-7 min',
  },
  {
    id: 'q8', category: 'behavioral', difficulty: 'easy',
    question: 'What is your greatest professional strength? Give an example of how you\'ve used it.',
    keyPoints: ['Self-awareness', 'Concrete example', 'Impact on team/project', 'Relevance to role', 'Continuous improvement'],
    sampleAnswer: 'My greatest strength is breaking down complex problems into manageable pieces. For example, when our team inherited a monolithic codebase with 200K lines of code, I proposed a domain-driven decomposition strategy. I identified 8 bounded contexts, created an incremental migration plan, and led the team through a 6-month refactoring that reduced deployment time from 45 minutes to 5 minutes and decreased bug reports by 60%.',
    tips: ['Choose a strength relevant to the role', 'Use specific metrics', 'Show how it benefits the team', 'Mention how you keep improving'],
    skillTags: ['Problem Solving', 'Architecture'],
    companies: ['All'],
    frequency: 8, timeEstimate: '3-4 min',
  },
  {
    id: 'q9', category: 'technical', difficulty: 'hard',
    question: 'Explain micro-frontends. What are the trade-offs compared to a monolithic frontend? How would you implement module federation?',
    keyPoints: ['Architecture patterns', 'Module federation', 'Shared dependencies', 'Independent deployment', 'Performance implications'],
    sampleAnswer: 'Micro-frontends decompose a frontend into independently deployable pieces, each owned by a team. I\'d use Webpack Module Federation for runtime integration, sharing React and common libraries. Trade-offs: independent deployment and team autonomy vs. increased complexity in shared state, routing, and styling consistency. I\'d implement it with a shell app that orchestrates micro-apps via Module Federation, shared design system for UI consistency, and a custom event bus for cross-app communication. Performance benefits include smaller bundle sizes and parallel team velocity.',
    tips: ['Acknowledge trade-offs honestly', 'Give implementation details', 'Discuss team organization impact', 'Mention real project experience'],
    skillTags: ['Architecture', 'JavaScript', 'Webpack'],
    companies: ['IKEA', 'Zalando', 'Spotify'],
    frequency: 5, timeEstimate: '7-10 min',
  },
  {
    id: 'q10', category: 'behavioral', difficulty: 'medium',
    question: 'Tell me about a time you failed. What did you learn from the experience?',
    keyPoints: ['Honest reflection', 'Root cause analysis', 'Concrete lessons', 'Changed behavior', 'Growth mindset'],
    sampleAnswer: 'I once pushed a database migration to production without proper testing that caused 30 minutes of downtime. The root cause was skipping the review process due to deadline pressure. I learned three things: never skip safety checks regardless of deadlines, always have a rollback plan, and communicate risks to stakeholders. I subsequently implemented a migration checklist and automated rollback mechanism that the team still uses today. This incident actually improved our deployment process for the entire organization.',
    tips: ['Be genuine about the failure', 'Focus on lessons, not excuses', 'Show concrete behavioral change', 'Demonstrate growth mindset'],
    skillTags: ['Accountability', 'Growth', 'DevOps'],
    companies: ['Amazon', 'Google', 'Microsoft'],
    frequency: 9, timeEstimate: '3-5 min',
  },
];

const PRACTICE_SESSIONS: PracticeSession[] = [
  { id: 's1', date: '2026-08-24', questionsAnswered: 5, avgScore: 72, strongest: 'Behavioral', weakest: 'System Design', duration: '45 min', notes: 'Need to practice more system design questions' },
  { id: 's2', date: '2026-08-22', questionsAnswered: 8, avgScore: 81, strongest: 'Technical', weakest: 'Leadership', duration: '60 min', notes: 'Improved on technical answers, work on leadership scenarios' },
  { id: 's3', date: '2026-08-20', questionsAnswered: 6, avgScore: 68, strongest: 'Culture Fit', weakest: 'Technical', duration: '50 min', notes: 'Struggled with deep technical questions' },
  { id: 's4', date: '2026-08-18', questionsAnswered: 10, avgScore: 75, strongest: 'Behavioral', weakest: 'Situational', duration: '75 min', notes: 'Great STAR method practice, need more situational examples' },
  { id: 's5', date: '2026-08-15', questionsAnswered: 4, avgScore: 65, strongest: 'Culture Fit', weakest: 'Technical', duration: '35 min', notes: 'Quick session, focused on company research' },
];

const TARGET_COMPANIES: Company[] = [
  {
    name: 'Google', culture: 'Innovation-focused, data-driven, collaborative',
    interviewStyle: 'Multiple rounds: phone screen → technical → system design → behavioral → Googleyness',
    常见Questions: ['Explain a complex technical concept', 'How would you design X at Google scale?', 'Tell me about a time you influenced without authority'],
    tips: ['Emphasize impact and scale', 'Use structured problem-solving', 'Show intellectual curiosity', 'Prepare for coding in Google Docs'],
    avgDifficulty: 'hard', responseRate: '2-4 weeks', avgInterviewRounds: 5,
  },
  {
    name: 'Meta', culture: 'Move fast, be bold, focus on long-term impact',
    interviewStyle: 'Phone screen → 2 coding rounds → system design → behavioral',
    常见Questions: ['Design a news feed system', 'Implement a rate limiter', 'How do you handle disagreements on technical direction?'],
    tips: ['Optimize for speed of execution', 'Discuss user impact', 'Show comfort with ambiguity', 'Practice medium-hard LeetCode'],
    avgDifficulty: 'hard', responseRate: '1-3 weeks', avgInterviewRounds: 4,
  },
  {
    name: 'Stripe', culture: 'User-focused, rigorous thinking, measured impact',
    interviewStyle: 'Take-home → technical deep dive → system design → culture → hiring manager',
    常见Questions: ['Design a payment processing system', 'How would you handle a 10x increase in transaction volume?', 'Tell me about a project where you reduced complexity'],
    tips: ['Show attention to detail', 'Discuss financial/security considerations', 'Demonstrate product thinking', 'Prepare for take-home assignments'],
    avgDifficulty: 'medium', responseRate: '1-2 weeks', avgInterviewRounds: 4,
  },
];

const STAR_EXAMPLES: StarExample[] = [
  {
    situation: 'Our e-commerce platform was experiencing 2-second page load times during peak traffic, causing a 15% cart abandonment rate.',
    task: 'As the frontend lead, I needed to optimize performance without a major rewrite, while maintaining feature velocity for an upcoming product launch.',
    action: 'I conducted a performance audit using Lighthouse and identified three main bottlenecks: unoptimized images, render-blocking scripts, and excessive API calls. I implemented lazy loading for images, code-split routes with React.lazy, and batched API requests using a custom data loader. I also set up performance budgets in CI to prevent regressions.',
    result: 'Page load time dropped from 2s to 600ms (70% improvement), cart abandonment decreased by 40%, and we maintained 100% feature delivery for the product launch. The performance budget system prevented regressions for 6 months.',
  },
  {
    situation: 'A critical production bug was causing data inconsistency in our user subscription system, affecting 200+ enterprise clients.',
    task: 'As the on-call engineer, I needed to identify and fix the root cause while minimizing downtime and maintaining client trust.',
    action: 'I immediately activated the incident response protocol, communicated with stakeholders, and began systematic debugging. I traced the issue to a race condition in our payment processing queue. I implemented a fix using database transactions with proper locking, added idempotency keys, and created automated tests for the edge case.',
    result: 'Fixed the issue within 2 hours with zero data loss. The fix prevented recurrence and the automated tests caught 3 similar issues in subsequent months. Client satisfaction score improved from 3.2 to 4.5 after our transparent incident communication.',
  },
];

/* ─── Helper Functions ──────────────────────────────────────────────── */
function categoryColor(c: string): string {
  switch (c) {
    case 'technical': return '#3b82f6';
    case 'behavioral': return '#8b5cf6';
    case 'situational': return '#f59e0b';
    case 'culture-fit': return '#22c55e';
    case 'leadership': return '#ef4444';
    default: return '#6b7280';
  }
}

function difficultyColor(d: string): string {
  switch (d) {
    case 'easy': return '#22c55e';
    case 'medium': return '#eab308';
    case 'hard': return '#ef4444';
    default: return '#6b7280';
  }
}

function scoreColor(s: number): string {
  if (s >= 80) return '#22c55e';
  if (s >= 65) return '#eab308';
  return '#ef4444';
}

/* ─── Sub-Components ────────────────────────────────────────────────── */
function KPICard({ label, value, subtitle, color }: {
  label: string; value: string | number; subtitle: string; color: string;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 14px',
      border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', flex: '1 1 0',
      minWidth: 120,
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 10, color: '#94a3b8' }}>{subtitle}</div>
    </div>
  );
}

function QuestionCard({ question, isExpanded, onToggle, index }: {
  question: InterviewQuestion; isExpanded: boolean; onToggle: () => void; index: number;
}) {
  const freqBars = Array.from({ length: 10 }, (_, i) => i < question.frequency);
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
      marginBottom: 10, overflow: 'hidden', transition: 'all 0.3s',
    }}>
      <div onClick={onToggle} style={{
        padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
          background: `${categoryColor(question.category)}20`, color: categoryColor(question.category),
          textTransform: 'capitalize', minWidth: 72, textAlign: 'center',
        }}>{question.category}</span>
        <span style={{
          fontSize: 10, padding: '2px 6px', borderRadius: 6,
          background: `${difficultyColor(question.difficulty)}20`, color: difficultyColor(question.difficulty),
          textTransform: 'capitalize',
        }}>{question.difficulty}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{question.question.slice(0, 80)}...</span>
        <div style={{ display: 'flex', gap: 1 }}>
          {freqBars.map((active, i) => (
            <div key={i} style={{ width: 4, height: 12, borderRadius: 2, background: active ? '#f59e0b' : 'rgba(255,255,255,0.08)' }} />
          ))}
        </div>
        <span style={{ fontSize: 14, color: '#94a3b8', transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
      </div>
      {isExpanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ margin: '14px 0', fontSize: 14, color: '#e2e8f0', lineHeight: 1.6 }}>{question.question}</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>🎯 Key Points to Cover:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {question.keyPoints.map((kp, i) => (
                <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: 'rgba(59,130,246,0.12)', color: '#93c5fd' }}>{kp}</span>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>📝 Sample Answer:</div>
            <div style={{ fontSize: 12, color: '#cbd5e1', background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 8, lineHeight: 1.6 }}>{question.sampleAnswer}</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>💡 Tips:</div>
            {question.tips.map((tip, i) => (
              <div key={i} style={{ fontSize: 12, color: '#94a3b8', marginBottom: 3 }}>• {tip}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {question.skillTags.map(tag => (
              <span key={tag} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: 'rgba(139,92,246,0.12)', color: '#c4b5fd' }}>{tag}</span>
            ))}
            <span style={{ fontSize: 10, color: '#94a3b8' }}>⏱ {question.timeEstimate}</span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>🏢 {question.companies.join(', ')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function CompanyCard({ company }: { company: Company }) {
  const diffColor = difficultyColor(company.avgDifficulty);
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 16,
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 800, fontSize: 18, color: '#e2e8f0' }}>{company.name}</span>
        <span style={{
          fontSize: 10, padding: '3px 10px', borderRadius: 12,
          background: `${diffColor}15`, color: diffColor, textTransform: 'capitalize', fontWeight: 600,
        }}>{company.avgDifficulty} difficulty</span>
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.5 }}>{company.culture}</div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
        <b style={{ color: '#e2e8f0' }}>Interview Process:</b> {company.interviewStyle}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>📊 {company.avgInterviewRounds} rounds</span>
        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>⏱ {company.responseRate}</span>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>🎯 Common Questions:</div>
        {company.常见Questions.map((q, i) => (
          <div key={i} style={{ fontSize: 11, color: '#cbd5e1', marginBottom: 3, paddingLeft: 8, borderLeft: '2px solid rgba(139,92,246,0.3)' }}>{q}</div>
        ))}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>💡 Tips:</div>
        {company.tips.map((tip, i) => (
          <div key={i} style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>• {tip}</div>
        ))}
      </div>
    </div>
  );
}

function StarBlock({ example, title }: { example: StarExample; title: string }) {
  const sections = [
    { label: 'Situation', text: example.situation, color: '#3b82f6', icon: '📍' },
    { label: 'Task', text: example.task, color: '#8b5cf6', icon: '🎯' },
    { label: 'Action', text: example.action, color: '#f59e0b', icon: '⚡' },
    { label: 'Result', text: example.result, color: '#22c55e', icon: '✅' },
  ];
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 16,
      border: '1px solid rgba(255,255,255,0.08)', marginBottom: 14,
    }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 12 }}>{title}</div>
      {sections.map(s => (
        <div key={s.label} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{
            minWidth: 80, padding: '4px 0', fontSize: 11, fontWeight: 700, color: s.color,
            display: 'flex', alignItems: 'flex-start', gap: 4,
          }}>{s.icon} {s.label}</div>
          <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, flex: 1 }}>{s.text}</div>
        </div>
      ))}
    </div>
  );
}

function SessionRow({ session }: { session: PracticeSession }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
      background: 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 8,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${scoreColor(session.avgScore)}15`, color: scoreColor(session.avgScore),
        fontWeight: 800, fontSize: 16,
      }}>{session.avgScore}%</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{session.date}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{session.questionsAnswered} questions · {session.duration}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 11, color: '#22c55e' }}>✅ {session.strongest}</div>
        <div style={{ fontSize: 11, color: '#ef4444' }}>⚠️ {session.weakest}</div>
      </div>
    </div>
  );
}

function ProgressRing({ percentage, size, label, color }: {
  percentage: number; size: number; label: string; color: string;
}) {
  const r = size / 2 - 6;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
        <text x={cx} y={cy + 1} textAnchor="middle" fill="#e2e8f0" fontSize={size * 0.2} fontWeight={800}>{percentage}%</text>
      </svg>
      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{label}</div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────── */
type Tab = 'questions' | 'practice' | 'companies' | 'star' | 'progress';

export default function InterviewPrepCoach() {
  const [activeTab, setActiveTab] = useState<Tab>('questions');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredQuestions = useMemo(() => {
    let qs = [...INTERVIEW_QUESTIONS];
    if (categoryFilter !== 'all') qs = qs.filter(q => q.category === categoryFilter);
    if (difficultyFilter !== 'all') qs = qs.filter(q => q.difficulty === difficultyFilter);
    if (searchQuery) qs = qs.filter(q =>
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.skillTags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return qs.sort((a, b) => b.frequency - a.frequency);
  }, [categoryFilter, difficultyFilter, searchQuery]);

  const progress = useMemo((): PrepProgress => ({
    totalQuestions: INTERVIEW_QUESTIONS.length,
    practiced: PRACTICE_SESSIONS.reduce((sum, s) => sum + s.questionsAnswered, 0),
    mastered: Math.round(PRACTICE_SESSIONS.filter(s => s.avgScore >= 80).length / PRACTICE_SESSIONS.length * INTERVIEW_QUESTIONS.length),
    weakAreas: ['System Design', 'Leadership'],
    strongAreas: ['Behavioral', 'Culture Fit'],
    studyStreak: 5,
    totalPracticeHours: PRACTICE_SESSIONS.reduce((sum, s) => sum + parseInt(s.duration) / 60, 0),
  }), []);

  const avgSessionScore = useMemo(() => {
    return Math.round(PRACTICE_SESSIONS.reduce((sum, s) => sum + s.avgScore, 0) / PRACTICE_SESSIONS.length);
  }, []);

  const categoryStats = useMemo(() => {
    const cats = ['technical', 'behavioral', 'situational', 'culture-fit', 'leadership'];
    return cats.map(c => ({
      category: c,
      total: INTERVIEW_QUESTIONS.filter(q => q.category === c).length,
      avgFrequency: Math.round(INTERVIEW_QUESTIONS.filter(q => q.category === c).reduce((sum, q) => sum + q.frequency, 0) / INTERVIEW_QUESTIONS.filter(q => q.category === c).length),
    }));
  }, []);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'questions', label: 'Questions', icon: '❓' },
    { id: 'practice', label: 'Practice', icon: '🏋️' },
    { id: 'companies', label: 'Companies', icon: '🏢' },
    { id: 'star', label: 'STAR Method', icon: '⭐' },
    { id: 'progress', label: 'Progress', icon: '📊' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', color: '#e2e8f0', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎤</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Interview Prep Coach
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 6 }}>Practice questions, master STAR stories, and ace your next interview</p>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <KPICard label="Questions" value={INTERVIEW_QUESTIONS.length} subtitle="in question bank" color="#f59e0b" />
          <KPICard label="Avg Score" value={`${avgSessionScore}%`} subtitle="across sessions" color={scoreColor(avgSessionScore)} />
          <KPICard label="Study Streak" value={`${progress.studyStreak}d`} subtitle="consecutive days" color="#22c55e" />
          <KPICard label="Practice Time" value={`${progress.totalPracticeHours.toFixed(1)}h`} subtitle="total hours" color="#3b82f6" />
          <KPICard label="Companies" value={TARGET_COMPANIES.length} subtitle="targeting" color="#8b5cf6" />
        </div>

        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: '1 1 0', minWidth: 85, padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? 'rgba(245,158,11,0.2)' : 'transparent',
              color: activeTab === tab.id ? '#fbbf24' : '#94a3b8',
              fontWeight: 600, fontSize: 12, transition: 'all 0.2s',
            }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Questions Tab ─────────────────────────────────────── */}
        {activeTab === 'questions' && (
          <div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <input
                type="text" placeholder="🔍 Search questions or skills..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{
                  flex: '1 1 200px', padding: '10px 14px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
                  color: '#e2e8f0', fontSize: 13, outline: 'none',
                }}
              />
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{
                padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 13,
              }}>
                <option value="all">All Categories</option>
                {['technical', 'behavioral', 'situational', 'culture-fit', 'leadership'].map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
              <select value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)} style={{
                padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 13,
              }}>
                <option value="all">All Difficulties</option>
                {['easy', 'medium', 'hard'].map(d => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
            {/* Category Stats */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {categoryStats.map(cs => (
                <div key={cs.category} onClick={() => setCategoryFilter(cs.category === categoryFilter ? 'all' : cs.category)} style={{
                  padding: '6px 12px', borderRadius: 10, cursor: 'pointer',
                  background: categoryFilter === cs.category ? `${categoryColor(cs.category)}25` : 'rgba(255,255,255,0.04)',
                  border: categoryFilter === cs.category ? `1px solid ${categoryColor(cs.category)}40` : '1px solid transparent',
                  fontSize: 12, color: categoryColor(cs.category), fontWeight: 600,
                  transition: 'all 0.2s',
                }}>
                  {cs.category.charAt(0).toUpperCase() + cs.category.slice(1)} ({cs.total})
                </div>
              ))}
            </div>
            {/* Questions */}
            {filteredQuestions.map((q, i) => (
              <QuestionCard key={q.id} question={q} index={i}
                isExpanded={expandedQuestion === q.id}
                onToggle={() => setExpandedQuestion(expandedQuestion === q.id ? null : q.id)} />
            ))}
            {filteredQuestions.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No questions match your filters.</div>
            )}
          </div>
        )}

        {/* ─── Practice Tab ──────────────────────────────────────── */}
        {activeTab === 'practice' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {/* Quick Practice */}
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px 0', color: '#e2e8f0' }}>🏋️ Quick Practice</h3>
                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>Start a timed practice session with random questions</div>
                {['5 Questions (15 min)', '10 Questions (30 min)', '15 Questions (45 min)', 'Custom Session'].map((opt, i) => (
                  <div key={i} style={{
                    padding: '10px 14px', borderRadius: 10, marginBottom: 8, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: 13, color: '#e2e8f0', fontWeight: 600, transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(245,158,11,0.4)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  >{opt}</div>
                ))}
              </div>
              {/* Focus Areas */}
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px 0', color: '#e2e8f0' }}>🎯 Focus Areas</h3>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', marginBottom: 6 }}>Weak Areas (practice more):</div>
                  {progress.weakAreas.map(area => (
                    <div key={area} style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 4, padding: '6px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>⚠️ {area}</div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', marginBottom: 6 }}>Strong Areas:</div>
                  {progress.strongAreas.map(area => (
                    <div key={area} style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 4, padding: '6px 10px', background: 'rgba(34,197,94,0.08)', borderRadius: 8 }}>✅ {area}</div>
                  ))}
                </div>
              </div>
            </div>
            {/* Session History */}
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px 0', color: '#e2e8f0' }}>📋 Recent Sessions</h3>
              {PRACTICE_SESSIONS.map(session => <SessionRow key={session.id} session={session} />)}
            </div>
          </div>
        )}

        {/* ─── Companies Tab ─────────────────────────────────────── */}
        {activeTab === 'companies' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: 16 }}>
            {TARGET_COMPANIES.map(company => <CompanyCard key={company.name} company={company} />)}
          </div>
        )}

        {/* ─── STAR Method Tab ───────────────────────────────────── */}
        {activeTab === 'star' && (
          <div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px 0', color: '#e2e8f0' }}>⭐ The STAR Method Framework</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { letter: 'S', word: 'Situation', desc: 'Set the context', color: '#3b82f6' },
                  { letter: 'T', word: 'Task', desc: 'Your responsibility', color: '#8b5cf6' },
                  { letter: 'A', word: 'Action', desc: 'What you did', color: '#f59e0b' },
                  { letter: 'R', word: 'Result', desc: 'The outcome', color: '#22c55e' },
                ].map(s => (
                  <div key={s.letter} style={{
                    textAlign: 'center', padding: 14, borderRadius: 12,
                    background: `${s.color}12`, border: `1px solid ${s.color}30`,
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.letter}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{s.word}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                The STAR method helps you structure behavioral interview answers with specific, impactful examples. Each story should take 2-3 minutes to deliver.
              </div>
            </div>
            {/* Example Stories */}
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px 0', color: '#e2e8f0' }}>📝 Example STAR Stories</h3>
            {STAR_EXAMPLES.map((ex, i) => (
              <StarBlock key={i} example={ex} title={i === 0 ? 'Performance Optimization Story' : 'Incident Response Story'} />
            ))}
          </div>
        )}

        {/* ─── Progress Tab ──────────────────────────────────────── */}
        {activeTab === 'progress' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 16, border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <ProgressRing percentage={Math.round(progress.practiced / (INTERVIEW_QUESTIONS.length * 3) * 100)} size={100} label="Questions Practiced" color="#f59e0b" />
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 16, border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <ProgressRing percentage={Math.round(progress.mastered / INTERVIEW_QUESTIONS.length * 100)} size={100} label="Mastered" color="#22c55e" />
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 16, border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <ProgressRing percentage={avgSessionScore} size={100} label="Avg Score" color={scoreColor(avgSessionScore)} />
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 16, border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <ProgressRing percentage={Math.round(progress.totalPracticeHours / 20 * 100)} size={100} label="Study Goal" color="#3b82f6" />
              </div>
            </div>
            {/* Category Breakdown */}
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px 0', color: '#e2e8f0' }}>📊 Category Performance</h3>
              {categoryStats.map(cs => (
                <div key={cs.category} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: categoryColor(cs.category), fontWeight: 600 }}>{cs.category.charAt(0).toUpperCase() + cs.category.slice(1)}</span>
                    <span style={{ color: '#94a3b8' }}>{cs.total} questions · avg frequency: {cs.avgFrequency}/10</span>
                  </div>
                  <div style={{ height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 5 }}>
                    <div style={{ height: '100%', width: `${cs.avgFrequency * 10}%`, background: categoryColor(cs.category), borderRadius: 5 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
