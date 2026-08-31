import { useState, useMemo, useCallback } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

type SkillCategory = 'frontend' | 'backend' | 'devops' | 'data' | 'security' | 'soft'
type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'
type DemandLevel = 'low' | 'medium' | 'high' | 'very-high'
type LearningFormat = 'course' | 'book' | 'project' | 'certification' | 'video' | 'article'

interface Skill {
  id: string
  name: string
  category: SkillCategory
  proficiency: ProficiencyLevel
  yearsExp: number
  lastUsed: string
  demand: DemandLevel
  avgSalary: string
  growthRate: number
  relatedSkills: string[]
  description: string
}

interface TargetRole {
  id: string
  title: string
  requiredSkills: string[]
  preferredSkills: string[]
  avgSalary: string
  openPositions: number
  topCompanies: string[]
}

interface LearningResource {
  id: string
  skillName: string
  title: string
  format: LearningFormat
  provider: string
  duration: string
  rating: number
  enrolled: number
  price: string
  url: string
  difficulty: ProficiencyLevel
}

interface SkillAssessment {
  skillId: string
  score: number
  confidence: number
  lastAssessed: string
  questionsAnswered: number
}

interface SkillRoadmap {
  phase: number
  title: string
  skills: string[]
  duration: string
  milestone: string
  completed: boolean
}

interface MarketTrend {
  month: string
  demand: number
  supply: number
  avgSalary: number
}

