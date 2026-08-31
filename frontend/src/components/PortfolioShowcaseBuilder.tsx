import { useState, useMemo } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface Project {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: 'web' | 'mobile' | 'ai-ml' | 'backend' | 'devops' | 'design' | 'open-source';
  techStack: string[];
  role: string;
  teamSize: number;
  duration: string;
  status: 'live' | 'archived' | 'in-progress';
  metrics: ProjectMetrics;
  highlights: string[];
  challenges: string[];
  lessonsLearned: string[];
  links: { live?: string; github?: string; demo?: string; caseStudy?: string };
  featured: boolean;
  endorsements: number;
  screenshots: number;
}

interface ProjectMetrics {
  users?: number;
  stars?: number;
  downloads?: number;
  performance?: string;
  uptime?: string;
  revenue?: string;
  impact: string;
}

interface SkillShowcase {
  skill: string;
  projects: string[];
  endorsements: number;
  evidenceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  verified: boolean;
  endorsementsFrom: string[];
}

interface PortfolioAnalytics {
  totalProjects: number;
  totalStars: number;
  totalUsers: number;
  totalEndorsements: number;
  avgTeamSize: number;
  topSkill: string;
  categories: { name: string; count: number }[];
  techFrequency: { tech: string; count: number }[];
  monthlyViews: number;
  recruitersInterested: number;
}

interface Testimonial {
  author: string;
  role: string;
  company: string;
  text: string;
  rating: number;
  date: string;
  project: string;
}

