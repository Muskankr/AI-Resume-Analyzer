import { useState, useMemo } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface ResumeVersion {
  id: string;
  name: string;
  date: string;
  atsScore: number;
  keywordsFound: number;
  keywordsTotal: number;
  skills: string[];
  sections: SectionData[];
  issues: Issue[];
  overallGrade: string;
  wordCount: number;
  readabilityScore: number;
  actionVerbCount: number;
  quantifiedAchievements: number;
}

interface SectionData {
  name: string;
  score: number;
  status: 'excellent' | 'good' | 'needs-work' | 'missing';
  feedback: string;
  wordCount: number;
}

interface Issue {
  category: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  line?: number;
}

interface ComparisonMetric {
  label: string;
  v1: number;
  v2: number;
  unit: string;
  better: 'higher' | 'lower';
  icon: string;
}

interface ImprovementSuggestion {
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  example: string;
}

/* ─── Mock Data ─────────────────────────────────────────────────────── */
const RESUME_VERSIONS: ResumeVersion[] = [
  {
    id: 'v1', name: 'Initial Draft', date: '2026-06-15',
    atsScore: 52, keywordsFound: 8, keywordsTotal: 20,
    skills: ['JavaScript', 'React', 'HTML', 'CSS', 'Git'],
    overallGrade: 'C+', wordCount: 380, readabilityScore: 62,
    actionVerbCount: 4, quantifiedAchievements: 1,
    sections: [
      { name: 'Header & Contact', score: 85, status: 'excellent', feedback: 'Complete contact info with LinkedIn', wordCount: 30 },
      { name: 'Professional Summary', score: 35, status: 'needs-work', feedback: 'Too generic, no specific achievements', wordCount: 45 },
      { name: 'Work Experience', score: 50, status: 'needs-work', feedback: 'Missing quantified achievements', wordCount: 120 },
      { name: 'Skills', score: 40, status: 'needs-work', feedback: 'Only 5 skills listed, missing modern technologies', wordCount: 25 },
      { name: 'Education', score: 75, status: 'good', feedback: 'Good, consider adding relevant coursework', wordCount: 30 },
      { name: 'Projects', score: 0, status: 'missing', feedback: 'No projects section found', wordCount: 0 },
    ],
    issues: [
      { category: 'Content', severity: 'critical', message: 'No quantified achievements (numbers, metrics)', line: 15 },
      { category: 'Keywords', severity: 'critical', message: 'Missing 12 key industry keywords', line: 0 },
      { category: 'Format', severity: 'warning', message: 'Inconsistent date formatting', line: 8 },
      { category: 'Content', severity: 'warning', message: 'Professional summary is too vague', line: 4 },
      { category: 'ATS', severity: 'critical', message: 'Missing section headers that ATS systems expect', line: 0 },
    ],
  },
  {
    id: 'v2', name: 'Optimized Version', date: '2026-07-10',
    atsScore: 78, keywordsFound: 15, keywordsTotal: 20,
    skills: ['JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Python', 'SQL', 'Docker', 'Git', 'REST APIs', 'AWS', 'CSS'],
    overallGrade: 'B+', wordCount: 520, readabilityScore: 74,
    actionVerbCount: 12, quantifiedAchievements: 5,
    sections: [
      { name: 'Header & Contact', score: 90, status: 'excellent', feedback: 'Added portfolio link and GitHub', wordCount: 35 },
      { name: 'Professional Summary', score: 75, status: 'good', feedback: 'Better but could be more specific', wordCount: 55 },
      { name: 'Work Experience', score: 80, status: 'good', feedback: 'Strong action verbs and some metrics', wordCount: 180 },
      { name: 'Skills', score: 85, status: 'excellent', feedback: 'Comprehensive skill set with categorization', wordCount: 40 },
      { name: 'Education', score: 80, status: 'good', feedback: 'Added GPA and relevant coursework', wordCount: 40 },
      { name: 'Projects', score: 70, status: 'good', feedback: 'Two strong projects with tech stack details', wordCount: 100 },
    ],
    issues: [
      { category: 'Content', severity: 'warning', message: 'Professional summary could include more metrics', line: 5 },
      { category: 'Keywords', severity: 'info', message: '5 industry keywords still missing', line: 0 },
      { category: 'Format', severity: 'info', message: 'Consider adding a certifications section', line: 0 },
    ],
  },
  {
    id: 'v3', name: 'Final Polished', date: '2026-08-20',
    atsScore: 94, keywordsFound: 19, keywordsTotal: 20,
    skills: ['JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Python', 'SQL', 'Docker', 'Kubernetes', 'Git', 'REST APIs', 'GraphQL', 'AWS', 'CI/CD', 'Redis', 'MongoDB', 'Tailwind CSS', 'Figma', 'Jest', 'Agile'],
    overallGrade: 'A', wordCount: 610, readabilityScore: 82,
    actionVerbCount: 18, quantifiedAchievements: 8,
    sections: [
      { name: 'Header & Contact', score: 95, status: 'excellent', feedback: 'Complete with all professional links', wordCount: 40 },
      { name: 'Professional Summary', score: 90, status: 'excellent', feedback: 'Specific, metric-driven, role-targeted', wordCount: 60 },
      { name: 'Work Experience', score: 92, status: 'excellent', feedback: 'Strong metrics, clear impact, relevant keywords', wordCount: 220 },
      { name: 'Skills', score: 95, status: 'excellent', feedback: '20 skills, properly categorized by proficiency', wordCount: 50 },
      { name: 'Education', score: 85, status: 'excellent', feedback: 'Added honors, GPA, and relevant projects', wordCount: 45 },
      { name: 'Projects', score: 88, status: 'excellent', feedback: '3 projects with metrics and live demos', wordCount: 130 },
      { name: 'Certifications', score: 80, status: 'good', feedback: 'AWS and Docker certs, consider more', wordCount: 30 },
    ],
    issues: [
      { category: 'Keywords', severity: 'info', message: '1 minor keyword could be added for maximum ATS score', line: 0 },
    ],
  },
];