interface SkillGapCategory {
  category: SkillCategory
  label: string
  icon: string
  color: string
  skills: Skill[]
  avgProficiency: number
  gapScore: number
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PROFICIENCY_MAP: Record<ProficiencyLevel, { value: number; label: string; color: string }> = {
  beginner:     { value: 25, label: 'Beginner',     color: '#ef4444' },
  intermediate: { value: 50, label: 'Intermediate', color: '#f59e0b' },
  advanced:     { value: 75, label: 'Advanced',     color: '#3b82f6' },
  expert:       { value: 100, label: 'Expert',      color: '#10b981' },
}

const DEMAND_MAP: Record<DemandLevel, { label: string; color: string; emoji: string }> = {
  low:      { label: 'Low',      color: '#6b7280', emoji: '📉' },
  medium:   { label: 'Medium',   color: '#f59e0b', emoji: '📊' },
  high:     { label: 'High',     color: '#3b82f6', emoji: '🔥' },
  'very-high': { label: 'Very High', color: '#ef4444', emoji: '🚀' },
}

const CATEGORY_MAP: Record<SkillCategory, { label: string; icon: string; color: string }> = {
  frontend: { label: 'Frontend',  icon: '🎨', color: '#3b82f6' },
  backend:  { label: 'Backend',   icon: '⚙️', color: '#10b981' },
  devops:   { label: 'DevOps',    icon: '🔧', color: '#f59e0b' },
  data:     { label: 'Data',      icon: '📊', color: '#8b5cf6' },
  security: { label: 'Security',  icon: '🛡️', color: '#ef4444' },
  soft:     { label: 'Soft Skills', icon: '🤝', color: '#ec4899' },
}

const FORMAT_MAP: Record<LearningFormat, { label: string; icon: string }> = {
  course:        { label: 'Course',        icon: '🎓' },
  book:          { label: 'Book',          icon: '📚' },
  project:       { label: 'Project',       icon: '🔨' },
  certification: { label: 'Certification', icon: '📜' },
  video:         { label: 'Video',         icon: '🎬' },
  article:       { label: 'Article',       icon: '📝' },
}

// ─── Sample Data ────────────────────────────────────────────────────────────

const SAMPLE_SKILLS: Skill[] = [
  { id: 'react', name: 'React', category: 'frontend', proficiency: 'advanced', yearsExp: 3, lastUsed: '2026-08-01', demand: 'very-high', avgSalary: '$142K', growthRate: 12, relatedSkills: ['TypeScript', 'Next.js', 'Redux'], description: 'Component-based UI library for building interactive web applications' },
  { id: 'typescript', name: 'TypeScript', category: 'frontend', proficiency: 'advanced', yearsExp: 2.5, lastUsed: '2026-08-15', demand: 'very-high', avgSalary: '$148K', growthRate: 18, relatedSkills: ['JavaScript', 'React', 'Node.js'], description: 'Typed superset of JavaScript for scalable applications' },
  { id: 'css', name: 'CSS/Tailwind', category: 'frontend', proficiency: 'advanced', yearsExp: 3, lastUsed: '2026-08-10', demand: 'high', avgSalary: '$128K', growthRate: 5, relatedSkills: ['HTML', 'SASS', 'Figma'], description: 'Styling and layout for responsive web design' },
  { id: 'nextjs', name: 'Next.js', category: 'frontend', proficiency: 'intermediate', yearsExp: 1, lastUsed: '2026-07-20', demand: 'high', avgSalary: '$152K', growthRate: 25, relatedSkills: ['React', 'TypeScript', 'Vercel'], description: 'Full-stack React framework with SSR and API routes' },
  { id: 'nodejs', name: 'Node.js', category: 'backend', proficiency: 'advanced', yearsExp: 3, lastUsed: '2026-08-12', demand: 'very-high', avgSalary: '$145K', growthRate: 10, relatedSkills: ['Express', 'TypeScript', 'PostgreSQL'], description: 'Server-side JavaScript runtime for building APIs' },
  { id: 'python', name: 'Python', category: 'backend', proficiency: 'intermediate', yearsExp: 1.5, lastUsed: '2026-06-15', demand: 'very-high', avgSalary: '$138K', growthRate: 15, relatedSkills: ['Django', 'FastAPI', 'ML'], description: 'Versatile language for web, data, and AI applications' },
  { id: 'postgresql', name: 'PostgreSQL', category: 'backend', proficiency: 'advanced', yearsExp: 2.5, lastUsed: '2026-08-08', demand: 'high', avgSalary: '$135K', growthRate: 8, relatedSkills: ['SQL', 'Redis', 'Prisma'], description: 'Advanced relational database for production workloads' },
  { id: 'docker', name: 'Docker', category: 'devops', proficiency: 'intermediate', yearsExp: 1, lastUsed: '2026-05-20', demand: 'high', avgSalary: '$142K', growthRate: 12, relatedSkills: ['Kubernetes', 'CI/CD', 'AWS'], description: 'Containerization platform for consistent deployments' },
  { id: 'aws', name: 'AWS', category: 'devops', proficiency: 'beginner', yearsExp: 0.5, lastUsed: '2026-03-10', demand: 'very-high', avgSalary: '$155K', growthRate: 20, relatedSkills: ['Lambda', 'S3', 'EC2'], description: 'Cloud computing platform for scalable infrastructure' },
  { id: 'cicd', name: 'CI/CD Pipelines', category: 'devops', proficiency: 'beginner', yearsExp: 0.5, lastUsed: '2026-04-15', demand: 'high', avgSalary: '$138K', growthRate: 14, relatedSkills: ['GitHub Actions', 'Jenkins', 'Docker'], description: 'Automated build, test, and deployment workflows' },
  { id: 'pandas', name: 'Pandas/NumPy', category: 'data', proficiency: 'beginner', yearsExp: 0.5, lastUsed: '2026-02-20', demand: 'high', avgSalary: '$140K', growthRate: 10, relatedSkills: ['Python', 'SQL', 'Jupyter'], description: 'Data manipulation and analysis libraries for Python' },
  { id: 'ml', name: 'Machine Learning', category: 'data', proficiency: 'beginner', yearsExp: 0.3, lastUsed: '2026-01-15', demand: 'very-high', avgSalary: '$165K', growthRate: 30, relatedSkills: ['TensorFlow', 'scikit-learn', 'Python'], description: 'Statistical and neural network approaches for predictive modeling' },
  { id: 'auth', name: 'Auth/Security', category: 'security', proficiency: 'intermediate', yearsExp: 1.5, lastUsed: '2026-07-25', demand: 'high', avgSalary: '$148K', growthRate: 16, relatedSkills: ['OAuth', 'JWT', 'OWASP'], description: 'Authentication, authorization, and security best practices' },
  { id: 'leadership', name: 'Tech Leadership', category: 'soft', proficiency: 'intermediate', yearsExp: 1, lastUsed: '2026-08-05', demand: 'medium', avgSalary: '$175K', growthRate: 8, relatedSkills: ['Mentoring', 'Architecture', 'Agile'], description: 'Leading technical teams, architecture decisions, and mentoring' },
  { id: 'system-design', name: 'System Design', category: 'soft', proficiency: 'intermediate', yearsExp: 1.5, lastUsed: '2026-07-30', demand: 'high', avgSalary: '$165K', growthRate: 12, relatedSkills: ['Architecture', 'Scalability', 'Microservices'], description: 'Designing scalable, distributed systems and architectures' },
  { id: 'communication', name: 'Technical Writing', category: 'soft', proficiency: 'advanced', yearsExp: 2, lastUsed: '2026-08-14', demand: 'medium', avgSalary: '$125K', growthRate: 6, relatedSkills: ['Documentation', 'Presenting', 'Blogging'], description: 'Clear technical communication and documentation skills' },
]

const SAMPLE_TARGET_ROLES: TargetRole[] = [
  { id: 'senior-frontend', title: 'Senior Frontend Engineer', requiredSkills: ['React', 'TypeScript', 'CSS/Tailwind', 'Next.js'], preferredSkills: ['Testing', 'Performance', 'Accessibility'], avgSalary: '$155K', openPositions: 2340, topCompanies: ['Google', 'Meta', 'Stripe', 'Vercel'] },
  { id: 'fullstack', title: 'Full-Stack Developer', requiredSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'], preferredSkills: ['AWS', 'Docker', 'GraphQL'], avgSalary: '$148K', openPositions: 3120, topCompanies: ['Netflix', 'Shopify', 'Airbnb', 'Uber'] },
  { id: 'tech-lead', title: 'Tech Lead', requiredSkills: ['React', 'Node.js', 'System Design', 'Tech Leadership'], preferredSkills: ['AWS', 'CI/CD', 'PostgreSQL'], avgSalary: '$185K', openPositions: 890, topCompanies: ['Microsoft', 'Amazon', 'Apple', 'Salesforce'] },
  { id: 'ml-engineer', title: 'ML Engineer', requiredSkills: ['Python', 'Machine Learning', 'AWS', 'Docker'], preferredSkills: ['TensorFlow', 'PostgreSQL', 'CI/CD'], avgSalary: '$175K', openPositions: 1560, topCompanies: ['OpenAI', 'DeepMind', 'Tesla', 'Nvidia'] },
]

const SAMPLE_RESOURCES: LearningResource[] = [
  { id: 'r1', skillName: 'AWS', title: 'AWS Solutions Architect Associate', format: 'certification', provider: 'AWS', duration: '3 months', rating: 4.8, enrolled: 45200, price: '$300', url: '#', difficulty: 'intermediate' },
  { id: 'r2', skillName: 'Docker', title: 'Docker & Kubernetes: The Practical Guide', format: 'course', provider: 'Udemy (Schwarzmüller)', duration: '24 hours', rating: 4.7, enrolled: 128000, price: '$15', url: '#', difficulty: 'intermediate' },
  { id: 'r3', skillName: 'Machine Learning', title: 'Machine Learning Specialization', format: 'course', provider: 'Coursera (Andrew Ng)', duration: '3 months', rating: 4.9, enrolled: 890000, price: '$49/mo', url: '#', difficulty: 'beginner' },
  { id: 'r4', skillName: 'System Design', title: 'System Design Interview', format: 'book', provider: 'Alex Xu', duration: '40 hours', rating: 4.7, enrolled: 32000, price: '$35', url: '#', difficulty: 'intermediate' },
  { id: 'r5', skillName: 'Next.js', title: 'Next.js 15 Full Course', format: 'video', provider: 'YouTube (Fireship)', duration: '3 hours', rating: 4.8, enrolled: 210000, price: 'Free', url: '#', difficulty: 'intermediate' },
  { id: 'r6', skillName: 'CI/CD', title: 'GitHub Actions Masterclass', format: 'course', provider: 'Frontend Masters', duration: '4 hours', rating: 4.6, enrolled: 18500, price: '$39/mo', url: '#', difficulty: 'beginner' },
  { id: 'r7', skillName: 'Python', title: 'Python for Data Science Handbook', format: 'book', provider: 'Jake VanderPlas', duration: '60 hours', rating: 4.5, enrolled: 24000, price: 'Free', url: '#', difficulty: 'intermediate' },
  { id: 'r8', skillName: 'Auth/Security', title: 'OWASP Top 10 Security', format: 'article', provider: 'OWASP Foundation', duration: '2 hours', rating: 4.4, enrolled: 67000, price: 'Free', url: '#', difficulty: 'intermediate' },
  { id: 'r9', skillName: 'Pandas/NumPy', title: 'Data Analysis with Python', format: 'course', provider: 'freeCodeCamp', duration: '15 hours', rating: 4.6, enrolled: 156000, price: 'Free', url: '#', difficulty: 'beginner' },
  { id: 'r10', skillName: 'Tech Leadership', title: 'Engineering Manager Bootcamp', format: 'course', provider: 'LeadDev', duration: '8 hours', rating: 4.8, enrolled: 8200, price: '$199', url: '#', difficulty: 'advanced' },
]

const SAMPLE_ROADMAP: SkillRoadmap[] = [
  { phase: 1, title: 'Cloud Foundations', skills: ['AWS', 'Docker', 'CI/CD Pipelines'], duration: '6 weeks', milestone: 'Deploy a full-stack app to AWS with CI/CD', completed: false },
  { phase: 2, title: 'Full-Stack Depth', skills: ['Next.js', 'PostgreSQL'], duration: '4 weeks', milestone: 'Build and deploy a Next.js app with database', completed: false },
  { phase: 3, title: 'Data & ML Intro', skills: ['Python', 'Pandas/NumPy', 'Machine Learning'], duration: '8 weeks', milestone: 'Build an ML-powered feature for your portfolio project', completed: false },
  { phase: 4, title: 'Leadership & Design', skills: ['System Design', 'Tech Leadership'], duration: '4 weeks', milestone: 'Complete 3 mock system design interviews', completed: false },
]

const SAMPLE_MARKET_TRENDS: MarketTrend[] = [
  { month: 'Mar', demand: 78, supply: 62, avgSalary: 142000 },
  { month: 'Apr', demand: 82, supply: 65, avgSalary: 144000 },
  { month: 'May', demand: 85, supply: 63, avgSalary: 146000 },
  { month: 'Jun', demand: 88, supply: 67, avgSalary: 148000 },
  { month: 'Jul', demand: 91, supply: 69, avgSalary: 150000 },
  { month: 'Aug', demand: 94, supply: 71, avgSalary: 152000 },
]

// ─── Utility Functions ──────────────────────────────────────────────────────

function getProficiencyValue(level: ProficiencyLevel): number {
  return PROFICIENCY_MAP[level].value
}

function proficiencyFromYears(years: number): ProficiencyLevel {
  if (years >= 4) return 'expert'
  if (years >= 2) return 'advanced'
  if (years >= 1) return 'intermediate'
  return 'beginner'
}

function calculateOverallScore(skills: Skill[]): number {
  if (skills.length === 0) return 0
  const total = skills.reduce((sum, s) => sum + getProficiencyValue(s.proficiency), 0)
  return Math.round(total / skills.length)
}

function calculateGapScore(skill: Skill, targetProficiency: ProficiencyLevel): number {
  const current = getProficiencyValue(skill.proficiency)
  const target = getProficiencyValue(targetProficiency)
  return Math.max(0, target - current)
}

function getDaysSince(dateStr: string): number {
  const now = new Date('2026-08-30')
  const date = new Date(dateStr)
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

// ─── Radar Chart Component ──────────────────────────────────────────────────

function RadarChart({ skills, size = 280, showLabels = true }: { skills: Skill[]; size?: number; showLabels?: boolean }) {
  const center = size / 2
  const maxRadius = (size / 2) - 40
  const angleStep = (2 * Math.PI) / skills.length
  const levels = [25, 50, 75, 100]

  const getPoint = useCallback((index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2
    const r = (value / 100) * maxRadius
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) }
  }, [angleStep, maxRadius, center])

  const polygonPoints = skills.map((s, i) => {
    const p = getPoint(i, getProficiencyValue(s.proficiency))
    return `${p.x},${p.y}`
  }).join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid levels */}
      {levels.map((level) => {
        const pts = skills.map((_, i) => {
          const p = getPoint(i, level)
          return `${p.x},${p.y}`
        }).join(' ')
        return <polygon key={level} points={pts} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      })}

