import { useState, useMemo } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface CareerMilestone {
  id: string;
  title: string;
  role: string;
  timeframe: string;
  status: 'completed' | 'current' | 'upcoming' | 'future';
  requiredSkills: string[];
  acquiredSkills: string[];
  salaryRange: string;
  description: string;
  keyAchievements: string[];
  challenges: string[];
}

interface SkillTarget {
  skill: string;
  currentLevel: number; // 0-100
  targetLevel: number;
  deadline: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  resources: { title: string; type: string; duration: string }[];
  category: string;
}

interface SalaryProjection {
  year: string;
  role: string;
  low: number;
  mid: number;
  high: number;
  confidence: number;
}

interface IndustryInsight {
  title: string;
  category: string;
  trend: 'hot' | 'growing' | 'stable' | 'declining';
  description: string;
  impact: string;
  actionItems: string[];
}

interface NetworkingGoal {
  id: string;
  type: 'mentor' | 'peer' | 'community' | 'conference' | 'open-source';
  target: string;
  status: 'not-started' | 'in-progress' | 'achieved';
  deadline: string;
  notes: string;
}

/* ─── Mock Data ─────────────────────────────────────────────────────── */
const CAREER_MILESTONES: CareerMilestone[] = [
  {
    id: 'm1', title: 'Junior Frontend Developer', role: 'Junior Developer',
    timeframe: '2021 - 2022', status: 'completed',
    requiredSkills: ['HTML', 'CSS', 'JavaScript', 'Git', 'Responsive Design'],
    acquiredSkills: ['HTML', 'CSS', 'JavaScript', 'Git', 'Responsive Design', 'React Basics'],
    salaryRange: '$55K - $70K',
    description: 'Built foundational web development skills, shipped first production features.',
    keyAchievements: ['Shipped 12 UI components', 'Reduced page load time by 30%', 'First contribution to design system'],
    challenges: ['Learning modern build tools', 'Understanding component architecture'],
  },
  {
    id: 'm2', title: 'Frontend Developer', role: 'Mid-Level Developer',
    timeframe: '2022 - 2024', status: 'completed',
    requiredSkills: ['React', 'TypeScript', 'State Management', 'Testing', 'CI/CD'],
    acquiredSkills: ['React', 'TypeScript', 'Redux', 'Jest', 'GitHub Actions', 'REST APIs', 'CSS Modules'],
    salaryRange: '$75K - $95K',
    description: 'Led feature development, mentored juniors, improved team processes.',
    keyAchievements: ['Led checkout redesign (20% conversion boost)', 'Mentored 3 junior devs', 'Established testing culture'],
    challenges: ['Managing competing priorities', 'Balancing speed vs quality'],
  },
  {
    id: 'm3', title: 'Senior Frontend Engineer', role: 'Senior Developer',
    timeframe: '2024 - 2026', status: 'current',
    requiredSkills: ['Architecture', 'Performance', 'Mentoring', 'System Design', 'Next.js', 'GraphQL'],
    acquiredSkills: ['Next.js', 'GraphQL', 'Performance Optimization', 'Micro-frontends', 'Design Systems', 'Tech Lead Skills'],
    salaryRange: '$110K - $140K',
    description: 'Driving technical decisions, owning critical systems, growing the team.',
    keyAchievements: ['Architected design system used by 5 teams', 'Reduced bundle size 45%', 'Led migration to TypeScript'],
    challenges: ['Scaling frontend infrastructure', 'Cross-team coordination'],
  },
  {
    id: 'm4', title: 'Staff Engineer', role: 'Staff Engineer',
    timeframe: '2026 - 2028', status: 'upcoming',
    requiredSkills: ['Technical Strategy', 'Cross-team Impact', 'Architecture Review', 'Innovation', 'Rust/Go'],
    acquiredSkills: [],
    salaryRange: '$140K - $180K',
    description: 'Set technical direction across multiple teams, solve hardest problems.',
    keyAchievements: [],
    challenges: ['Building organizational influence', 'Balancing technical depth with breadth'],
  },
  {
    id: 'm5', title: 'Engineering Manager', role: 'Engineering Manager',
    timeframe: '2028 - 2030', status: 'future',
    requiredSkills: ['People Management', 'Hiring', 'Performance Reviews', 'Budget Planning', 'Stakeholder Communication'],
    acquiredSkills: [],
    salaryRange: '$160K - $210K',
    description: 'Lead engineering teams, drive culture, align technical strategy with business.',
    keyAchievements: [],
    challenges: ['Transitioning from IC to manager', 'Managing up and across'],
  },
];