/* ─── Mock Data ─────────────────────────────────────────────────────── */
const PROJECTS: Project[] = [
  {
    id: 'p1', name: 'DevConnect', tagline: 'Developer networking platform with real-time collaboration',
    description: 'A full-stack platform connecting developers through skill-based matching, project collaboration, and real-time communication. Features include live coding sessions, tech stack visualization, and AI-powered project recommendations.',
    category: 'web', techStack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'WebSockets', 'Redis', 'Docker', 'AWS'],
    role: 'Lead Developer', teamSize: 3, duration: '6 months', status: 'live',
    metrics: { users: 2500, stars: 340, performance: '98.5% uptime', impact: 'Connected 2,500+ developers, 500+ project collaborations started' },
    highlights: ['Real-time collaboration engine', 'AI skill matching algorithm', '99.9% uptime SLA', 'Featured in Dev.to weekly'],
    challenges: ['Scaling WebSocket connections', 'Implementing real-time cursor sync', 'Handling offline-first data sync'],
    lessonsLearned: ['WebSockets need connection pooling at scale', 'Redis pub/sub is essential for horizontal scaling', 'TypeScript saves hours in debugging'],
    links: { live: 'https://devconnect.example.com', github: 'https://github.com/user/devconnect', caseStudy: '#' },
    featured: true, endorsements: 18, screenshots: 5,
  },
  {
    id: 'p2', name: 'AI Code Review Bot', tagline: 'Intelligent automated code review with context-aware suggestions',
    description: 'A GitHub bot that performs AI-powered code reviews, providing context-aware suggestions for improvements, security vulnerabilities, and performance optimizations. Integrates with CI/CD pipelines for seamless developer experience.',
    category: 'ai-ml', techStack: ['Python', 'FastAPI', 'OpenAI API', 'GitHub API', 'PostgreSQL', 'Docker', 'GitHub Actions'],
    role: 'Solo Developer', teamSize: 1, duration: '3 months', status: 'live',
    metrics: { users: 1200, stars: 580, downloads: 8500, impact: 'Reviewed 50,000+ PRs, caught 15,000+ issues before merge' },
    highlights: ['GPT-4 powered analysis', 'Custom trained on 10M+ PRs', 'GitHub Marketplace featured', '95% suggestion acceptance rate'],
    challenges: ['Handling large diffs efficiently', 'Reducing false positive rate', 'Managing API costs at scale'],
    lessonsLearned: ['Prompt engineering is critical for code analysis', 'Caching reduces API costs by 70%', 'Context window management matters'],
    links: { github: 'https://github.com/user/ai-review-bot', demo: '#' },
    featured: true, endorsements: 24, screenshots: 3,
  },
  {
    id: 'p3', name: 'EcoTracker', tagline: 'Personal carbon footprint tracking with actionable insights',
    description: 'A mobile-first web app helping users track and reduce their carbon footprint through daily habit logging, smart suggestions, and community challenges. Features gamification elements to keep users engaged.',
    category: 'web', techStack: ['React', 'Next.js', 'Tailwind CSS', 'Supabase', 'Chart.js', 'PWA'],
    role: 'Full-Stack Developer', teamSize: 2, duration: '4 months', status: 'live',
    metrics: { users: 4800, stars: 220, impact: 'Tracked 100,000+ daily entries, estimated 50 tons CO2 reduced' },
    highlights: ['PWA with offline support', 'Smart commute suggestions', 'Community challenges', 'Gamification system'],
    challenges: ['Accurate carbon calculations', 'Engaging daily habit formation', 'Offline data sync'],
    lessonsLearned: ['PWA is viable alternative to native apps', 'Gamification increases retention 3x', 'Supabase reduces backend development time by 60%'],
    links: { live: 'https://ecotracker.example.com', github: 'https://github.com/user/ecotracker' },
    featured: true, endorsements: 12, screenshots: 4,
  },
  {
    id: 'p4', name: 'CloudDeploy CLI', tagline: 'Zero-config deployment tool for modern web apps',
    description: 'A CLI tool that simplifies deploying web applications to major cloud providers with zero configuration. Supports automatic Dockerfile generation, environment management, and cost optimization recommendations.',
    category: 'devops', techStack: ['Go', 'Docker', 'AWS SDK', 'GCP SDK', 'Azure SDK', 'Cobra CLI'],
    role: 'Creator & Maintainer', teamSize: 1, duration: '5 months', status: 'live',
    metrics: { downloads: 12000, stars: 890, impact: 'Deployed 8,000+ applications, saved estimated $200K in cloud costs' },
    highlights: ['Supports 3 major cloud providers', 'Auto-generates Dockerfiles', 'Cost optimization engine', 'Active open-source community'],
    challenges: ['Cloud provider API differences', 'Handling edge deployment cases', 'Building CLI cross-platform'],
    lessonsLearned: ['Go is perfect for CLI tools', 'Cobra makes excellent CLIs', 'Community contributions accelerate development'],
    links: { github: 'https://github.com/user/clouddeploy', demo: '#' },
    featured: false, endorsements: 31, screenshots: 2,
  },
  {
    id: 'p5', name: 'SecureVault', tagline: 'End-to-end encrypted password manager with zero-knowledge architecture',
    description: 'A security-focused password manager implementing zero-knowledge encryption, biometric authentication, and secure sharing. Built with modern cryptographic primitives and audited architecture.',
    category: 'backend', techStack: ['Rust', 'WebAssembly', 'React', 'libsodium', 'IndexedDB', 'TypeScript'],
    role: 'Security Architect & Developer', teamSize: 2, duration: '6 months', status: 'live',
    metrics: { users: 1800, impact: 'Secured 50,000+ passwords, zero security incidents' },
    highlights: ['Zero-knowledge architecture', 'Biometric auth support', 'Third-party security audit', 'SOC 2 compliance ready'],
    challenges: ['Implementing zero-knowledge proofs', 'Cross-platform key derivation', 'Secure key sharing protocol'],
    lessonsLearned: ['Security should be designed from day one', 'Rust prevents memory-related vulnerabilities', 'Audits are worth the investment'],
    links: { live: 'https://securevault.example.com', github: 'https://github.com/user/securevault' },
    featured: false, endorsements: 15, screenshots: 3,
  },
  {
    id: 'p6', name: 'PixelForge UI', tagline: 'Open-source component library with AI-powered design tokens',
    description: 'A comprehensive React component library featuring 60+ accessible components, AI-powered design token generation, and Figma integration. Used by 200+ companies in production.',
    category: 'design', techStack: ['React', 'TypeScript', 'Storybook', 'Tailwind CSS', 'Figma Plugin API', 'Chromatic'],
    role: 'Creator & Lead Maintainer', teamSize: 4, duration: '12 months', status: 'live',
    metrics: { downloads: 45000, stars: 1200, impact: 'Used by 200+ companies, 60+ components, WCAG 2.1 AA compliant' },
    highlights: ['60+ accessible components', 'AI design token generator', 'Figma plugin integration', 'WCAG 2.1 AA compliant'],
    challenges: ['Maintaining accessibility across browsers', 'AI token generation accuracy', 'Breaking change management'],
    lessonsLearned: ['Accessibility must be built-in, not bolted-on', 'Documentation is as important as code', 'Community feedback drives quality'],
    links: { live: 'https://pixelforge.example.com', github: 'https://github.com/user/pixelforge', caseStudy: '#' },
    featured: true, endorsements: 28, screenshots: 6,
  },
];

