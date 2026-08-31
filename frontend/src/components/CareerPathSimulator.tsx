import { useState, useMemo, useCallback } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

type CareerLevel = 'junior' | 'mid' | 'senior' | 'staff' | 'principal' | 'director' | 'vp' | 'cto'
type IndustryType = 'tech' | 'finance' | 'healthcare' | 'ecommerce' | 'startup' | 'consulting'
type SkillGapSeverity = 'critical' | 'major' | 'minor' | 'none'
type ProjectionPeriod = '1yr' | '3yr' | '5yr' | '10yr'

interface CareerRole {
  id: string
  title: string
  level: CareerLevel
  industry: IndustryType
  minSalary: number
  maxSalary: number
  avgSalary: number
  equity: string
  bonus: string
  requiredSkills: string[]
  preferredSkills: string[]
  yearsExperience: string
  description: string
  responsibilities: string[]
  growthOutlook: number // 0-100
  demandScore: number // 0-100
  satisfaction: number // 0-100
  workLifeBalance: number // 0-100
}

interface SalaryProjection {
  year: number
  role: string
  base: number
  totalComp: number
  equity: number
  bonus: number
  cumulativeEarnings: number
}

interface SkillGap {
  skill: string
  currentLevel: number
  requiredLevel: number
  gap: number
  severity: SkillGapSeverity
  estimatedTime: string
  resources: string[]
}

interface CareerMilestone {
  id: string
  title: string
  description: string
  timeframe: string
  requiredSkills: string[]
  salaryImpact: number
  completed: boolean
}

interface IndustryInsight {
  industry: IndustryType
  label: string
  icon: string
  color: string
  avgSalary: number
  growth: number
  openings: number
  topCompanies: string[]
}

interface NegotiationTip {
  category: string
  icon: string
  tips: string[]
  salaryImpact: string
  priority: 'high' | 'medium' | 'low'
}

// ─── Constants ──────────────────────────────────────────────────────────────

const LEVEL_MAP: Record<CareerLevel, { label: string; color: string; years: string }> = {
  junior:    { label: 'Junior',    color: '#10b981', years: '0-2 years' },
  mid:       { label: 'Mid-Level', color: '#3b82f6', years: '2-5 years' },
  senior:    { label: 'Senior',    color: '#8b5cf6', years: '5-8 years' },
  staff:     { label: 'Staff',     color: '#f59e0b', years: '8-12 years' },
  principal: { label: 'Principal', color: '#ef4444', years: '12+ years' },
  director:  { label: 'Director',  color: '#ec4899', years: '10+ years' },
  vp:        { label: 'VP Eng',    color: '#f97316', years: '15+ years' },
  cto:       { label: 'CTO',       color: '#dc2626', years: '15+ years' },
}

const INDUSTRY_MAP: Record<IndustryType, { label: string; icon: string; color: string }> = {
  tech:       { label: 'Big Tech',     icon: '🏢', color: '#3b82f6' },
  finance:    { label: 'Finance',      icon: '💰', color: '#10b981' },
  healthcare: { label: 'Healthcare',   icon: '🏥', color: '#ef4444' },
  ecommerce:  { label: 'E-Commerce',   icon: '🛒', color: '#f59e0b' },
  startup:    { label: 'Startup',      icon: '🚀', color: '#8b5cf6' },
  consulting: { label: 'Consulting',   icon: '📋', color: '#ec4899' },
}

// ─── Sample Data ────────────────────────────────────────────────────────────