      {/* Axis lines */}
      {skills.map((_, i) => {
        const p = getPoint(i, 100)
        return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      })}

      {/* Skill polygon */}
      <polygon points={polygonPoints} fill="rgba(59,130,246,0.2)" stroke="#3b82f6" strokeWidth="2" />

      {/* Data points */}
      {skills.map((s, i) => {
        const p = getPoint(i, getProficiencyValue(s.proficiency))
        const color = PROFICIENCY_MAP[s.proficiency].color
        return (
          <g key={s.id}>
            <circle cx={p.x} cy={p.y} r="5" fill={color} stroke="#fff" strokeWidth="2" />
            {showLabels && (
              <text x={p.x} y={p.y - 12} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">
                {s.name}
              </text>
            )}
          </g>
        )
      })}

      {/* Level labels */}
      {levels.map((level) => {
        const p = getPoint(0, level)
        return (
          <text key={level} x={p.x + 4} y={p.y - 4} fill="rgba(148,163,184,0.5)" fontSize="8">
            {level}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Bar Chart Component ────────────────────────────────────────────────────

function HorizontalBarChart({ data, maxValue }: { data: { label: string; value: number; color: string; target?: number }[]; maxValue: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '100px', fontSize: '12px', color: '#94a3b8', textAlign: 'right' }}>{item.label}</span>
          <div style={{ flex: 1, height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: '100%', width: `${(item.value / maxValue) * 100}%`, background: item.color, borderRadius: '10px', transition: 'width 0.5s ease' }} />
            {item.target !== undefined && (
              <div style={{ position: 'absolute', top: 0, left: `${(item.target / maxValue) * 100}%`, height: '100%', width: '2px', background: '#fff' }} />
            )}
          </div>
          <span style={{ width: '35px', fontSize: '12px', color: '#e2e8f0', fontWeight: '600' }}>{item.value}%</span>
        </div>
      ))}
    </div>
  )
}