const COMPARISON_METRICS: ComparisonMetric[] = [
  { label: 'ATS Score', v1: 52, v2: 94, unit: '%', better: 'higher', icon: '🎯' },
  { label: 'Keywords Found', v1: 8, v2: 19, unit: '/20', better: 'higher', icon: '🔑' },
  { label: 'Skills Listed', v1: 5, v2: 20, unit: '', better: 'higher', icon: '🛠️' },
  { label: 'Action Verbs', v1: 4, v2: 18, unit: '', better: 'higher', icon: '💪' },
  { label: 'Quantified Achievements', v1: 1, v2: 8, unit: '', better: 'higher', icon: '📊' },
  { label: 'Word Count', v1: 380, v2: 610, unit: ' words', better: 'higher', icon: '📝' },
  { label: 'Readability Score', v1: 62, v2: 82, unit: '/100', better: 'higher', icon: '📖' },
  { label: 'Issues Found', v1: 5, v2: 1, unit: '', better: 'lower', icon: '⚠️' },
];

const IMPROVEMENT_SUGGESTIONS: ImprovementSuggestion[] = [
  {
    category: 'Keywords', priority: 'high', title: 'Add Missing ATS Keywords',
    description: 'Your resume is missing key industry terms that ATS systems scan for.',
    impact: '+15-20% ATS score improvement', example: 'Add: "microservices", "CI/CD pipeline", "test-driven development"',
  },
  {
    category: 'Metrics', priority: 'high', title: 'Quantify All Achievements',
    description: 'Replace vague descriptions with specific numbers and percentages.',
    impact: '+25% recruiter engagement', example: '"Improved performance" → "Reduced load time by 40%, serving 10K+ daily users"',
  },
  {
    category: 'Content', priority: 'medium', title: 'Strengthen Professional Summary',
    description: 'Write a targeted 3-line summary with your top achievement and target role.',
    impact: '+10% interview callback rate', example: '"Full-Stack Developer with 5+ years building scalable apps, recently leading a team that shipped a platform serving 50K users"',
  },
  {
    category: 'Projects', priority: 'medium', title: 'Add 2-3 Featured Projects',
    description: 'Include projects with links, tech stack, and measurable outcomes.',
    impact: '+20% technical credibility', example: 'Include GitHub links, live demo URLs, and metrics like stars or users',
  },
  {
    category: 'Format', priority: 'low', title: 'Standardize Date & Section Formatting',
    description: 'Use consistent date formats and ensure all sections follow a uniform style.',
    impact: '+5% professional appearance', example: 'Use "MMM YYYY" format consistently: "Jan 2024 - Present"',
  },
  {
    category: 'Skills', priority: 'medium', title: 'Categorize Skills by Proficiency',
    description: 'Group skills into Expert, Advanced, Intermediate for better readability.',
    impact: '+8% recruiter skill matching', example: 'Expert: JavaScript, React | Advanced: TypeScript, Node.js | Intermediate: Python, Docker',
  },
];