const SKILL_TARGETS: SkillTarget[] = [
  {
    skill: 'Rust', currentLevel: 10, targetLevel: 60, deadline: '2027-06',
    priority: 'high', category: 'Language',
    resources: [
      { title: 'The Rust Programming Language', type: 'book', duration: '30h' },
      { title: 'Rustlings Exercises', type: 'project', duration: '20h' },
      { title: 'Rust for Rustaceans', type: 'book', duration: '25h' },
    ],
  },
  {
    skill: 'System Design', currentLevel: 55, targetLevel: 85, deadline: '2027-03',
    priority: 'critical', category: 'Architecture',
    resources: [
      { title: 'Designing Data-Intensive Applications', type: 'book', duration: '40h' },
      { title: 'System Design Interview', type: 'course', duration: '20h' },
      { title: 'Architecture Decision Records', type: 'project', duration: '15h' },
    ],
  },
  {
    skill: 'Kubernetes', currentLevel: 25, targetLevel: 70, deadline: '2027-06',
    priority: 'high', category: 'DevOps',
    resources: [
      { title: 'CKA Certification', type: 'certification', duration: '60h' },
      { title: 'Kubernetes in Action', type: 'book', duration: '30h' },
      { title: 'CKAD Practice Labs', type: 'project', duration: '20h' },
    ],
  },
  {
    skill: 'Technical Leadership', currentLevel: 40, targetLevel: 80, deadline: '2027-12',
    priority: 'high', category: 'Soft Skills',
    resources: [
      { title: 'Staff Engineer by Will Larson', type: 'book', duration: '10h' },
      { title: 'The Manager\'s Path', type: 'book', duration: '12h' },
      { title: 'Tech Lead Certification', type: 'certification', duration: '25h' },
    ],
  },
  {
    skill: 'Go', currentLevel: 15, targetLevel: 55, deadline: '2027-09',
    priority: 'medium', category: 'Language',
    resources: [
      { title: 'Go by Example', type: 'course', duration: '15h' },
      { title: 'Go Concurrency Patterns', type: 'project', duration: '10h' },
    ],
  },
  {
    skill: 'AWS Solutions Architect', currentLevel: 30, targetLevel: 75, deadline: '2027-06',
    priority: 'medium', category: 'Cloud',
    resources: [
      { title: 'AWS SA Professional Cert', type: 'certification', duration: '50h' },
      { title: 'AWS Well-Architected Labs', type: 'project', duration: '20h' },
    ],
  },
];

const SALARY_PROJECTIONS: SalaryProjection[] = [
  { year: '2026', role: 'Senior Frontend Engineer', low: 110, mid: 125, high: 140, confidence: 90 },
  { year: '2027', role: 'Senior Frontend Engineer', low: 115, mid: 130, high: 150, confidence: 85 },
  { year: '2028', role: 'Staff Engineer', low: 140, mid: 160, high: 185, confidence: 70 },
  { year: '2029', role: 'Staff Engineer', low: 150, mid: 170, high: 200, confidence: 65 },
  { year: '2030', role: 'Engineering Manager', low: 160, mid: 185, high: 220, confidence: 55 },
  { year: '2031', role: 'Engineering Manager', low: 170, mid: 200, high: 240, confidence: 50 },
];