// ─── Line Chart Component ───────────────────────────────────────────────────

function TrendLineChart({ trends, width = 400, height = 200 }: { trends: MarketTrend[]; width?: number; height?: number }) {
  const padding = 40
  const chartW = width - padding * 2
  const chartH = height - padding * 2

  const maxVal = Math.max(...trends.map(t => Math.max(t.demand, t.supply)))
  const minSalary = Math.min(...trends.map(t => t.avgSalary))
  const maxSalary = Math.max(...trends.map(t => t.avgSalary))

  const getX = (i: number) => padding + (i / (trends.length - 1)) * chartW
  const getY = (val: number) => padding + chartH - (val / maxVal) * chartH

  const demandPath = trends.map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(t.demand)}`).join(' ')
  const supplyPath = trends.map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(t.supply)}`).join(' ')

  return (
    <svg width={width} height={height}>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line x1={padding} y1={getY(v)} x2={width - padding} y2={getY(v)} stroke="rgba(255,255,255,0.05)" />
          <text x={padding - 5} y={getY(v) + 4} textAnchor="end" fill="rgba(148,163,184,0.5)" fontSize="9">{v}</text>
        </g>
      ))}

      {/* X axis labels */}
      {trends.map((t, i) => (
        <text key={i} x={getX(i)} y={height - 10} textAnchor="middle" fill="rgba(148,163,184,0.5)" fontSize="10">{t.month}</text>
      ))}

      {/* Demand line */}
      <path d={demandPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {trends.map((t, i) => (
        <circle key={`d${i}`} cx={getX(i)} cy={getY(t.demand)} r="4" fill="#3b82f6" stroke="#0f172a" strokeWidth="2" />
      ))}

      {/* Supply line */}
      <path d={supplyPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6,3" />
      {trends.map((t, i) => (
        <circle key={`s${i}`} cx={getX(i)} cy={getY(t.supply)} r="4" fill="#10b981" stroke="#0f172a" strokeWidth="2" />
      ))}

      {/* Legend */}
      <circle cx={padding + 10} cy={15} r="4" fill="#3b82f6" />
      <text x={padding + 20} y={19} fill="#94a3b8" fontSize="10">Demand</text>
      <circle cx={padding + 90} cy={15} r="4" fill="#10b981" />
      <text x={padding + 100} y={19} fill="#94a3b8" fontSize="10">Supply</text>
    </svg>
  )
}

// ─── Donut Chart Component ──────────────────────────────────────────────────