const SKILL_SHOWCASES: SkillShowcase[] = [
  { skill: 'React', projects: ['DevConnect', 'EcoTracker', 'PixelForge UI'], endorsements: 42, evidenceLevel: 'expert', verified: true, endorsementsFrom: ['Meta Engineer', 'Netflix Sr. Dev', 'Startup CTO'] },
  { skill: 'TypeScript', projects: ['DevConnect', 'SecureVault', 'PixelForge UI'], endorsements: 35, evidenceLevel: 'advanced', verified: true, endorsementsFrom: ['Tech Lead', 'Senior Dev', 'Staff Engineer'] },
  { skill: 'Python', projects: ['AI Code Review Bot'], endorsements: 18, evidenceLevel: 'intermediate', verified: false, endorsementsFrom: ['ML Engineer', 'Backend Dev'] },
  { skill: 'Node.js', projects: ['DevConnect'], endorsements: 22, evidenceLevel: 'advanced', verified: true, endorsementsFrom: ['CTO', 'Platform Lead'] },
  { skill: 'Go', projects: ['CloudDeploy CLI'], endorsements: 14, evidenceLevel: 'intermediate', verified: false, endorsementsFrom: ['DevOps Lead', 'SRE Engineer'] },
  { skill: 'Rust', projects: ['SecureVault'], endorsements: 11, evidenceLevel: 'intermediate', verified: false, endorsementsFrom: ['Security Engineer'] },
  { skill: 'System Design', projects: ['DevConnect', 'CloudDeploy CLI'], endorsements: 28, evidenceLevel: 'advanced', verified: true, endorsementsFrom: ['Staff Engineer', 'Architect', 'CTO'] },
];

const TESTIMONIALS: Testimonial[] = [
  { author: 'Sarah Chen', role: 'CTO', company: 'TechStart', text: 'DevConnect transformed how our team collaborates. The real-time features are incredibly smooth.', rating: 5, date: '2026-07', project: 'DevConnect' },
  { author: 'Marcus Rodriguez', role: 'Engineering Lead', company: 'ScaleUp Inc', text: 'AI Code Review Bot caught 3 critical security issues in our first week. Essential tool for any team.', rating: 5, date: '2026-06', project: 'AI Code Review Bot' },
  { author: 'Priya Patel', role: 'Staff Engineer', company: 'BigTech Co', text: 'PixelForge UI saved us months of component development. The accessibility features are outstanding.', rating: 4, date: '2026-05', project: 'PixelForge UI' },
];

/* ─── Helper Functions ──────────────────────────────────────────────── */
function categoryColor(c: string): string {
  const colors: Record<string, string> = {
    web: '#3b82f6', mobile: '#8b5cf6', 'ai-ml': '#22c55e', backend: '#f59e0b',
    devops: '#ef4444', design: '#ec4899', 'open-source': '#06b6d4',
  };
  return colors[c] || '#6b7280';
}

function statusColor(s: string): string {
  switch (s) {
    case 'live': return '#22c55e';
    case 'in-progress': return '#f59e0b';
    case 'archived': return '#94a3b8';
    default: return '#6b7280';
  }
}

function evidenceColor(e: string): string {
  switch (e) {
    case 'expert': return '#f59e0b';
    case 'advanced': return '#8b5cf6';
    case 'intermediate': return '#3b82f6';
    case 'beginner': return '#94a3b8';
    default: return '#6b7280';
  }
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/* ─── Sub-Components ────────────────────────────────────────────────── */
function KPICard({ label, value, subtitle, color }: {
  label: string; value: string | number; subtitle: string; color: string;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 14px',
      border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', flex: '1 1 0', minWidth: 120,
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 10, color: '#94a3b8' }}>{subtitle}</div>
    </div>
  );
}