const CAREER_PATH: CareerRole[] = [
  {
    id: 'junior-fe', title: 'Junior Frontend Developer', level: 'junior', industry: 'tech',
    minSalary: 75000, maxSalary: 105000, avgSalary: 90000, equity: '0-0.01%', bonus: '5-10%',
    requiredSkills: ['HTML/CSS', 'JavaScript', 'React', 'Git'],
    preferredSkills: ['TypeScript', 'Testing', 'Responsive Design'],
    yearsExperience: '0-2 years',
    description: 'Entry-level position focusing on building UI components and learning best practices.',
    responsibilities: ['Build UI components from designs', 'Fix bugs and improve existing features', 'Write unit tests', 'Participate in code reviews'],
    growthOutlook: 85, demandScore: 78, satisfaction: 72, workLifeBalance: 85,
  },
  {
    id: 'mid-fe', title: 'Frontend Developer', level: 'mid', industry: 'tech',
    minSalary: 110000, maxSalary: 150000, avgSalary: 130000, equity: '0.01-0.05%', bonus: '10-15%',
    requiredSkills: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'Testing'],
    preferredSkills: ['Next.js', 'Performance Optimization', 'Design Systems'],
    yearsExperience: '2-5 years',
    description: 'Independently builds features, mentors juniors, and contributes to architecture decisions.',
    responsibilities: ['Lead feature development', 'Mentor junior developers', 'Improve code quality', 'Collaborate with design and product'],
    growthOutlook: 88, demandScore: 85, satisfaction: 78, workLifeBalance: 80,
  },
  {
    id: 'senior-fe', title: 'Senior Frontend Engineer', level: 'senior', industry: 'tech',
    minSalary: 155000, maxSalary: 210000, avgSalary: 180000, equity: '0.05-0.15%', bonus: '15-25%',
    requiredSkills: ['React', 'TypeScript', 'System Design', 'Performance', 'Architecture'],
    preferredSkills: ['Team Leadership', 'Open Source', 'Technical Writing', 'GraphQL'],
    yearsExperience: '5-8 years',
    description: 'Technical leader who drives architecture, mentors teams, and delivers complex projects.',
    responsibilities: ['Design system architecture', 'Lead cross-team projects', 'Set technical standards', 'Mentor and grow engineers'],
    growthOutlook: 90, demandScore: 92, satisfaction: 82, workLifeBalance: 75,
  },
  {
    id: 'staff', title: 'Staff Engineer', level: 'staff', industry: 'tech',
    minSalary: 200000, maxSalary: 280000, avgSalary: 240000, equity: '0.15-0.3%', bonus: '20-30%',
    requiredSkills: ['System Design', 'Architecture', 'Cross-team Leadership', 'Technical Strategy'],
    preferredSkills: ['Platform Engineering', 'DevOps', 'Mentorship Programs'],
    yearsExperience: '8-12 years',
    description: 'Technical authority who sets direction across multiple teams and drives org-wide initiatives.',
    responsibilities: ['Define technical roadmap', 'Solve cross-org problems', 'Drive technical strategy', 'Grow senior talent'],
    growthOutlook: 75, demandScore: 70, satisfaction: 85, workLifeBalance: 72,
  },
  {
    id: 'principal', title: 'Principal Engineer', level: 'principal', industry: 'tech',
    minSalary: 270000, maxSalary: 380000, avgSalary: 320000, equity: '0.3-0.6%', bonus: '25-40%',
    requiredSkills: ['Company-wide Architecture', 'Technical Vision', 'Industry Expertise', 'Executive Communication'],
    preferredSkills: ['Patents', 'Conference Speaking', 'Research'],
    yearsExperience: '12+ years',
    description: 'Sets technical vision for the entire company and influences industry direction.',
    responsibilities: ['Set company technical vision', 'Evaluate emerging technologies', 'Drive critical decisions', 'Represent company externally'],
    growthOutlook: 60, demandScore: 45, satisfaction: 88, workLifeBalance: 70,
  },
]

const SALARY_PROJECTIONS: SalaryProjection[] = [
  { year: 2026, role: 'Senior Frontend Engineer', base: 180000, totalComp: 245000, equity: 45000, bonus: 20000, cumulativeEarnings: 245000 },
  { year: 2027, role: 'Senior Frontend Engineer', base: 188000, totalComp: 258000, equity: 48000, bonus: 22000, cumulativeEarnings: 503000 },
  { year: 2028, role: 'Staff Engineer', base: 220000, totalComp: 305000, equity: 65000, bonus: 20000, cumulativeEarnings: 808000 },
  { year: 2029, role: 'Staff Engineer', base: 230000, totalComp: 320000, equity: 70000, bonus: 20000, cumulativeEarnings: 1128000 },
  { year: 2030, role: 'Staff Engineer', base: 240000, totalComp: 338000, equity: 78000, bonus: 20000, cumulativeEarnings: 1466000 },
  { year: 2031, role: 'Principal Engineer', base: 290000, totalComp: 410000, equity: 100000, bonus: 20000, cumulativeEarnings: 1876000 },
  { year: 2033, role: 'Principal Engineer', base: 310000, totalComp: 445000, equity: 115000, bonus: 20000, cumulativeEarnings: 2766000 },
  { year: 2036, role: 'Director of Engineering', base: 350000, totalComp: 520000, equity: 140000, bonus: 30000, cumulativeEarnings: 4366000 },
]

