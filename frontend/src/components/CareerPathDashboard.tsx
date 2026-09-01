import { useState, useMemo } from 'react';
import './CareerPathDashboard.css';

/* ─── Types ─────────────────────────────────────────────────────────── */

interface RoadmapAction {
  title: string;
  description: string;
  action_type: 'skill' | 'project' | 'certification' | 'course' | 'soft';
  skill_name: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimated_weeks: number;
  estimated_score_impact: number;
  category: string;
  resources: string[];
}

interface RoadmapPhase {
  phase_key: string;
  label: string;
  week_start: number;
  week_end: number;
  actions: RoadmapAction[];
  phase_summary: string;
}

interface CareerPathPlan {
  target_role: string;
  experience_level: string;
  current_score: number;
  projected_score: number;
  current_skills: string[];
  missing_skills: string[];
  skills_to_learn: string[];
  total_estimated_weeks: number;
  phases: RoadmapPhase[];
  quick_wins: RoadmapAction[];
  long_term_goals: RoadmapAction[];
  summary: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────── */

const ACTION_TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  skill: { icon: '📚', color: '#8b5cf6', label: 'Skill' },
  project: { icon: '🔨', color: '#3b82f6', label: 'Project' },
  certification: { icon: '🎓', color: '#22c55e', label: 'Certification' },
  course: { icon: '🎓', color: '#06b6d4', label: 'Course' },
  soft: { icon: '🤝', color: '#f59e0b', label: 'Soft Skill' },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Critical' },
  high: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', label: 'High' },
  medium: { color: '#eab308', bg: 'rgba(234,179,8,0.12)', label: 'Medium' },
  low: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: 'Low' },
};

const PHASE_COLORS: Record<string, string> = {
  foundation: '#ef4444',
  growth: '#f97316',
  mastery: '#8b5cf6',
  showcase: '#22c55e',
};

function formatWeeks(weeks: number): string {
  if (weeks === 0) return 'Ongoing';
  if (weeks === 1) return '1 week';
  return `${weeks} weeks`;
}

/* ─── Sub-components ────────────────────────────────────────────────── */

function ScoreComparison({ current, projected }: { current: number; projected: number }) {
  const gain = projected - current;
  return (
    <div className="cp-score-comparison">
      <div className="cp-score-card cp-score-current">
        <div className="cp-score-label">Current Score</div>
        <div className="cp-score-value">{current}</div>
        <div className="cp-score-max">/100</div>
      </div>
      <div className="cp-score-arrow">
        <div className="cp-arrow-icon">→</div>
        {gain > 0 && (
          <div className="cp-score-gain">+{gain} pts</div>
        )}
      </div>
      <div className="cp-score-card cp-score-projected">
        <div className="cp-score-label">Projected Score</div>
        <div className="cp-score-value">{projected}</div>
        <div className="cp-score-max">/100</div>
      </div>
    </div>
  );
}

function SkillChip({ name, status }: { name: string; status: 'matched' | 'missing' }) {
  const isMatched = status === 'matched';
  return (
    <span
      className={`cp-skill-chip ${isMatched ? 'cp-skill-matched' : 'cp-skill-missing'}`}
    >
      {isMatched ? '✓' : '+'} {name}
    </span>
  );
}