const INDUSTRY_INSIGHTS: IndustryInsight[] = [
  {
    title: 'AI-Powered Development Tools', category: 'Technology',
    trend: 'hot', description: 'AI coding assistants and automated testing are transforming how developers work.',
    impact: 'High — Engineers who leverage AI tools are 2-3x more productive',
    actionItems: ['Master AI coding tools (Copilot, Cursor)', 'Build AI-integrated features', 'Understand LLM fundamentals'],
  },
  {
    title: 'Edge Computing Growth', category: 'Infrastructure',
    trend: 'growing', description: 'Computing at the edge is becoming critical for real-time applications.',
    impact: 'Medium — Creates new architectural patterns and roles',
    actionItems: ['Learn Cloudflare Workers or Deno Deploy', 'Build an edge-first application', 'Understand CDN architecture'],
  },
  {
    title: 'WebAssembly Mainstream Adoption', category: 'Technology',
    trend: 'growing', description: 'WASM is enabling near-native performance in browsers and beyond.',
    impact: 'Medium — Opens new performance-critical application domains',
    actionItems: ['Build a Rust-to-WASM project', 'Explore WASM in non-browser environments', 'Learn WASI'],
  },
  {
    title: 'TypeScript as Default', category: 'Language',
    trend: 'stable', description: 'TypeScript has become the de facto standard for new projects.',
    impact: 'High — Deep TypeScript expertise is now table stakes',
    actionItems: ['Master advanced TS patterns', 'Contribute to type-heavy open source', 'Learn TS compiler internals'],
  },
];

const NETWORKING_GOALS: NetworkingGoal[] = [
  { id: 'n1', type: 'mentor', target: 'Find a Staff+ Engineer mentor', status: 'in-progress', deadline: '2026-12', notes: 'Connected with 2 potential mentors at local meetup' },
  { id: 'n2', type: 'community', target: 'Speak at 2 tech conferences', status: 'not-started', deadline: '2027-06', notes: 'Drafting talk proposal on micro-frontends' },
  { id: 'n3', type: 'open-source', target: 'Contribute to a major OSS project', status: 'in-progress', deadline: '2027-03', notes: '3 PRs merged into Vite, working on a bigger feature' },
  { id: 'n4', type: 'peer', target: 'Build a network of 50+ senior engineers', status: 'in-progress', deadline: '2027-12', notes: 'Currently at 32, growing through conferences and online' },
  { id: 'n5', type: 'conference', target: 'Attend React Conf + GraphQL Summit', status: 'not-started', deadline: '2027-09', notes: 'Budget approved, will register when tickets open' },
];

/* ─── Helper Functions ──────────────────────────────────────────────── */
function milestoneColor(s: string): string {
  switch (s) {
    case 'completed': return '#22c55e';
    case 'current': return '#3b82f6';
    case 'upcoming': return '#f59e0b';
    case 'future': return '#8b5cf6';
    default: return '#6b7280';
  }
}

function priorityColor(p: string): string {
  switch (p) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#22c55e';
    default: return '#6b7280';
  }
}

function trendColor(t: string): string {
  switch (t) {
    case 'hot': return '#ef4444';
    case 'growing': return '#22c55e';
    case 'stable': return '#3b82f6';
    case 'declining': return '#94a3b8';
    default: return '#6b7280';
  }
}