const SKILL_GAPS: SkillGap[] = [
  { skill: 'System Design', currentLevel: 50, requiredLevel: 85, gap: 35, severity: 'critical', estimatedTime: '3-4 months', resources: ['System Design Interview (Alex Xu)', 'Grokking System Design', 'Mock interviews'] },
  { skill: 'Architecture Patterns', currentLevel: 45, requiredLevel: 80, gap: 35, severity: 'critical', estimatedTime: '3-4 months', resources: ['Designing Data-Intensive Applications', 'Architecture Patterns with C#', 'Build distributed systems'] },
  { skill: 'Technical Leadership', currentLevel: 40, requiredLevel: 75, gap: 35, severity: 'major', estimatedTime: '4-6 months', resources: ['Staff Engineer (Will Larson)', 'Lead Dev courses', 'Mentor junior engineers'] },
  { skill: 'Cross-team Communication', currentLevel: 55, requiredLevel: 80, gap: 25, severity: 'major', estimatedTime: '2-3 months', resources: ['Technical Writing', 'Present at meetups', 'RFC authoring practice'] },
  { skill: 'Performance Optimization', currentLevel: 65, requiredLevel: 85, gap: 20, severity: 'minor', estimatedTime: '1-2 months', resources: ['Web Performance in Action', 'Chrome DevTools mastery', 'Lighthouse optimization'] },
  { skill: 'DevOps / Infrastructure', currentLevel: 30, requiredLevel: 60, gap: 30, severity: 'major', estimatedTime: '2-3 months', resources: ['AWS Solutions Architect cert', 'Docker & K8s course', 'Terraform tutorial'] },
]

const CAREER_MILESTONES: CareerMilestone[] = [
  { id: 'm1', title: 'Lead First Major Project', description: 'Own end-to-end delivery of a high-impact feature or project', timeframe: 'Q1 2027', requiredSkills: ['System Design', 'Project Management'], salaryImpact: 15000, completed: false },
  { id: 'm2', title: 'Mentor 3+ Engineers', description: 'Guide junior and mid-level engineers through their growth', timeframe: 'Q2 2027', requiredSkills: ['Technical Leadership', 'Communication'], salaryImpact: 10000, completed: false },
  { id: 'm3', title: 'Speak at Conference', description: 'Present a technical talk at a major conference or meetup', timeframe: 'Q3 2027', requiredSkills: ['Technical Writing', 'Public Speaking'], salaryImpact: 5000, completed: false },
  { id: 'm4', title: 'Open Source Impact', description: 'Maintain or contribute significantly to a popular OSS project', timeframe: 'Q4 2027', requiredSkills: ['Architecture', 'Community Building'], salaryImpact: 10000, completed: false },
  { id: 'm5', title: 'Staff Promo Packet', description: 'Prepare and submit promotion case to Staff Engineer level', timeframe: 'Q1 2028', requiredSkills: ['System Design', 'Technical Strategy', 'Cross-team Leadership'], salaryImpact: 60000, completed: false },
]

const INDUSTRY_INSIGHTS: IndustryInsight[] = [
  { industry: 'tech', label: 'Big Tech', icon: '🏢', color: '#3b82f6', avgSalary: 245000, growth: 12, openings: 12400, topCompanies: ['Google', 'Meta', 'Apple', 'Microsoft', 'Netflix'] },
  { industry: 'finance', label: 'Finance', icon: '💰', color: '#10b981', avgSalary: 220000, growth: 8, openings: 5600, topCompanies: ['Goldman Sachs', 'JPMorgan', 'Citadel', 'Two Sigma'] },
  { industry: 'startup', label: 'Startup', icon: '🚀', color: '#8b5cf6', avgSalary: 185000, growth: 25, openings: 8900, topCompanies: ['Stripe', 'Vercel', 'Linear', 'Notion'] },
  { industry: 'consulting', label: 'Consulting', icon: '📋', color: '#ec4899', avgSalary: 200000, growth: 10, openings: 3200, topCompanies: ['McKinsey', 'Bain', 'Deloitte', 'Accenture'] },
]