function ActionCard({ action, index }: { action: RoadmapAction; index: number }) {
  const typeConfig = ACTION_TYPE_CONFIG[action.action_type] || ACTION_TYPE_CONFIG.skill;
  const priorityConfig = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.medium;

  return (
    <div className="cp-action-card">
      <div className="cp-action-header">
        <span className="cp-action-icon">{typeConfig.icon}</span>
        <div className="cp-action-title">{action.title}</div>
        <span
          className="cp-action-priority"
          style={{ color: priorityConfig.color, background: priorityConfig.bg }}
        >
          {priorityConfig.label}
        </span>
      </div>
      <p className="cp-action-description">{action.description}</p>
      <div className="cp-action-meta">
        <span className="cp-meta-item">
          ⏱ {formatWeeks(action.estimated_weeks)}
        </span>
        <span className="cp-meta-item cp-impact">
          📈 +{action.estimated_score_impact} pts
        </span>
        <span className="cp-meta-item cp-type-badge" style={{ color: typeConfig.color }}>
          {typeConfig.label}
        </span>
      </div>
      {action.resources.length > 0 && (
        <div className="cp-action-resources">
          {action.resources.map((r, i) => (
            <span key={i} className="cp-resource-tag">{r}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function PhaseCard({ phase, isExpanded, onToggle }: {
  phase: RoadmapPhase;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const color = PHASE_COLORS[phase.phase_key] || '#8b5cf6';
  const actionCount = phase.actions.length;

  return (
    <div className="cp-phase-card" style={{ borderLeftColor: color }}>
      <div className="cp-phase-header" onClick={onToggle}>
        <div className="cp-phase-info">
          <div className="cp-phase-indicator" style={{ background: color }} />
          <div>
            <div className="cp-phase-title">{phase.label}</div>
            <div className="cp-phase-time">
              Weeks {phase.week_start}–{phase.week_end} · {actionCount} action{actionCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div className={`cp-phase-chevron ${isExpanded ? 'cp-expanded' : ''}`}>
          ▾
        </div>
      </div>
      {isExpanded && (
        <div className="cp-phase-body">
          <p className="cp-phase-summary">{phase.phase_summary}</p>
          <div className="cp-phase-actions">
            {phase.actions.map((action, i) => (
              <ActionCard key={i} action={action} index={i} />
            ))}
          </div>
          {actionCount === 0 && (
            <div className="cp-phase-empty">No actions in this phase — great progress!</div>
          )}
        </div>
      )}
    </div>
  );
}

function QuickWinsPanel({ actions }: { actions: RoadmapAction[] }) {
  if (actions.length === 0) return null;
  return (
    <div className="cp-quick-wins">
      <h3 className="cp-section-title">⚡ Quick Wins</h3>
      <p className="cp-section-subtitle">High-impact actions you can start this week</p>
      <div className="cp-quick-wins-grid">
        {actions.map((action, i) => (
          <div key={i} className="cp-quick-win-card">
            <div className="cp-qw-header">
              <span>{ACTION_TYPE_CONFIG[action.action_type]?.icon || '📚'}</span>
              <span className="cp-qw-title">{action.title}</span>
            </div>
            <div className="cp-qw-meta">
              <span>{formatWeeks(action.estimated_weeks)}</span>
              <span className="cp-qw-impact">+{action.estimated_score_impact} pts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────── */

interface CareerPathDashboardProps {
  plan: CareerPathPlan;
}

export default function CareerPathDashboard({ plan }: CareerPathDashboardProps) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(
    plan.phases[0]?.phase_key || null
  );

  const togglePhase = (key: string) => {
    setExpandedPhase(prev => (prev === key ? null : key));
  };

  const progressPercent = useMemo(() => {
    if (plan.total_estimated_weeks === 0) return 0;
    return Math.min(100, Math.round(
      ((plan.projected_score - plan.current_score) / (100 - plan.current_score)) * 100
    ));
  }, [plan.current_score, plan.projected_score, plan.total_estimated_weeks]);

  return (
    <div className="cp-dashboard">
      {/* Header */}
      <div className="cp-header">
        <div className="cp-header-icon">🧭</div>
        <h1 className="cp-title">Career Path Plan</h1>
        <p className="cp-subtitle">
          {plan.experience_level} {plan.target_role} · {plan.total_estimated_weeks} week roadmap
        </p>
      </div>

      {/* Score Comparison */}
      <ScoreComparison current={plan.current_score} projected={plan.projected_score} />

      {/* Progress bar */}
      <div className="cp-progress-section">
        <div className="cp-progress-bar-bg">
          <div
            className="cp-progress-bar-fill"
            style={{
              width: `${progressPercent}%`,
              background: `linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e)`,
            }}
          />
        </div>
        <div className="cp-progress-labels">
          <span>{plan.current_score}%</span>
          <span className="cp-progress-pct">{progressPercent}% improvement potential</span>
          <span>{plan.projected_score}%</span>
        </div>
      </div>

      {/* Summary */}
      <div className="cp-summary-card">
        <p>{plan.summary}</p>
      </div>

      {/* Skills Overview */}
      <div className="cp-skills-overview">
        <div className="cp-skills-section">
          <h3 className="cp-section-title">✅ Current Skills ({plan.current_skills.length})</h3>
          <div className="cp-skill-chips">
            {plan.current_skills.map((s, i) => (
              <SkillChip key={i} name={s} status="matched" />
            ))}
          </div>
        </div>
        <div className="cp-skills-section">
          <h3 className="cp-section-title">🎯 Skills to Learn ({plan.missing_skills.length})</h3>
          <div className="cp-skill-chips">
            {plan.missing_skills.map((s, i) => (
              <SkillChip key={i} name={s} status="missing" />
            ))}
          </div>
        </div>
      </div>

      {/* Quick Wins */}
      <QuickWinsPanel actions={plan.quick_wins} />

      {/* Timeline Phases */}
      <div className="cp-phases-section">
        <h3 className="cp-section-title">📋 Development Roadmap</h3>
        <div className="cp-phases-timeline">
          {plan.phases.map(phase => (
            <PhaseCard
              key={phase.phase_key}
              phase={phase}
              isExpanded={expandedPhase === phase.phase_key}
              onToggle={() => togglePhase(phase.phase_key)}
            />
          ))}
        </div>
      </div>

      {/* Long-term Goals */}
      {plan.long_term_goals.length > 0 && (
        <div className="cp-long-term">
          <h3 className="cp-section-title">🏔 Long-term Mastery Goals</h3>
          <p className="cp-section-subtitle">
            Deepen expertise in skills you already have
          </p>
          <div className="cp-long-term-grid">
            {plan.long_term_goals.map((goal, i) => (
              <ActionCard key={i} action={goal} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