function networkingIcon(t: string): string {
  switch (t) {
    case 'mentor': return '🧑‍🏫';
    case 'peer': return '👥';
    case 'community': return '🎤';
    case 'conference': return '🎫';
    case 'open-source': return '💻';
    default: return '📌';
  }
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

function MilestoneCard({ milestone, onClick }: { milestone: CareerMilestone; onClick?: () => void }) {
  const color = milestoneColor(milestone.status);
  const progress = milestone.requiredSkills.length > 0
    ? Math.round((milestone.acquiredSkills.length / milestone.requiredSkills.length) * 100)
    : 0;
  return (
    <div onClick={onClick} style={{
      background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 16,
      borderLeft: `4px solid ${color}`, cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = color; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `4px solid ${color}`; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#e2e8f0' }}>{milestone.title}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{milestone.role} · {milestone.timeframe}</div>
        </div>
        <div style={{
          fontSize: 10, padding: '3px 10px', borderRadius: 12, fontWeight: 600,
          background: `${color}20`, color, textTransform: 'capitalize',
        }}>{milestone.status}</div>
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, lineHeight: 1.4 }}>{milestone.description}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e' }}>💰 {milestone.salaryRange}</span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>Skills: {milestone.acquiredSkills.length}/{milestone.requiredSkills.length}</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: color, borderRadius: 3, transition: 'width 0.8s' }} />
      </div>
    </div>
  );
}

function SkillTargetRow({ target }: { target: SkillTarget }) {
  const gap = target.targetLevel - target.currentLevel;
  const progress = target.currentLevel;
  const prioCol = priorityColor(target.priority);
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, marginBottom: 8,
      borderLeft: `3px solid ${prioCol}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{target.skill}</span>
          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>{target.category}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: `${prioCol}20`, color: prioCol, textTransform: 'capitalize' }}>{target.priority}</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>📅 {target.deadline}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: '#94a3b8', width: 20 }}>{target.currentLevel}%</span>
        <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 5, position: 'relative' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: prioCol, borderRadius: 5, transition: 'width 0.8s' }} />
          <div style={{ position: 'absolute', top: -2, left: `${target.targetLevel}%`, width: 2, height: 14, background: '#e2e8f0', borderRadius: 1 }} />
        </div>
        <span style={{ fontSize: 10, color: '#e2e8f0', fontWeight: 600, width: 20 }}>{target.targetLevel}%</span>
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>Gap: {gap}% · Resources: {target.resources.length} ({target.resources.map(r => r.duration).join(', ')})</div>
    </div>
  );
}

function SalaryChart({ projections }: { projections: SalaryProjection[] }) {
  const maxSalary = 250;
  const barWidth = 50;
  const chartHeight = 200;
  const chartWidth = projections.length * (barWidth + 30) + 60;
  return (
    <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} style={{ overflow: 'visible' }}>
      {/* Y-axis labels */}
      {[0, 50, 100, 150, 200, 250].map(v => (
        <g key={v}>
          <line x1={40} y1={chartHeight - (v / maxSalary) * chartHeight} x2={chartWidth} y2={chartHeight - (v / maxSalary) * chartHeight} stroke="rgba(255,255,255,0.06)" />
          <text x={36} y={chartHeight - (v / maxSalary) * chartHeight + 4} textAnchor="end" fill="#64748b" fontSize={9}>${v}K</text>
        </g>
      ))}
      {/* Bars */}
      {projections.map((p, i) => {
        const x = 55 + i * (barWidth + 30);
        const lowH = (p.low / maxSalary) * chartHeight;
        const midH = (p.mid / maxSalary) * chartHeight;
        const highH = (p.high / maxSalary) * chartHeight;
        const color = i <= 1 ? '#22c55e' : i <= 3 ? '#3b82f6' : '#8b5cf6';
        return (
          <g key={p.year}>
            {/* High range */}
            <rect x={x} y={chartHeight - highH} width={barWidth} height={highH} rx={4} fill={`${color}15`} stroke={color} strokeWidth={1} strokeDasharray="4 2" />
            {/* Mid range */}
            <rect x={x + 5} y={chartHeight - midH} width={barWidth - 10} height={midH} rx={3} fill={`${color}30`} />
            {/* Low range */}
            <rect x={x + 10} y={chartHeight - lowH} width={barWidth - 20} height={lowH} rx={2} fill={color} opacity={0.7} />
            {/* Labels */}
            <text x={x + barWidth / 2} y={chartHeight - highH - 6} textAnchor="middle" fill="#e2e8f0" fontSize={10} fontWeight={700}>${p.mid}K</text>
            <text x={x + barWidth / 2} y={chartHeight + 14} textAnchor="middle" fill="#94a3b8" fontSize={10}>{p.year}</text>
            <text x={x + barWidth / 2} y={chartHeight + 26} textAnchor="middle" fill="#64748b" fontSize={8}>{p.role.split(' ').slice(0, 2).join(' ')}</text>
          </g>
        );
      })}
    </svg>
  );
}

function InsightCard({ insight }: { insight: IndustryInsight }) {
  const tColor = trendColor(insight.trend);
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 16,
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{insight.title}</span>
        <span style={{
          fontSize: 10, padding: '2px 10px', borderRadius: 12, fontWeight: 600,
          background: `${tColor}20`, color: tColor, textTransform: 'uppercase',
        }}>{insight.trend}</span>
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>{insight.description}</div>
      <div style={{ fontSize: 11, color: '#22c55e', marginBottom: 10 }}>📈 {insight.impact}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>Action Items:</div>
      {insight.actionItems.map((item, i) => (
        <div key={i} style={{ fontSize: 11, color: '#cbd5e1', marginBottom: 3 }}>• {item}</div>
      ))}
    </div>
  );
}

function NetworkingGoalRow({ goal }: { goal: NetworkingGoal }) {
  const statusColors: Record<string, string> = { 'not-started': '#94a3b8', 'in-progress': '#3b82f6', 'achieved': '#22c55e' };
  const sColor = statusColors[goal.status];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      background: 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 8,
      borderLeft: `3px solid ${sColor}`,
    }}>
      <span style={{ fontSize: 20 }}>{networkingIcon(goal.type)}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#e2e8f0', marginBottom: 2 }}>{goal.target}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{goal.notes}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 8, fontWeight: 600,
          background: `${sColor}20`, color: sColor, textTransform: 'replace',
        }}>{goal.status.replace('-', ' ')}</span>
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>📅 {goal.deadline}</div>
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────── */
type Tab = 'roadmap' | 'skills' | 'salary' | 'insights' | 'networking';

export default function CareerRoadmapPlanner() {
  const [activeTab, setActiveTab] = useState<Tab>('roadmap');
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>('m3');

  const completedMilestones = CAREER_MILESTONES.filter(m => m.status === 'completed').length;
  const avgSkillProgress = useMemo(() => {
    const total = SKILL_TARGETS.reduce((sum, t) => sum + t.currentLevel, 0);
    return Math.round(total / SKILL_TARGETS.length);
  }, []);
  const criticalGaps = SKILL_TARGETS.filter(t => t.priority === 'critical').length;
  const fiveYearSalary = SALARY_PROJECTIONS[SALARY_PROJECTIONS.length - 1]?.mid || 0;

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'roadmap', label: 'Roadmap', icon: '🗺️' },
    { id: 'skills', label: 'Skills', icon: '🎯' },
    { id: 'salary', label: 'Salary', icon: '💰' },
    { id: 'insights', label: 'Insights', icon: '📈' },
    { id: 'networking', label: 'Network', icon: '🤝' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', color: '#e2e8f0', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🗺️</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #22c55e, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Career Roadmap Planner
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 6 }}>Plan your career trajectory with milestones, skill targets, and salary projections</p>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <KPICard label="Milestones" value={`${completedMilestones}/${CAREER_MILESTONES.length}`} subtitle="completed" color="#22c55e" />
          <KPICard label="Skill Progress" value={`${avgSkillProgress}%`} subtitle="avg across targets" color="#3b82f6" />
          <KPICard label="Critical Gaps" value={criticalGaps} subtitle="need attention" color={criticalGaps > 0 ? '#ef4444' : '#22c55e'} />
          <KPICard label="5-Year Target" value={`$${fiveYearSalary}K`} subtitle="mid salary projection" color="#8b5cf6" />
          <KPICard label="Networking" value={`${NETWORKING_GOALS.filter(g => g.status === 'achieved').length}/${NETWORKING_GOALS.length}`} subtitle="goals achieved" color="#f59e0b" />
        </div>

        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: '1 1 0', minWidth: 85, padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? 'rgba(34,197,94,0.2)' : 'transparent',
              color: activeTab === tab.id ? '#4ade80' : '#94a3b8',
              fontWeight: 600, fontSize: 12, transition: 'all 0.2s',
            }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Roadmap Tab ───────────────────────────────────────── */}
        {activeTab === 'roadmap' && (
          <div>
            {/* Visual Timeline */}
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px 0', color: '#e2e8f0' }}>🗺️ Career Timeline</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
                {CAREER_MILESTONES.map((m, i) => {
                  const color = milestoneColor(m.status);
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', minWidth: 140 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: m.status === 'current' ? color : `${color}25`,
                          border: m.status === 'current' ? `3px solid ${color}` : `2px solid ${color}40`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 13, color: m.status === 'current' ? '#fff' : color,
                        }}>{i + 1}</div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#e2e8f0', marginTop: 4, textAlign: 'center', maxWidth: 120 }}>{m.role}</div>
                        <div style={{ fontSize: 9, color: '#94a3b8' }}>{m.timeframe.split(' - ')[0]}</div>
                      </div>
                      {i < CAREER_MILESTONES.length - 1 && (
                        <div style={{
                          width: 40, height: 2, background: m.status === 'completed' ? '#22c55e' : 'rgba(255,255,255,0.12)',
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Milestone Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: 14 }}>
              {CAREER_MILESTONES.map(m => (
                <div key={m.id}>
                  <MilestoneCard milestone={m} onClick={() => setExpandedMilestone(expandedMilestone === m.id ? null : m.id)} />
                  {expandedMilestone === m.id && (
                    <div style={{
                      background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 14, marginTop: 8,
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>🏆 Key Achievements:</div>
                        {m.keyAchievements.length > 0 ? m.keyAchievements.map((a, i) => (
                          <div key={i} style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 2 }}>✅ {a}</div>
                        )) : <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>Not yet reached this milestone</div>}
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>⚡ Challenges:</div>
                        {m.challenges.map((c, i) => (
                          <div key={i} style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 2 }}>⚠️ {c}</div>
                        ))}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>🛠️ Required Skills:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {m.requiredSkills.map(s => (
                            <span key={s} style={{
                              fontSize: 10, padding: '2px 8px', borderRadius: 12,
                              background: m.acquiredSkills.includes(s) ? '#22c55e15' : '#ef444415',
                              color: m.acquiredSkills.includes(s) ? '#22c55e' : '#ef4444',
                            }}>{s}{m.acquiredSkills.includes(s) ? ' ✓' : ''}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Skills Tab ────────────────────────────────────────── */}
        {activeTab === 'skills' && (
          <div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px 0', color: '#e2e8f0' }}>🎯 Skill Targets for Staff Engineer</h3>
              {SKILL_TARGETS.sort((a, b) => priorityColor(a.priority) > priorityColor(b.priority) ? -1 : 1).map(t => (
                <SkillTargetRow key={t.skill} target={t} />
              ))}
            </div>
            {/* Resource List */}
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px 0', color: '#e2e8f0' }}>📚 Recommended Resources</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {SKILL_TARGETS.flatMap(t => t.resources.map(r => ({ ...r, skill: t.skill }))).map((r, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: 'rgba(59,130,246,0.15)', color: '#93c5fd', textTransform: 'capitalize' }}>{r.type}</span>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>{r.duration}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{r.title}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>For: {r.skill}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Salary Tab ────────────────────────────────────────── */}
        {activeTab === 'salary' && (
          <div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px 0', color: '#e2e8f0' }}>💰 Salary Projection (2026-2031)</h3>
              <SalaryChart projections={SALARY_PROJECTIONS} />
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, fontSize: 11, color: '#94a3b8' }}>
                <span>🟢 Confident (90%+)</span><span>🔵 Probable (65-90%)</span><span>🟣 Possible (&lt;65%)</span>
              </div>
            </div>
            {/* Detailed Projections */}
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px 0', color: '#e2e8f0' }}>📊 Detailed Projections</h3>
              {SALARY_PROJECTIONS.map(p => (
                <div key={p.year} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', width: 50 }}>{p.year}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8', width: 160 }}>{p.role}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>${p.low}K</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>${p.mid}K</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>${p.high}K</span>
                  <span style={{ fontSize: 11, color: p.confidence >= 70 ? '#22c55e' : p.confidence >= 50 ? '#eab308' : '#94a3b8', marginLeft: 'auto' }}>{p.confidence}% confidence</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Insights Tab ──────────────────────────────────────── */}
        {activeTab === 'insights' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: 14 }}>
            {INDUSTRY_INSIGHTS.map((insight, i) => <InsightCard key={i} insight={insight} />)}
          </div>
        )}

        {/* ─── Networking Tab ────────────────────────────────────── */}
        {activeTab === 'networking' && (
          <div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px 0', color: '#e2e8f0' }}>🤝 Networking Goals</h3>
              {NETWORKING_GOALS.map(goal => <NetworkingGoalRow key={goal.id} goal={goal} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