const NEGOTIATION_TIPS: NegotiationTip[] = [
  { category: 'Research', icon: '🔍', tips: ['Use Levels.fyi, Glassdoor, Blind for data', 'Research company-specific pay bands', 'Know your market percentile target'], salaryImpact: '+10-20%', priority: 'high' },
  { category: 'Timing', icon: '⏰', tips: ['Negotiate after getting the offer, not during', 'Have competing offers if possible', 'Best time: end of quarter/year'], salaryImpact: '+5-15%', priority: 'high' },
  { category: 'Total Comp', icon: '💎', tips: ['Negotiate base, equity, bonus separately', 'Ask about sign-on bonus and refresh grants', 'Consider PTO and benefits value'], salaryImpact: '+15-25%', priority: 'high' },
  { category: 'Leverage', icon: '🎯', tips: ['Frame as partnership, not adversarial', 'Use data, not emotions', 'Be willing to walk away'], salaryImpact: '+10-15%', priority: 'medium' },
  { category: 'Equity', icon: '📈', tips: ['Understand vesting schedules', 'Ask about acceleration on acquisition', 'Compare total comp, not just base'], salaryImpact: '+20-40%', priority: 'medium' },
]

// ─── Utility Functions ──────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `$${(amount / 1000).toFixed(0)}K`
}

function formatFullCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`
}

function getSeverityColor(severity: SkillGapSeverity): string {
  switch (severity) {
    case 'critical': return '#ef4444'
    case 'major': return '#f59e0b'
    case 'minor': return '#3b82f6'
    case 'none': return '#10b981'
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CareerPathSimulator() {
  const [activeTab, setActiveTab] = useState<'path' | 'salary' | 'skills' | 'milestones' | 'negotiate'>('path')
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType | 'tech'>('tech')
  const [projectionPeriod, setProjectionPeriod] = useState<ProjectionPeriod>('5yr')
  const [selectedRole, setSelectedRole] = useState<CareerRole>(CAREER_PATH[2])
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null)

  const filteredInsights = useMemo(() => INDUSTRY_INSIGHTS, [])

  const projections = useMemo(() => {
    const yearLimit = projectionPeriod === '1yr' ? 1 : projectionPeriod === '3yr' ? 3 : projectionPeriod === '5yr' ? 5 : 10
    return SALARY_PROJECTIONS.filter(p => p.year <= 2026 + yearLimit)
  }, [projectionPeriod])

  const tabs = [
    { id: 'path' as const, label: 'Career Path', icon: '🗺️' },
    { id: 'salary' as const, label: 'Salary Projections', icon: '💰' },
    { id: 'skills' as const, label: 'Skill Gaps', icon: '🎯' },
    { id: 'milestones' as const, label: 'Milestones', icon: '🏁' },
    { id: 'negotiate' as const, label: 'Negotiation', icon: '🤝' },
  ]

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '20px',
    backdropFilter: 'blur(12px)',
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🗺️ Career Path Simulator
          </h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>Explore career trajectories, salary projections, and skill roadmaps for engineering roles</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{formatCurrency(SALARY_PROJECTIONS[0].totalComp)}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Current TC</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b' }}>{formatCurrency(SALARY_PROJECTIONS[4]?.totalComp || 338000)}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>5-Year TC</div>
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

      {/* ═══ CAREER PATH TAB ═══ */}
      {activeTab === 'path' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Path Timeline */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px' }}>🗺️ Engineering Career Ladder</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {CAREER_PATH.map((role, i) => {
                const level = LEVEL_MAP[role.level]
                const isSelected = selectedRole.id === role.id
                return (
                  <div key={role.id} style={{ display: 'flex', gap: '16px', cursor: 'pointer' }} onClick={() => setSelectedRole(role)}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40px' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: isSelected ? level.color : `${level.color}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', fontWeight: '700', color: isSelected ? '#fff' : level.color,
                        border: `2px solid ${level.color}`,
                      }}>
                        {i + 1}
                      </div>
                      {i < CAREER_PATH.length - 1 && (
                        <div style={{ width: '2px', height: '40px', background: 'rgba(255,255,255,0.08)' }} />
                      )}
                    </div>
                    <div style={{ flex: 1, paddingBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: isSelected ? level.color : '#e2e8f0' }}>{role.title}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{role.yearsExperience}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>{formatCurrency(role.avgSalary)}</div>
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>avg TC</div>
                        </div>
                      </div>
                      {/* Mini stats */}
                      <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '10px', color: '#6b7280' }}>
                        <span>📈 {role.growthOutlook}%</span>
                        <span>🔥 {role.demandScore}%</span>
                        <span>😊 {role.satisfaction}%</span>
                        <span>⚖️ {role.workLifeBalance}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Role Detail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '18px' }}>{selectedRole.title}</h3>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{selectedRole.yearsExperience} • {INDUSTRY_MAP[selectedRole.industry].label}</div>
                </div>
                <span style={{ padding: '4px 12px', borderRadius: '10px', background: LEVEL_MAP[selectedRole.level].color, color: '#fff', fontSize: '12px', fontWeight: '700' }}>
                  {LEVEL_MAP[selectedRole.level].label}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 16px' }}>{selectedRole.description}</p>

              {/* Salary Range */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>💰 Compensation Range</div>
                <div style={{ position: 'relative', height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: `${((selectedRole.minSalary - 70000) / (400000 - 70000)) * 100}%`, width: `${((selectedRole.maxSalary - selectedRole.minSalary) / (400000 - 70000)) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #3b82f6)', borderRadius: '12px' }} />
                  <div style={{ position: 'absolute', left: `${((selectedRole.avgSalary - 70000) / (400000 - 70000)) * 100}%`, top: '2px', width: '3px', height: '20px', background: '#fff', borderRadius: '2px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                  <span>{formatCurrency(selectedRole.minSalary)}</span>
                  <span style={{ color: '#fff', fontWeight: '700' }}>Avg: {formatCurrency(selectedRole.avgSalary)}</span>
                  <span>{formatCurrency(selectedRole.maxSalary)}</span>
                </div>
              </div>

              {/* Extra Comp */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.08)', fontSize: '12px' }}>
                  <span style={{ color: '#94a3b8' }}>Equity: </span>
                  <span style={{ color: '#10b981', fontWeight: '700' }}>{selectedRole.equity}</span>
                </div>
                <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(59,130,246,0.08)', fontSize: '12px' }}>
                  <span style={{ color: '#94a3b8' }}>Bonus: </span>
                  <span style={{ color: '#3b82f6', fontWeight: '700' }}>{selectedRole.bonus}</span>
                </div>
              </div>

              {/* Responsibilities */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>📋 Key Responsibilities</div>
                {selectedRole.responsibilities.map((r, i) => (
                  <div key={i} style={{ fontSize: '12px', color: '#e2e8f0', padding: '3px 0', display: 'flex', gap: '6px' }}>
                    <span style={{ color: '#f59e0b' }}>→</span> {r}
                  </div>
                ))}
              </div>

              {/* Skills */}
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>🛠️ Required Skills</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {selectedRole.requiredSkills.map(s => (
                    <span key={s} style={{ padding: '3px 10px', borderRadius: '8px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontSize: '11px', fontWeight: '600' }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance Meters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Growth Outlook', value: selectedRole.growthOutlook, color: '#10b981', icon: '📈' },
                { label: 'Demand Score', value: selectedRole.demandScore, color: '#f59e0b', icon: '🔥' },
                { label: 'Satisfaction', value: selectedRole.satisfaction, color: '#3b82f6', icon: '😊' },
                { label: 'Work-Life Balance', value: selectedRole.workLifeBalance, color: '#8b5cf6', icon: '⚖️' },
              ].map((meter, i) => (
                <div key={i} style={{ ...cardStyle, textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>{meter.icon}</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: meter.color }}>{meter.value}%</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{meter.label}</div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${meter.value}%`, background: meter.color, borderRadius: '2px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ SALARY PROJECTIONS TAB ═══ */}
      {activeTab === 'salary' && (
        <div>
          {/* Period Selector */}
          <div style={{ ...cardStyle, marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>Projection Period:</span>
            {(['1yr', '3yr', '5yr', '10yr'] as ProjectionPeriod[]).map(p => (
              <button key={p} style={btnStyle(projectionPeriod === p)} onClick={() => setProjectionPeriod(p)}>
                {p === '1yr' ? '1 Year' : p === '3yr' ? '3 Years' : p === '5yr' ? '5 Years' : '10 Years'}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            {/* Chart */}
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>📈 Total Compensation Projection</h3>
              <svg width="100%" height="300" viewBox="0 0 700 300">
                {/* Grid */}
                {[0, 100, 200, 300, 400, 500].map(v => (
                  <g key={v}>
                    <line x1="60" y1={260 - (v / 550) * 240} x2="680" y2={260 - (v / 550) * 240} stroke="rgba(255,255,255,0.05)" />
                    <text x="55" y={264 - (v / 550) * 240} textAnchor="end" fill="rgba(148,163,184,0.5)" fontSize="10">${v}K</text>
                  </g>
                ))}

                {/* Bars */}
                {projections.map((p, i) => {
                  const x = 80 + (i / Math.max(projections.length - 1, 1)) * 580
                  const barHeight = (p.totalComp / 550000) * 240
                  const baseHeight = (p.base / 550000) * 240
                  return (
                    <g key={i}>
                      {/* Total comp bar */}
                      <rect x={x - 20} y={260 - barHeight} width="40" height={barHeight} rx="4" fill="rgba(59,130,246,0.3)" stroke="#3b82f6" strokeWidth="1" />
                      {/* Base bar */}
                      <rect x={x - 14} y={260 - baseHeight} width="28" height={baseHeight} rx="3" fill="#3b82f6" />
                      {/* Label */}
                      <text x={x} y={280} textAnchor="middle" fill="#94a3b8" fontSize="10">{p.year}</text>
                      <text x={x} y={255 - barHeight} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="700">{formatCurrency(p.totalComp)}</text>
                    </g>
                  )
                })}

                {/* Legend */}
                <rect x="80" y="10" width="10" height="10" rx="2" fill="#3b82f6" />
                <text x="95" y="19" fill="#94a3b8" fontSize="10">Base Salary</text>
                <rect x="200" y="10" width="10" height="10" rx="2" fill="rgba(59,130,246,0.3)" stroke="#3b82f6" />
                <text x="215" y="19" fill="#94a3b8" fontSize="10">Total Comp (Base + Equity + Bonus)</text>
              </svg>
            </div>

            {/* Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px' }}>📊 Projection Summary</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { label: 'Starting TC', value: formatFullCurrency(projections[0]?.totalComp || 0), color: '#10b981' },
                    { label: 'End TC', value: formatFullCurrency(projections[projections.length - 1]?.totalComp || 0), color: '#3b82f6' },
                    { label: 'Total Growth', value: `+${Math.round(((projections[projections.length - 1]?.totalComp || 0) / (projections[0]?.totalComp || 1) - 1) * 100)}%`, color: '#f59e0b' },
                    { label: 'Cumulative', value: formatCurrency(projections[projections.length - 1]?.cumulativeEarnings || 0), color: '#8b5cf6' },
                  ].map((stat, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#94a3b8' }}>{stat.label}</span>
                      <span style={{ fontWeight: '700', color: stat.color }}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Equity Breakdown */}
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px' }}>💎 Equity Growth</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {projections.slice(0, 5).map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', width: '30px' }}>{p.year}</span>
                      <div style={{ flex: 1, height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(p.equity / 150000) * 100}%`, background: 'linear-gradient(90deg, #10b981, #3b82f6)', borderRadius: '6px' }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', width: '45px' }}>{formatCurrency(p.equity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Role Progression */}
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px' }}>🚀 Role Progression</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {projections.filter((p, i) => i === 0 || p.role !== projections[i - 1].role).map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#f59e0b' }}>{p.year}</span>
                      <span style={{ fontSize: '12px', color: '#e2e8f0', flex: 1 }}>{p.role}</span>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>{formatCurrency(p.totalComp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Industry Comparison */}
          <div style={{ ...cardStyle, marginTop: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>🏭 Industry Comparison</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {INDUSTRY_INSIGHTS.map(ind => (
                <div key={ind.industry} style={{ padding: '16px', borderRadius: '12px', background: `${ind.color}08`, border: `1px solid ${ind.color}20`, textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{ind.icon}</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: ind.color }}>{ind.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', margin: '4px 0' }}>{formatCurrency(ind.avgSalary)}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Avg Total Comp</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', color: '#6b7280' }}>
                    <span>📈 +{ind.growth}%</span>
                    <span>📋 {ind.openings.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                    {ind.topCompanies.slice(0, 3).map(c => (
                      <span key={c} style={{ padding: '2px 6px', borderRadius: '4px', background: `${ind.color}15`, fontSize: '9px', color: ind.color }}>{c}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ SKILL GAPS TAB ═══ */}
      {activeTab === 'skills' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Gaps List */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>🎯 Skill Gap Analysis</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {SKILL_GAPS.map(gap => (
                <div key={gap.skill} style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${getSeverityColor(gap.severity)}20` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '13px' }}>{gap.skill}</span>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', background: `${getSeverityColor(gap.severity)}20`, color: getSeverityColor(gap.severity), fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
                      {gap.severity} ({gap.gap}pts)
                    </span>
                  </div>
                  {/* Dual bar */}
                  <div style={{ position: 'relative', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden', marginBottom: '6px' }}>
                    <div style={{ position: 'absolute', height: '100%', width: `${gap.requiredLevel}%`, background: 'rgba(59,130,246,0.15)', borderRadius: '8px' }} />
                    <div style={{ position: 'absolute', height: '100%', width: `${gap.currentLevel}%`, background: getSeverityColor(gap.severity), borderRadius: '8px' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginBottom: '6px' }}>
                    <span>Current: {gap.currentLevel}%</span>
                    <span>Required: {gap.requiredLevel}%</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#f59e0b' }}>⏱️ Estimated: {gap.estimatedTime}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Resources & Plan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>📚 Learning Resources</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {SKILL_GAPS.filter(g => g.severity === 'critical' || g.severity === 'major').map(gap => (
                  <div key={gap.skill}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: getSeverityColor(gap.severity), marginBottom: '6px' }}>{gap.skill}</div>
                    {gap.resources.map((r, i) => (
                      <div key={i} style={{ fontSize: '11px', color: '#94a3b8', padding: '3px 0', display: 'flex', gap: '6px' }}>
                        <span style={{ color: '#f59e0b' }}>→</span> {r}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>📊 Gap Overview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Critical', count: SKILL_GAPS.filter(g => g.severity === 'critical').length, color: '#ef4444' },
                  { label: 'Major', count: SKILL_GAPS.filter(g => g.severity === 'major').length, color: '#f59e0b' },
                  { label: 'Minor', count: SKILL_GAPS.filter(g => g.severity === 'minor').length, color: '#3b82f6' },
                ].map((stat, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '12px', borderRadius: '10px', background: `${stat.color}10` }}>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: stat.color }}>{stat.count}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px', padding: '10px', borderRadius: '8px', background: 'rgba(16,185,129,0.08)', fontSize: '12px', color: '#10b981' }}>
                💡 Focus on critical gaps first — they have the highest salary impact
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>⏱️ Estimated Timeline</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { phase: 'Phase 1', weeks: '1-4', focus: 'System Design basics + Architecture patterns', color: '#ef4444' },
                  { phase: 'Phase 2', weeks: '5-8', focus: 'DevOps/Infrastructure + Performance tuning', color: '#f59e0b' },
                  { phase: 'Phase 3', weeks: '9-14', focus: 'Leadership skills + Cross-team communication', color: '#3b82f6' },
                  { phase: 'Phase 4', weeks: '15-18', focus: 'Mock interviews + Portfolio building', color: '#10b981' },
                ].map((phase, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: `${phase.color}08` }}>
                    <span style={{ padding: '3px 8px', borderRadius: '6px', background: `${phase.color}20`, color: phase.color, fontSize: '10px', fontWeight: '700', width: '55px', textAlign: 'center' }}>{phase.phase}</span>
                    <span style={{ fontSize: '10px', color: '#6b7280', width: '40px' }}>Wk {phase.weeks}</span>
                    <span style={{ fontSize: '11px', color: '#e2e8f0' }}>{phase.focus}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MILESTONES TAB ═══ */}
      {activeTab === 'milestones' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ ...cardStyle, marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>🏁 Career Milestones</h3>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {CAREER_MILESTONES.filter(m => m.completed).length}/{CAREER_MILESTONES.length} completed •
                {' '}{formatCurrency(CAREER_MILESTONES.filter(m => m.completed).reduce((s, m) => s + m.salaryImpact, 0))} potential impact
              </span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(CAREER_MILESTONES.filter(m => m.completed).length / CAREER_MILESTONES.length) * 100}%`, background: 'linear-gradient(90deg, #10b981, #3b82f6)', borderRadius: '3px' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {CAREER_MILESTONES.map((milestone, i) => {
              const isExpanded = expandedMilestone === milestone.id
              return (
                <div key={milestone.id} style={{ ...cardStyle, cursor: 'pointer', border: milestone.completed ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.06)' }}
                  onClick={() => setExpandedMilestone(isExpanded ? null : milestone.id)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: milestone.completed ? '#10b981' : 'rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', flexShrink: 0,
                    }}>
                      {milestone.completed ? '✓' : i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '700', fontSize: '14px' }}>{milestone.title}</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>📅 {milestone.timeframe}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{milestone.description}</div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {milestone.requiredSkills.map(s => (
                          <span key={s} style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: '10px' }}>{s}</span>
                        ))}
                        <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '10px', fontWeight: '700' }}>
                          +{formatCurrency(milestone.salaryImpact)}/yr
                        </span>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '12px', paddingTop: '12px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button style={{ padding: '8px 16px', borderRadius: '8px', background: milestone.completed ? 'rgba(255,255,255,0.05)' : '#10b981', color: milestone.completed ? '#94a3b8' : '#fff', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                          {milestone.completed ? '✓ Completed' : '✅ Mark Complete'}
                        </button>
                        <button style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', fontSize: '12px', cursor: 'pointer' }}>
                          📚 View Resources
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ NEGOTIATION TAB ═══ */}
      {activeTab === 'negotiate' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {NEGOTIATION_TIPS.map((tip, i) => (
            <div key={i} style={{ ...cardStyle, borderTop: `3px solid ${tip.priority === 'high' ? '#ef4444' : tip.priority === 'medium' ? '#f59e0b' : '#3b82f6'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{tip.icon}</span>
                  <span style={{ fontWeight: '700', fontSize: '14px' }}>{tip.category}</span>
                </div>
                <span style={{ padding: '2px 8px', borderRadius: '6px', background: tip.priority === 'high' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: tip.priority === 'high' ? '#ef4444' : '#f59e0b', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
                  {tip.priority}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                {tip.tips.map((t, j) => (
                  <div key={j} style={{ fontSize: '12px', color: '#e2e8f0', display: 'flex', gap: '6px' }}>
                    <span style={{ color: '#10b981' }}>✓</span> {t}
                  </div>
                ))}
              </div>
              <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.08)', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Expected Impact: </span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#10b981' }}>{tip.salaryImpact}</span>
              </div>
            </div>
          ))}

          {/* Salary Calculator */}
          <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>🧮 Salary Negotiation Calculator</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { scenario: 'No Negotiation', base: 180000, total: 180000, color: '#6b7280', icon: '😐' },
                { scenario: 'Counter Offer', base: 195000, total: 220000, color: '#f59e0b', icon: '🤝' },
                { scenario: 'Strong Negotiation', base: 210000, total: 260000, color: '#3b82f6', icon: '💪' },
                { scenario: 'Expert Negotiation', base: 225000, total: 295000, color: '#10b981', icon: '🏆' },
              ].map((scenario, i) => (
                <div key={i} style={{ padding: '16px', borderRadius: '12px', background: `${scenario.color}08`, border: `1px solid ${scenario.color}20`, textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{scenario.icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: scenario.color, marginBottom: '8px' }}>{scenario.scenario}</div>
                  <div style={{ fontSize: '20px', fontWeight: '800' }}>{formatCurrency(scenario.total)}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Total Comp</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Base: {formatCurrency(scenario.base)}</div>
                  {i > 0 && (
                    <div style={{ marginTop: '8px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', fontSize: '11px', color: '#10b981', fontWeight: '700' }}>
                      +{formatCurrency(scenario.total - 180000)} vs no negotiation
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CareerPathSimulator