function DonutChart({ value, size = 100, color, label }: { value: number; size?: number; color: string; label: string }) {
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashoffset = circumference - (value / 100) * circumference

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={dashoffset}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fill="#e2e8f0" fontSize="20" fontWeight="700">{value}</text>
        <text x={size / 2} y={size / 2 + 12} textAnchor="middle" fill="#94a3b8" fontSize="9">/100</text>
      </svg>
      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{label}</div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function SkillGapAnalyzer() {
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'gap' | 'learning' | 'roadmap' | 'market'>('overview')
  const [selectedRole, setSelectedRole] = useState<TargetRole>(SAMPLE_TARGET_ROLES[1])
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | 'all'>('all')
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'proficiency' | 'demand' | 'gap'>('proficiency')

  const skills = useMemo(() => SAMPLE_SKILLS, [])

  const categories = useMemo(() => {
    const map = new Map<SkillCategory, Skill[]>()
    skills.forEach(s => {
      const list = map.get(s.category) || []
      list.push(s)
      map.set(s.category, list)
    })
    return Array.from(map.entries()).map(([cat, catSkills]) => ({
      category: cat,
      label: CATEGORY_MAP[cat].label,
      icon: CATEGORY_MAP[cat].icon,
      color: CATEGORY_MAP[cat].color,
      skills: catSkills,
      avgProficiency: Math.round(catSkills.reduce((sum, s) => sum + getProficiencyValue(s.proficiency), 0) / catSkills.length),
      gapScore: Math.round(catSkills.reduce((sum, s) => sum + calculateGapScore(s, 'advanced'), 0) / catSkills.length),
    }))
  }, [skills])

  const overallScore = useMemo(() => calculateOverallScore(skills), [skills])

  const filteredSkills = useMemo(() => {
    let filtered = skills
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(s => s.category === selectedCategory)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
    }
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name)
        case 'proficiency': return getProficiencyValue(b.proficiency) - getProficiencyValue(a.proficiency)
        case 'demand': return DEMAND_MAP[b.demand].label.localeCompare(DEMAND_MAP[a.demand].label)
        case 'gap': return calculateGapScore(b, 'advanced') - calculateGapScore(a, 'advanced')
        default: return 0
      }
    })
  }, [skills, selectedCategory, searchQuery, sortBy])

  const gapSkills = useMemo(() => {
    const required = selectedRole.requiredSkills
    const preferred = selectedRole.preferredSkills
    const all = [...required, ...preferred]
    return all.map(name => {
      const existing = skills.find(s => s.name === name)
      const gap = existing ? calculateGapScore(existing, 'advanced') : 75
      return { name, existing, gap, isRequired: required.includes(name) }
    }).sort((a, b) => b.gap - a.gap)
  }, [selectedRole, skills])

  const radarSkills = useMemo(() => {
    return selectedRole.requiredSkills.map(name => {
      const found = skills.find(s => s.name === name)
      return found || { id: name.toLowerCase(), name, category: 'frontend' as SkillCategory, proficiency: 'beginner' as ProficiencyLevel, yearsExp: 0, lastUsed: '2025-01-01', demand: 'medium' as DemandLevel, avgSalary: '$120K', growthRate: 0, relatedSkills: [], description: '' }
    })
  }, [selectedRole, skills])

  const matchedCount = selectedRole.requiredSkills.filter(r => skills.some(s => s.name === r && getProficiencyValue(s.proficiency) >= 50)).length
  const matchPercent = Math.round((matchedCount / selectedRole.requiredSkills.length) * 100)

  // ─── Tab Navigation ─────────────────────────────────────────────────────

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'skills' as const, label: 'My Skills', icon: '🛠️' },
    { id: 'gap' as const, label: 'Gap Analysis', icon: '🎯' },
    { id: 'learning' as const, label: 'Learning', icon: '📚' },
    { id: 'roadmap' as const, label: 'Roadmap', icon: '🗺️' },
    { id: 'market' as const, label: 'Market', icon: '📈' },
  ]

  // ─── Styles ─────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '20px',
    backdropFilter: 'blur(12px)',
  }

  const statCardStyle: React.CSSProperties = {
    ...cardStyle,
    textAlign: 'center',
    padding: '16px',
  }

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

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🎯 Skill Gap Analyzer
        </h1>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>Analyze your skills against target roles and build a personalized growth plan</p>
      </div>

      {/* Role Selector */}
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>Target Role:</span>
          {SAMPLE_TARGET_ROLES.map(role => (
            <button key={role.id} style={btnStyle(selectedRole.id === role.id)} onClick={() => setSelectedRole(role)}>
              {role.title}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '24px', marginTop: '12px', fontSize: '12px', color: '#94a3b8' }}>
          <span>💰 Avg: <strong style={{ color: '#10b981' }}>{selectedRole.avgSalary}</strong></span>
          <span>📋 Open: <strong style={{ color: '#3b82f6' }}>{selectedRole.openPositions.toLocaleString()}</strong></span>
          <span>🏢 Top: <strong style={{ color: '#e2e8f0' }}>{selectedRole.topCompanies.join(', ')}</strong></span>
          <span>🎯 Match: <strong style={{ color: matchPercent >= 70 ? '#10b981' : matchPercent >= 40 ? '#f59e0b' : '#ef4444' }}>{matchPercent}%</strong></span>
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

      {/* ═══ OVERVIEW TAB ═══ */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {/* Overall Score */}
          <div style={{ ...statCardStyle, gridColumn: 'span 1' }}>
            <DonutChart value={overallScore} color="#3b82f6" label="Overall Score" />
          </div>

          {/* Match Score */}
          <div style={{ ...statCardStyle }}>
            <DonutChart value={matchPercent} color={matchPercent >= 70 ? '#10b981' : '#f59e0b'} label="Role Match" />
          </div>

          {/* Category Breakdown */}
          {categories.map(cat => (
            <div key={cat.category} style={statCardStyle}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>{cat.icon}</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: cat.color }}>{cat.avgProficiency}%</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{cat.label}</div>
              <div style={{ fontSize: '11px', color: cat.gapScore > 30 ? '#ef4444' : '#10b981', marginTop: '4px' }}>
                Gap: {cat.gapScore > 30 ? '🔴' : '🟢'} {cat.gapScore}pts
              </div>
            </div>
          ))}

          {/* Radar Chart */}
          <div style={{ ...cardStyle, gridColumn: 'span 2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#e2e8f0' }}>🎯 Role Skill Radar</h3>
            <RadarChart skills={radarSkills} size={300} />
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '11px' }}>
              {Object.entries(PROFICIENCY_MAP).map(([key, val]) => (
                <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: val.color }} />
                  {val.label}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ ...cardStyle, gridColumn: 'span 1' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#e2e8f0' }}>⚡ Quick Stats</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>Total Skills</span>
                <span style={{ fontWeight: '700' }}>{skills.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>Expert Level</span>
                <span style={{ fontWeight: '700', color: '#10b981' }}>{skills.filter(s => s.proficiency === 'expert').length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>Needs Work</span>
                <span style={{ fontWeight: '700', color: '#ef4444' }}>{skills.filter(s => s.proficiency === 'beginner').length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>Avg Years Exp</span>
                <span style={{ fontWeight: '700' }}>{(skills.reduce((sum, s) => sum + s.yearsExp, 0) / skills.length).toFixed(1)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>High Demand</span>
                <span style={{ fontWeight: '700', color: '#f59e0b' }}>{skills.filter(s => s.demand === 'very-high').length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>Matched Skills</span>
                <span style={{ fontWeight: '700', color: '#3b82f6' }}>{matchedCount}/{selectedRole.requiredSkills.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SKILLS TAB ═══ */}
      {activeTab === 'skills' && (
        <div>
          {/* Search & Filter */}
          <div style={{ ...cardStyle, marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="🔍 Search skills..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '13px', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              <button style={btnStyle(selectedCategory === 'all')} onClick={() => setSelectedCategory('all')}>All</button>
              {(Object.keys(CATEGORY_MAP) as SkillCategory[]).map(cat => (
                <button key={cat} style={btnStyle(selectedCategory === cat)} onClick={() => setSelectedCategory(cat)}>
                  {CATEGORY_MAP[cat].icon} {CATEGORY_MAP[cat].label}
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '12px' }}
            >
              <option value="proficiency">Sort: Proficiency</option>
              <option value="name">Sort: Name</option>
              <option value="demand">Sort: Demand</option>
              <option value="gap">Sort: Gap Size</option>
            </select>
          </div>

          {/* Skills Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {filteredSkills.map(skill => {
              const profVal = getProficiencyValue(skill.proficiency)
              const prof = PROFICIENCY_MAP[skill.proficiency]
              const demand = DEMAND_MAP[skill.demand]
              const cat = CATEGORY_MAP[skill.category]
              const daysSince = getDaysSince(skill.lastUsed)
              const isStale = daysSince > 90

              return (
                <div
                  key={skill.id}
                  onClick={() => setSelectedSkill(selectedSkill?.id === skill.id ? null : skill)}
                  style={{
                    ...cardStyle,
                    cursor: 'pointer',
                    border: selectedSkill?.id === skill.id ? `1px solid ${prof.color}40` : '1px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{cat.icon}</span>
                        <span style={{ fontWeight: '700', fontSize: '15px' }}>{skill.name}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{skill.description}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '12px', background: `${demand.color}20`, color: demand.color, fontSize: '10px', fontWeight: '600' }}>
                        {demand.emoji} {demand.label}
                      </span>
                      {isStale && <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#ef444420', color: '#ef4444', fontSize: '10px', fontWeight: '600' }}>⚠️ Stale</span>}
                    </div>
                  </div>

                  {/* Proficiency Bar */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                      <span style={{ color: '#94a3b8' }}>{prof.label}</span>
                      <span style={{ color: prof.color, fontWeight: '700' }}>{profVal}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${profVal}%`, background: prof.color, borderRadius: '3px', transition: 'width 0.5s' }} />
                    </div>
                  </div>

                  {/* Info Row */}
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#94a3b8', flexWrap: 'wrap' }}>
                    <span>📅 {skill.yearsExp}y exp</span>
                    <span>💰 {skill.avgSalary}</span>
                    <span>📈 +{skill.growthRate}%</span>
                    <span>🔄 {daysSince}d ago</span>
                  </div>

                  {/* Related Skills */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {skill.relatedSkills.map(rs => (
                      <span key={rs} style={{ padding: '2px 8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', fontSize: '10px', color: '#94a3b8' }}>{rs}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ GAP ANALYSIS TAB ═══ */}
      {activeTab === 'gap' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Gap Overview */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>🎯 Gap Analysis: {selectedRole.title}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {gapSkills.map(item => {
                const existing = item.existing
                const currentVal = existing ? getProficiencyValue(existing.proficiency) : 0
                const catInfo = existing ? CATEGORY_MAP[existing.category] : { icon: '❓', color: '#6b7280' }

                return (
                  <div key={item.name} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${item.gap > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{catInfo.icon}</span>
                        <span style={{ fontWeight: '600', fontSize: '13px' }}>{item.name}</span>
                        <span style={{ padding: '1px 6px', borderRadius: '6px', background: item.isRequired ? 'rgba(239,68,68,0.15)' : 'rgba(139,92,246,0.15)', color: item.isRequired ? '#ef4444' : '#8b5cf6', fontSize: '9px', fontWeight: '600' }}>
                          {item.isRequired ? 'Required' : 'Preferred'}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: item.gap > 0 ? '#ef4444' : '#10b981' }}>
                        {item.gap > 0 ? `Gap: ${item.gap}pts` : '✅ Met'}
                      </span>
                    </div>
                    {/* Dual bar: current vs target */}
                    <div style={{ position: 'relative', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', height: '100%', width: `${currentVal}%`, background: existing ? PROFICIENCY_MAP[existing.proficiency].color : '#6b7280', borderRadius: '6px' }} />
                      <div style={{ position: 'absolute', left: '75%', height: '100%', width: '2px', background: '#fff', opacity: 0.5 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                      <span>Current: {currentVal}%</span>
                      <span>Target: 75%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Category Gap Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>📊 Category Proficiency</h3>
              <HorizontalBarChart
                data={categories.map(c => ({
                  label: `${c.icon} ${c.label}`,
                  value: c.avgProficiency,
                  color: c.color,
                  target: 75,
                }))}
                maxValue={100}
              />
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '2px', background: '#fff', opacity: 0.5 }} /> White line = target (75%)
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>🔥 Skill Demand Heatmap</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {skills.map(skill => {
                  const demand = DEMAND_MAP[skill.demand]
                  const prof = PROFICIENCY_MAP[skill.proficiency]
                  return (
                    <div key={skill.id} style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: `${demand.color}15`,
                      border: `1px solid ${demand.color}30`,
                      textAlign: 'center',
                      fontSize: '11px',
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>{skill.name}</div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                        <span style={{ color: demand.color, fontSize: '10px' }}>{demand.emoji}</span>
                        <span style={{ color: prof.color, fontWeight: '700' }}>{prof.value}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>💡 Gap Insights</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { icon: '🚨', text: `Critical gap in ${gapSkills.filter(g => g.gap >= 50).length} required skills — prioritize immediately`, color: '#ef4444' },
                  { icon: '⏰', text: `${skills.filter(s => getDaysSince(s.lastUsed) > 90).length} skills are stale (not used in 90+ days) — refresh or drop`, color: '#f59e0b' },
                  { icon: '🎯', text: `${matchPercent}% role match — ${matchPercent < 70 ? 'need focused learning' : 'close to target!'}`, color: matchPercent >= 70 ? '#10b981' : '#f59e0b' },
                  { icon: '💰', text: `Your top-paying skills: ${skills.sort((a, b) => parseInt(b.avgSalary.replace(/\D/g, '')) - parseInt(a.avgSalary.replace(/\D/g, ''))).slice(0, 3).map(s => s.name).join(', ')}`, color: '#3b82f6' },
                ].map((insight, i) => (
                  <div key={i} style={{ padding: '10px', borderRadius: '8px', background: `${insight.color}10`, border: `1px solid ${insight.color}20`, fontSize: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span>{insight.icon}</span>
                    <span style={{ color: insight.color }}>{insight.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ LEARNING TAB ═══ */}
      {activeTab === 'learning' && (
        <div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {Object.entries(FORMAT_MAP).map(([key, val]) => {
              const count = SAMPLE_RESOURCES.filter(r => r.format === key).length
              return (
                <button key={key} style={btnStyle(true)}>
                  {val.icon} {val.label} ({count})
                </button>
              )
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {SAMPLE_RESOURCES.map(resource => {
              const format = FORMAT_MAP[resource.format]
              const diff = PROFICIENCY_MAP[resource.difficulty]

              return (
                <div key={resource.id} style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                        {format.icon} {format.label} • {resource.provider}
                      </div>
                      <div style={{ fontWeight: '700', fontSize: '14px' }}>{resource.title}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        Skill: <strong style={{ color: '#3b82f6' }}>{resource.skillName}</strong>
                      </div>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: '8px', background: `${diff.color}20`, color: diff.color, fontSize: '11px', fontWeight: '600' }}>
                      {diff.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>
                    <span>⏱️ {resource.duration}</span>
                    <span>⭐ {resource.rating}</span>
                    <span>👥 {(resource.enrolled / 1000).toFixed(0)}K enrolled</span>
                    <span style={{ color: resource.price === 'Free' ? '#10b981' : '#e2e8f0', fontWeight: '600' }}>{resource.price}</span>
                  </div>

                  {/* Gap indicator */}
                  <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(59,130,246,0.08)', fontSize: '11px', color: '#94a3b8', marginTop: 'auto' }}>
                    📌 Closes gap for <strong style={{ color: '#3b82f6' }}>{resource.skillName}</strong>
                    {skills.find(s => s.name === resource.skillName) &&
                      ` (${PROFICIENCY_MAP[skills.find(s => s.name === resource.skillName)!.proficiency].label} → Advanced)`
                    }
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ ROADMAP TAB ═══ */}
      {activeTab === 'roadmap' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Roadmap */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px' }}>🗺️ Personalized Learning Roadmap</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {SAMPLE_ROADMAP.map((phase, i) => (
                <div key={i} style={{ display: 'flex', gap: '16px' }}>
                  {/* Timeline line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '32px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: phase.completed ? '#10b981' : i === 0 ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: '700', color: '#fff',
                      border: i === 0 ? '2px solid #3b82f6' : '2px solid rgba(255,255,255,0.1)',
                    }}>
                      {phase.completed ? '✓' : i + 1}
                    </div>
                    {i < SAMPLE_ROADMAP.length - 1 && (
                      <div style={{ width: '2px', flex: 1, background: 'rgba(255,255,255,0.1)', minHeight: '20px' }} />
                    )}
                  </div>

                  {/* Phase content */}
                  <div style={{ flex: 1, paddingBottom: '24px' }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>{phase.title}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>⏱️ {phase.duration}</div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {phase.skills.map(skill => (
                        <span key={skill} style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontSize: '11px', fontWeight: '600' }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                    <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', fontSize: '11px', color: '#10b981' }}>
                      🏆 Milestone: {phase.milestone}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estimated Impact */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>📈 Projected Impact</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Role Match', before: matchPercent, after: 95, icon: '🎯' },
                  { label: 'Overall Score', before: overallScore, after: 88, icon: '📊' },
                  { label: 'Salary Potential', before: 142, after: 172, icon: '💰', suffix: 'K' },
                  { label: 'Market Demand', before: 65, after: 90, icon: '🔥', suffix: '%' },
                ].map((item, i) => (
                  <div key={i} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{item.icon}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>{item.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#94a3b8' }}>{item.before}{item.suffix || '%'}</span>
                      <span style={{ color: '#10b981' }}>→</span>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>{item.after}{item.suffix || '%'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>⏱️ Timeline Overview</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {SAMPLE_ROADMAP.map((phase, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '20px', textAlign: 'center', fontSize: '14px', fontWeight: '700', color: i === 0 ? '#3b82f6' : '#94a3b8' }}>
                      P{i + 1}
                    </span>
                    <div style={{ flex: 1, height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        height: '100%',
                        width: `${(parseInt(phase.duration) / 22) * 100}%`,
                        background: `linear-gradient(90deg, ${i === 0 ? '#3b82f6' : '#8b5cf6'}, ${i === 0 ? '#60a5fa' : '#a78bfa'})`,
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '8px',
                        fontSize: '10px',
                        fontWeight: '600',
                        color: '#fff',
                      }}>
                        {phase.duration}
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '4px' }}>
                  Total: ~22 weeks ({Math.round(22 / 4.3)} months)
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>🏁 Weekly Study Plan</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>{day}</div>
                    <div style={{
                      padding: '8px 4px',
                      borderRadius: '8px',
                      background: day === 'Sat' || day === 'Sun' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                      fontSize: '10px',
                      color: day === 'Sat' || day === 'Sun' ? '#10b981' : '#3b82f6',
                      fontWeight: '600',
                    }}>
                      {day === 'Sat' ? '🔨 Project' : day === 'Sun' ? '📝 Review' : '📖 Theory'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MARKET TAB ═══ */}
      {activeTab === 'market' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          {/* Demand vs Supply Chart */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>📈 Market Demand vs Supply (6 months)</h3>
            <TrendLineChart trends={SAMPLE_MARKET_TRENDS} width={560} height={240} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
              {[
                { label: 'Avg Salary Trend', value: '$152K', change: '+7.0%', positive: true },
                { label: 'Demand Index', value: '94', change: '+20.5%', positive: true },
                { label: 'Supply Gap', value: '23pts', change: 'Widening', positive: false },
              ].map((stat, i) => (
                <div key={i} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{stat.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', margin: '4px 0' }}>{stat.value}</div>
                  <div style={{ fontSize: '11px', color: stat.positive ? '#10b981' : '#ef4444' }}>{stat.change}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Skills Market Value */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px' }}>💰 Top Skills by Salary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {skills.sort((a, b) => parseInt(b.avgSalary.replace(/\D/g, '')) - parseInt(a.avgSalary.replace(/\D/g, ''))).slice(0, 8).map((skill, i) => (
                  <div key={skill.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ width: '18px', textAlign: 'center', fontWeight: '700', color: i < 3 ? '#f59e0b' : '#94a3b8' }}>#{i + 1}</span>
                    <span style={{ flex: 1 }}>{skill.name}</span>
                    <span style={{ fontWeight: '700', color: '#10b981' }}>{skill.avgSalary}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px' }}>🚀 Fastest Growing Skills</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {skills.sort((a, b) => b.growthRate - a.growthRate).slice(0, 6).map((skill, i) => (
                  <div key={skill.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ width: '18px', textAlign: 'center', fontWeight: '700', color: '#10b981' }}>↑</span>
                    <span style={{ flex: 1 }}>{skill.name}</span>
                    <span style={{ fontWeight: '700', color: '#10b981' }}>+{skill.growthRate}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px' }}>🏢 Companies Hiring</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedRole.topCompanies.map(company => (
                  <div key={company} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', fontSize: '12px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                    <span>{company}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SkillGapAnalyzer