function ProjectCard({ project, isExpanded, onToggle }: {
  project: Project; isExpanded: boolean; onToggle: () => void;
}) {
  const catColor = categoryColor(project.category);
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)',
      overflow: 'hidden', marginBottom: 14,
    }}>
      {/* Header */}
      <div onClick={onToggle} style={{ padding: '16px 18px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {project.featured && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#f59e0b20', color: '#f59e0b', fontWeight: 700 }}>⭐ Featured</span>}
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: `${catColor}20`, color: catColor, textTransform: 'capitalize' }}>{project.category}</span>
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: `${statusColor(project.status)}20`, color: statusColor(project.status), textTransform: 'capitalize' }}>{project.status}</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#e2e8f0', marginBottom: 2 }}>{project.name}</div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>{project.tagline}</div>
          </div>
          <span style={{ fontSize: 14, color: '#94a3b8', transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
        </div>
        {/* Tech Stack */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {project.techStack.map(tech => (
            <span key={tech} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: 'rgba(139,92,246,0.12)', color: '#c4b5fd' }}>{tech}</span>
          ))}
        </div>
        {/* Quick Metrics */}
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#94a3b8' }}>
          {project.metrics.users && <span>👥 {formatNumber(project.metrics.users)} users</span>}
          {project.metrics.stars && <span>⭐ {formatNumber(project.metrics.stars)} stars</span>}
          {project.metrics.downloads && <span>📥 {formatNumber(project.metrics.downloads)} downloads</span>}
          <span>👥 {project.teamSize} team</span>
          <span>⏱ {project.duration}</span>
          <span>👍 {project.endorsements} endorsements</span>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ margin: '14px 0', fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>{project.description}</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            {/* Highlights */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>🏆 Highlights:</div>
              {project.highlights.map((h, i) => (
                <div key={i} style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 3 }}>✅ {h}</div>
              ))}
            </div>
            {/* Challenges */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>⚡ Challenges:</div>
              {project.challenges.map((c, i) => (
                <div key={i} style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 3 }}>🔧 {c}</div>
              ))}
            </div>
          </div>

          {/* Lessons */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>💡 Lessons Learned:</div>
            {project.lessonsLearned.map((l, i) => (
              <div key={i} style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 3 }}>📖 {l}</div>
            ))}
          </div>

          {/* Impact */}
          <div style={{ background: 'rgba(34,197,94,0.08)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>📈 Impact:</div>
            <div style={{ fontSize: 13, color: '#e2e8f0' }}>{project.metrics.impact}</div>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: 8 }}>
            {project.links.live && <span style={{ fontSize: 11, padding: '6px 14px', borderRadius: 8, background: '#22c55e', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>🔗 Live Demo</span>}
            {project.links.github && <span style={{ fontSize: 11, padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: '#e2e8f0', fontWeight: 600, cursor: 'pointer' }}>📂 GitHub</span>}
            {project.links.caseStudy && <span style={{ fontSize: 11, padding: '6px 14px', borderRadius: 8, background: 'rgba(59,130,246,0.2)', color: '#93c5fd', fontWeight: 600, cursor: 'pointer' }}>📝 Case Study</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function SkillBadge({ showcase }: { showcase: SkillShowcase }) {
  const eColor = evidenceColor(showcase.evidenceLevel);
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14,
      border: `1px solid ${eColor}30`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{showcase.skill}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {showcase.verified && <span style={{ fontSize: 10 }}>✅</span>}
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: `${eColor}20`, color: eColor, textTransform: 'capitalize' }}>{showcase.evidenceLevel}</span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>👍 {showcase.endorsements} endorsements · {showcase.projects.length} projects</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
        {showcase.projects.map(p => (
          <span key={p} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: 'rgba(59,130,246,0.12)', color: '#93c5fd' }}>{p}</span>
        ))}
      </div>
      <div style={{ fontSize: 10, color: '#94a3b8' }}>Endorsed by: {showcase.endorsementsFrom.join(', ')}</div>
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 16,
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} style={{ fontSize: 14 }}>{i < testimonial.rating ? '⭐' : '☆'}</span>
        ))}
      </div>
      <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 12, fontStyle: 'italic' }}>"{testimonial.text}"</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{testimonial.author}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{testimonial.role} at {testimonial.company}</div>
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8' }}>📁 {testimonial.project}</div>
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────── */
type Tab = 'projects' | 'skills' | 'analytics' | 'testimonials';