/* ─── Helper Functions ──────────────────────────────────────────────── */
function gradeColor(g: string): string {
  if (g.startsWith('A')) return '#22c55e';
  if (g.startsWith('B')) return '#3b82f6';
  if (g.startsWith('C')) return '#eab308';
  return '#ef4444';
}

function statusColor(s: string): string {
  switch (s) {
    case 'excellent': return '#22c55e';
    case 'good': return '#3b82f6';
    case 'needs-work': return '#eab308';
    case 'missing': return '#ef4444';
    default: return '#6b7280';
  }
}

function severityColor(s: string): string {
  switch (s) {
    case 'critical': return '#ef4444';
    case 'warning': return '#f97316';
    case 'info': return '#3b82f6';
    default: return '#6b7280';
  }
}

function priorityIcon(p: string): string {
  switch (p) {
    case 'high': return '🔴';
    case 'medium': return '🟡';
    case 'low': return '🟢';
    default: return '⚪';
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

function MetricBar({ metric, max }: { metric: ComparisonMetric; max: number }) {
  const diff = metric.better === 'higher' ? metric.v2 - metric.v1 : metric.v1 - metric.v2;
  const improved = diff > 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>{metric.icon} {metric.label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: improved ? '#22c55e' : '#ef4444' }}>
          {improved ? '↑' : '↓'} {Math.abs(metric.v2 - metric.v1)}{metric.unit}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ width: 40, fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>v1</div>
        <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 5 }}>
          <div style={{ height: '100%', width: `${(metric.v1 / max) * 100}%`, background: '#ef4444', borderRadius: 5, transition: 'width 0.8s' }} />
        </div>
        <div style={{ width: 36, fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>{metric.v1}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
        <div style={{ width: 40, fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>v3</div>
        <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 5 }}>
          <div style={{ height: '100%', width: `${(metric.v2 / max) * 100}%`, background: '#22c55e', borderRadius: 5, transition: 'width 0.8s' }} />
        </div>
        <div style={{ width: 36, fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>{metric.v2}{metric.unit}</div>
      </div>
    </div>
  );
}

function SectionComparison({ section, index }: { section: { v1: SectionData; v2: SectionData }; index: number }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, marginBottom: 8,
      borderLeft: `3px solid ${statusColor(section.v2.status)}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{section.v1.name}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 12,
            background: `${statusColor(section.v1.status)}15`, color: statusColor(section.v1.status),
          }}>v1: {section.v1.score}</span>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 12,
            background: `${statusColor(section.v2.status)}15`, color: statusColor(section.v2.status),
          }}>v3: {section.v2.score}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
          <div style={{ height: '100%', width: `${section.v1.score}%`, background: '#ef4444', borderRadius: 4 }} />
        </div>
        <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
          <div style={{ height: '100%', width: `${section.v2.score}%`, background: '#22c55e', borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>✅ {section.v2.feedback}</div>
    </div>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
      background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 6,
      borderLeft: `3px solid ${severityColor(issue.severity)}`,
    }}>
      <span style={{
        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
        background: `${severityColor(issue.severity)}20`, color: severityColor(issue.severity),
        textTransform: 'uppercase', minWidth: 52, textAlign: 'center',
      }}>{issue.severity}</span>
      <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 80 }}>{issue.category}</span>
      <span style={{ fontSize: 12, color: '#e2e8f0', flex: 1 }}>{issue.message}</span>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: ImprovementSuggestion }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 16,
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{priorityIcon(suggestion.priority)}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{suggestion.title}</span>
        </div>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 12,
          background: 'rgba(139,92,246,0.15)', color: '#c4b5fd',
        }}>{suggestion.category}</span>
      </div>
      <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 8px 0', lineHeight: 1.5 }}>{suggestion.description}</p>
      <div style={{ fontSize: 11, color: '#22c55e', marginBottom: 6 }}>📈 {suggestion.impact}</div>
      <div style={{
        fontSize: 11, color: '#94a3b8', background: 'rgba(255,255,255,0.04)',
        padding: '8px 12px', borderRadius: 8, fontFamily: 'monospace',
      }}>💡 {suggestion.example}</div>
    </div>
  );
}

/* ─── Score Donut ───────────────────────────────────────────────────── */
function ScoreDonut({ score, size, label }: { score: number; size: number; label: string }) {
  const r = size / 2 - 8;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#e2e8f0" fontSize={size * 0.22} fontWeight={800}>{score}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize={size * 0.09}>{label}</text>
      </svg>
    </div>
  );
}

/* ─── Timeline ──────────────────────────────────────────────────────── */
function VersionTimeline({ versions, selectedIndex, onSelect }: {
  versions: ResumeVersion[]; selectedIndex: number; onSelect: (i: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20, padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
      {versions.map((v, i) => (
        <div key={v.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          <div onClick={() => onSelect(i)} style={{
            width: 40, height: 40, borderRadius: '50%',
            background: i === selectedIndex ? gradeColor(v.overallGrade) : 'rgba(255,255,255,0.08)',
            border: i === selectedIndex ? `3px solid ${gradeColor(v.overallGrade)}` : '2px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.3s', fontWeight: 800, fontSize: 14,
            color: i === selectedIndex ? '#fff' : '#94a3b8',
          }}>{v.overallGrade}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0', marginTop: 6 }}>{v.name}</div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>{v.date}</div>
          <div style={{ fontSize: 10, color: gradeColor(v.overallGrade), fontWeight: 700 }}>ATS: {v.atsScore}%</div>
          {i < versions.length - 1 && (
            <div style={{
              position: 'absolute', top: 20, right: '-50%', width: '100%', height: 2,
              background: 'rgba(255,255,255,0.12)', zIndex: 0,
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────── */
type Tab = 'overview' | 'compare' | 'sections' | 'improvements' | 'history';

export default function ResumeCompareDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedVersion, setSelectedVersion] = useState(2);
  const [compareFrom, setCompareFrom] = useState(0);
  const [compareTo, setCompareTo] = useState(2);

  const currentVersion = RESUME_VERSIONS[selectedVersion];
  const fromVersion = RESUME_VERSIONS[compareFrom];
  const toVersion = RESUME_VERSIONS[compareTo];

  /* ─── Comparison Data ───────────────────────────────────────────── */
  const sectionComparison = useMemo(() => {
    return fromVersion.sections.map((s, i) => ({
      v1: s,
      v2: toVersion.sections[i] || { name: s.name, score: 0, status: 'missing' as const, feedback: 'Section not found', wordCount: 0 },
    }));
  }, [fromVersion, toVersion]);

  const totalScoreDelta = toVersion.atsScore - fromVersion.atsScore;
  const totalIssuesDelta = fromVersion.issues.length - toVersion.issues.length;

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'compare', label: 'Compare', icon: '🔀' },
    { id: 'sections', label: 'Sections', icon: '📋' },
    { id: 'improvements', label: 'Suggestions', icon: '💡' },
    { id: 'history', label: 'Evolution', icon: '📈' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', color: '#e2e8f0', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔀</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Resume Compare Dashboard
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 6 }}>Track your resume improvements across versions and get actionable insights</p>
        </div>

        {/* Version Timeline */}
        <VersionTimeline versions={RESUME_VERSIONS} selectedIndex={selectedVersion} onSelect={setSelectedVersion} />

        {/* KPIs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <KPICard label="Current ATS" value={`${currentVersion.atsScore}%`} subtitle={currentVersion.name} color={gradeColor(currentVersion.overallGrade)} />
          <KPICard label="Grade" value={currentVersion.overallGrade} subtitle={`v${selectedVersion + 1} overall`} color={gradeColor(currentVersion.overallGrade)} />
          <KPICard label="Keywords" value={`${currentVersion.keywordsFound}/${currentVersion.keywordsTotal}`} subtitle="found in job match" color="#3b82f6" />
          <KPICard label="Skills" value={currentVersion.skills.length} subtitle="listed on resume" color="#8b5cf6" />
          <KPICard label="Improvement" value={`+${totalScoreDelta}%`} subtitle="ATS score gain" color="#22c55e" />
          <KPICard label="Issues Fixed" value={totalIssuesDelta} subtitle="resolved from v1" color="#22c55e" />
        </div>

        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: '1 1 0', minWidth: 90, padding: '10px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? 'rgba(59,130,246,0.2)' : 'transparent',
              color: activeTab === tab.id ? '#93c5fd' : '#94a3b8',
              fontWeight: 600, fontSize: 12, transition: 'all 0.2s',
            }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Overview Tab ──────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {/* Score Progress */}
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px 0', color: '#e2e8f0' }}>🎯 ATS Score Evolution</h3>
                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                  {RESUME_VERSIONS.map((v, i) => (
                    <div key={v.id} style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setSelectedVersion(i)}>
                      <ScoreDonut score={v.atsScore} size={100} label={`v${i + 1}`} />
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{v.name}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Quick Stats */}
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px 0', color: '#e2e8f0' }}>📊 Key Metrics (v{selectedVersion + 1})</h3>
                {[
                  { label: 'Word Count', value: currentVersion.wordCount, max: 700 },
                  { label: 'Readability', value: currentVersion.readabilityScore, max: 100 },
                  { label: 'Action Verbs', value: currentVersion.actionVerbCount, max: 20 },
                  { label: 'Quantified Results', value: currentVersion.quantifiedAchievements, max: 10 },
                  { label: 'Keywords Match', value: currentVersion.keywordsFound, max: currentVersion.keywordsTotal },
                ].map(m => (
                  <div key={m.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{m.label}</span>
                      <span style={{ color: '#94a3b8' }}>{m.value}/{m.max}</span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                      <div style={{ height: '100%', width: `${(m.value / m.max) * 100}%`, background: '#3b82f6', borderRadius: 4, transition: 'width 0.6s' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills Comparison */}
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px 0', color: '#e2e8f0' }}>🛠️ Skills Growth: v1 ({RESUME_VERSIONS[0].skills.length}) → v3 ({RESUME_VERSIONS[2].skills.length})</h3>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, marginBottom: 8 }}>v1 Skills</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {RESUME_VERSIONS[0].skills.map(s => (
                      <span key={s} style={{
                        fontSize: 11, padding: '3px 10px', borderRadius: 12,
                        background: RESUME_VERSIONS[2].skills.includes(s) ? '#22c55e15' : '#ef444415',
                        color: RESUME_VERSIONS[2].skills.includes(s) ? '#22c55e' : '#ef4444',
                      }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600, marginBottom: 8 }}>v3 Skills (+{RESUME_VERSIONS[2].skills.length - RESUME_VERSIONS[0].skills.length} new)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {RESUME_VERSIONS[2].skills.map(s => (
                      <span key={s} style={{
                        fontSize: 11, padding: '3px 10px', borderRadius: 12,
                        background: RESUME_VERSIONS[0].skills.includes(s) ? '#3b82f615' : '#8b5cf615',
                        color: RESUME_VERSIONS[0].skills.includes(s) ? '#3b82f6' : '#8b5cf6',
                      }}>{s}{!RESUME_VERSIONS[0].skills.includes(s) ? ' ✨' : ''}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Compare Tab ───────────────────────────────────────── */}
        {activeTab === 'compare' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>Compare:</span>
              <select value={compareFrom} onChange={e => setCompareFrom(Number(e.target.value))} style={{
                padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 13,
              }}>
                {RESUME_VERSIONS.map((v, i) => <option key={v.id} value={i}>{v.name} (v{i + 1})</option>)}
              </select>
              <span style={{ fontSize: 16, color: '#94a3b8' }}>→</span>
              <select value={compareTo} onChange={e => setCompareTo(Number(e.target.value))} style={{
                padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 13,
              }}>
                {RESUME_VERSIONS.map((v, i) => <option key={v.id} value={i}>{v.name} (v{i + 1})</option>)}
              </select>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px 0', color: '#e2e8f0' }}>
                📊 Side-by-Side Comparison
              </h3>
              {COMPARISON_METRICS.map(m => {
                const max = Math.max(m.v1, m.v2) * 1.2 || 1;
                return <MetricBar key={m.label} metric={m} max={max} />;
              })}
            </div>
          </div>
        )}

        {/* ─── Sections Tab ──────────────────────────────────────── */}
        {activeTab === 'sections' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>Comparing:</span>
              <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>{fromVersion.name}</span>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>→</span>
              <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>{toVersion.name}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px 0', color: '#e2e8f0' }}>📋 Section-by-Section Comparison</h3>
              {sectionComparison.map((sc, i) => <SectionComparison key={i} section={sc} index={i} />)}
            </div>
            {/* Issues for selected version */}
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px 0', color: '#e2e8f0' }}>
                ⚠️ Issues in {toVersion.name} ({toVersion.issues.length})
              </h3>
              {toVersion.issues.length === 0 ? (
                <div style={{ fontSize: 13, color: '#22c55e', textAlign: 'center', padding: 20 }}>🎉 No issues found! Resume is in great shape.</div>
              ) : (
                toVersion.issues.map((issue, i) => <IssueRow key={i} issue={issue} />)
              )}
            </div>
          </div>
        )}

        {/* ─── Improvements Tab ──────────────────────────────────── */}
        {activeTab === 'improvements' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: 14 }}>
              {IMPROVEMENT_SUGGESTIONS.map((s, i) => <SuggestionCard key={i} suggestion={s} />)}
            </div>
          </div>
        )}

        {/* ─── History Tab ───────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px 0', color: '#e2e8f0' }}>📈 Resume Evolution Timeline</h3>
              {RESUME_VERSIONS.map((v, i) => (
                <div key={v.id} style={{
                  display: 'flex', gap: 16, padding: '14px 16px', marginBottom: 10,
                  background: i === selectedVersion ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.04)',
                  borderRadius: 10, border: i === selectedVersion ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                  cursor: 'pointer',
                }} onClick={() => setSelectedVersion(i)}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${gradeColor(v.overallGrade)}20`, color: gradeColor(v.overallGrade),
                    fontWeight: 800, fontSize: 20, flexShrink: 0,
                  }}>{v.overallGrade}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{v.name}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>{v.date}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#94a3b8', flexWrap: 'wrap' }}>
                      <span>🎯 ATS: {v.atsScore}%</span>
                      <span>🔑 {v.keywordsFound}/{v.keywordsTotal} keywords</span>
                      <span>🛠️ {v.skills.length} skills</span>
                      <span>💪 {v.actionVerbCount} action verbs</span>
                      <span>📊 {v.quantifiedAchievements} quantified</span>
                      <span>⚠️ {v.issues.length} issues</span>
                    </div>
                  </div>
                  {i > 0 && (
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: '#22c55e',
                      background: '#22c55e15', padding: '4px 10px', borderRadius: 20,
                    }}>+{v.atsScore - RESUME_VERSIONS[i - 1].atsScore}%</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