export default function PortfolioShowcaseBuilder() {
  const [activeTab, setActiveTab] = useState<Tab>('projects');
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = useMemo(() => {
    let ps = [...PROJECTS];
    if (categoryFilter !== 'all') ps = ps.filter(p => p.category === categoryFilter);
    if (searchQuery) ps = ps.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.techStack.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return ps.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.endorsements - a.endorsements);
  }, [categoryFilter, searchQuery]);

  const analytics = useMemo((): PortfolioAnalytics => {
    const techCount: Record<string, number> = {};
    PROJECTS.forEach(p => p.techStack.forEach(t => { techCount[t] = (techCount[t] || 0) + 1; }));
    const catCount: Record<string, number> = {};
    PROJECTS.forEach(p => { catCount[p.category] = (catCount[p.category] || 0) + 1; });
    return {
      totalProjects: PROJECTS.length,
      totalStars: PROJECTS.reduce((s, p) => s + (p.metrics.stars || 0), 0),
      totalUsers: PROJECTS.reduce((s, p) => s + (p.metrics.users || 0), 0),
      totalEndorsements: PROJECTS.reduce((s, p) => s + p.endorsements, 0),
      avgTeamSize: Math.round(PROJECTS.reduce((s, p) => s + p.teamSize, 0) / PROJECTS.length),
      topSkill: Object.entries(techCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'React',
      categories: Object.entries(catCount).map(([name, count]) => ({ name, count })),
      techFrequency: Object.entries(techCount).sort((a, b) => b[1] - a[1]).map(([tech, count]) => ({ tech, count })),
      monthlyViews: 8500,
      recruitersInterested: 12,
    };
  }, []);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'projects', label: 'Projects', icon: '📁' },
    { id: 'skills', label: 'Skills', icon: '🛠️' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'testimonials', label: 'Reviews', icon: '💬' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', color: '#e2e8f0', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Portfolio Showcase Builder
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 6 }}>Showcase your projects, skills, and impact to stand out</p>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <KPICard label="Projects" value={analytics.totalProjects} subtitle={`${PROJECTS.filter(p => p.featured).length} featured`} color="#ec4899" />
          <KPICard label="Total Stars" value={formatNumber(analytics.totalStars)} subtitle="across all repos" color="#f59e0b" />
          <KPICard label="Users Served" value={formatNumber(analytics.totalUsers)} subtitle="across products" color="#22c55e" />
          <KPICard label="Endorsements" value={analytics.totalEndorsements} subtitle="from peers" color="#3b82f6" />
          <KPICard label="Monthly Views" value={formatNumber(analytics.monthlyViews)} subtitle="portfolio visits" color="#8b5cf6" />
          <KPICard label="Recruiters" value={analytics.recruitersInterested} subtitle="viewed profile" color="#06b6d4" />
        </div>

        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: '1 1 0', minWidth: 90, padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? 'rgba(236,72,153,0.2)' : 'transparent',
              color: activeTab === tab.id ? '#f472b6' : '#94a3b8',
              fontWeight: 600, fontSize: 12, transition: 'all 0.2s',
            }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Projects Tab ──────────────────────────────────────── */}
        {activeTab === 'projects' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <input type="text" placeholder="🔍 Search projects or tech..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ flex: '1 1 200px', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 13, outline: 'none' }} />
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 13 }}>
                <option value="all">All Categories</option>
                {['web', 'mobile', 'ai-ml', 'backend', 'devops', 'design', 'open-source'].map(c => (
                  <option key={c} value={c}>{c.replace('-', ' / ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
            {filteredProjects.map(project => (
              <ProjectCard key={project.id} project={project}
                isExpanded={expandedProject === project.id}
                onToggle={() => setExpandedProject(expandedProject === project.id ? null : project.id)} />
            ))}
            {filteredProjects.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No projects match your search.</div>}
          </div>
        )}

        {/* ─── Skills Tab ────────────────────────────────────────── */}
        {activeTab === 'skills' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {SKILL_SHOWCASES.sort((a, b) => b.endorsements - a.endorsements).map(s => (
              <SkillBadge key={s.skill} showcase={s} />
            ))}
          </div>
        )}

        {/* ─── Analytics Tab ─────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {/* Tech Frequency */}
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px 0', color: '#e2e8f0' }}>🛠️ Tech Stack Frequency</h3>
                {analytics.techFrequency.slice(0, 10).map(t => (
                  <div key={t.tech} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{t.tech}</span>
                      <span style={{ color: '#94a3b8' }}>{t.count} projects</span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                      <div style={{ height: '100%', width: `${(t.count / 6) * 100}%`, background: '#8b5cf6', borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
              {/* Category Breakdown */}
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px 0', color: '#e2e8f0' }}>📊 Categories</h3>
                {analytics.categories.map(c => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: categoryColor(c.name) }} />
                    <span style={{ fontSize: 12, color: '#e2e8f0', flex: 1, textTransform: 'capitalize' }}>{c.name.replace('-', ' / ')}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: categoryColor(c.name) }}>{c.count}</span>
                  </div>
                ))}
                <div style={{ marginTop: 20, padding: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>📈 Portfolio Insights:</div>
                  <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 3 }}>🎯 Top Skill: <b style={{ color: '#e2e8f0' }}>{analytics.topSkill}</b></div>
                  <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 3 }}>👥 Avg Team Size: <b style={{ color: '#e2e8f0' }}>{analytics.avgTeamSize}</b></div>
                  <div style={{ fontSize: 12, color: '#cbd5e1' }}>💡 Most projects are <b style={{ color: '#e2e8f0' }}>web-based</b></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Testimonials Tab ──────────────────────────────────── */}
        {activeTab === 'testimonials' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {TESTIMONIALS.map((t, i) => <TestimonialCard key={i} testimonial={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}
