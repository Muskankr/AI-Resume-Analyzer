import { useState, useMemo } from 'react';
import './ScoreHistoryDashboard.css';

/* ─── Types ─────────────────────────────────────────────────────────── */

interface ScoreDataPoint {
  analysis_id: number;
  score: number;
  target_role: string;
  created_at: string;
  skills_count: number;
  matched_count: number;
  missing_count: number;
  file_name: string;
}

interface TrendStats {
  current_score: number;
  highest_score: number;
  lowest_score: number;
  average_score: number;
  median_score: number;
  total_analyses: number;
  score_range: number;
  std_deviation: number;
}

interface ImprovementMetrics {
  total_improvement: number;
  average_improvement_per_analysis: number;
  improvement_rate_percent: number;
  analyses_with_improvement: number;
  analyses_with_decline: number;
  analyses_unchanged: number;
  best_single_jump: number;
  improvement_streak: number;
  longest_streak: number;
}

interface SkillProgression {
  total_unique_skills: number;
  consistently_matched: string[];
  newly_acquired: string[];
  lost_skills: string[];
  skill_frequency: Record<string, number>;
  skill_trend: Array<{ skill: string; presence: boolean[]; appearances: number }>;
}

interface MonthlyData {
  month: string;
  analysis_count: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  score_delta: number;
}

interface RolePerformance {
  role: string;
  analysis_count: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  most_common_matched: string[];
  most_common_missing: string[];
}

interface ScoreHistoryResult {
  timeline: ScoreDataPoint[];
  trend_stats: TrendStats;
  improvement_metrics: ImprovementMetrics;
  skill_progression: SkillProgression;
  monthly_data: MonthlyData[];
  role_performance: RolePerformance[];
  moving_average: (number | null)[];
  summary: string;
}

/* ─── Sparkline Component ───────────────────────────────────────────── */

function Sparkline({ data, width = 200, height = 40, color = '#22c55e' }: {
  data: (number | null)[]; width?: number; height?: number; color?: string;
}) {
  const validData = data.filter((d): d is number => d !== null);
  if (validData.length < 2) return null;

  const min = Math.min(...validData);
  const max = Math.max(...validData);
  const range = max - min || 1;
  const padding = 4;
  const w = width - padding * 2;
  const h = height - padding * 2;

  const points = validData.map((val, i) => {
    const x = padding + (i / (validData.length - 1)) * w;
    const y = padding + h - ((val - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${padding},${padding + h} ${points} ${padding + w},${padding + h}`;

  return (
    <svg width={width} height={height} className="sh-sparkline">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkGrad)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {validData.length > 0 && (
        <circle
          cx={padding + w}
          cy={padding + h - ((validData[validData.length - 1] - min) / range) * h}
          r={3}
          fill={color}
        />
      )}
    </svg>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────────────── */

function StatCard({ label, value, subtext, color }: {
  label: string; value: string | number; subtext?: string; color?: string;
}) {
  return (
    <div className="sh-stat-card">
      <div className="sh-stat-value" style={color ? { color } : undefined}>{value}</div>
      <div className="sh-stat-label">{label}</div>
      {subtext && <div className="sh-stat-subtext">{subtext}</div>}
    </div>
  );
}

/* ─── Timeline Chart ────────────────────────────────────────────────── */

function TimelineChart({ timeline, movingAverage }: {
  timeline: ScoreDataPoint[]; movingAverage: (number | null)[];
}) {
  if (timeline.length === 0) return null;

  const scores = timeline.map(t => t.score);
  const min = Math.min(...scores) - 5;
  const max = Math.max(...scores) + 5;
  const range = max - min || 1;
  const w = 700;
  const h = 200;
  const pad = 40;

  const points = scores.map((s, i) => {
    const x = pad + (i / Math.max(1, scores.length - 1)) * (w - pad * 2);
    const y = pad + (h - pad * 2) - ((s - min) / range) * (h - pad * 2);
    return { x, y, score: s, point: timeline[i] };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Moving average line
  const maPoints = movingAverage
    .map((val, i) => {
      if (val === null) return null;
      const x = pad + (i / Math.max(1, scores.length - 1)) * (w - pad * 2);
      const y = pad + (h - pad * 2) - ((val - min) / range) * (h - pad * 2);
      return { x, y };
    })
    .filter(Boolean) as Array<{ x: number; y: number }>;

  const maPath = maPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Y-axis ticks
  const yTicks = [min, (min + max) / 2, max].map(v => ({
    value: Math.round(v),
    y: pad + (h - pad * 2) - ((v - min) / range) * (h - pad * 2),
  }));

  return (
    <div className="sh-timeline-chart">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line x1={pad} y1={tick.y} x2={w - pad} y2={tick.y} stroke="rgba(255,255,255,0.06)" />
            <text x={pad - 8} y={tick.y + 4} fill="#64748b" fontSize={10} textAnchor="end">{tick.value}</text>
          </g>
        ))}

        {/* Moving average */}
        {maPath && <path d={maPath} fill="none" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 4" opacity={0.6} />}

        {/* Score line */}
        <path d={linePath} fill="none" stroke="#22c55e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill="#22c55e" stroke="#0f172a" strokeWidth={2} />
        ))}
      </svg>
      <div className="sh-chart-legend">
        <span className="sh-legend-item"><span className="sh-legend-dot" style={{ background: '#22c55e' }} /> Score</span>
        <span className="sh-legend-item"><span className="sh-legend-dot" style={{ background: '#8b5cf6' }} /> Moving Avg</span>
      </div>
    </div>
  );
}

/* ─── Skill Progression Panel ───────────────────────────────────────── */

function SkillProgressionPanel({ progression }: { progression: SkillProgression }) {
  return (
    <div className="sh-panel">
      <h3 className="sh-section-title">🎯 Skill Progression</h3>
      <div className="sh-skill-stats">
        <span>{progression.total_unique_skills} unique skills tracked</span>
      </div>
      {progression.newly_acquired.length > 0 && (
        <div className="sh-skill-group">
          <h4 className="sh-skill-group-title" style={{ color: '#22c55e' }}>✅ Newly Acquired</h4>
          <div className="sh-skill-chips">
            {progression.newly_acquired.map(s => (
              <span key={s} className="sh-skill-chip sh-skill-new">{s}</span>
            ))}
          </div>
        </div>
      )}
      {progression.lost_skills.length > 0 && (
        <div className="sh-skill-group">
          <h4 className="sh-skill-group-title" style={{ color: '#ef4444' }}>⚠️ No Longer Matched</h4>
          <div className="sh-skill-chips">
            {progression.lost_skills.map(s => (
              <span key={s} className="sh-skill-chip sh-skill-lost">{s}</span>
            ))}
          </div>
        </div>
      )}
      {progression.consistently_matched.length > 0 && (
        <div className="sh-skill-group">
          <h4 className="sh-skill-group-title" style={{ color: '#3b82f6' }}>💪 Consistent Skills</h4>
          <div className="sh-skill-chips">
            {progression.consistently_matched.slice(0, 8).map(s => (
              <span key={s} className="sh-skill-chip sh-skill-consistent">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────── */

interface ScoreHistoryDashboardProps {
  data: ScoreHistoryResult;
}

export default function ScoreHistoryDashboard({ data }: ScoreHistoryDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'roles'>('overview');
  const { trend_stats: stats, improvement_metrics: imp, timeline } = data;

  const trendColor = imp.total_improvement > 0 ? '#22c55e' :
    imp.total_improvement < 0 ? '#ef4444' : '#94a3b8';

  if (timeline.length === 0) {
    return (
      <div className="sh-dashboard">
        <div className="sh-header">
          <div className="sh-header-icon">📈</div>
          <h1 className="sh-title">Score History</h1>
          <p className="sh-empty">No analysis history yet. Upload a resume to start tracking your progress.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sh-dashboard">
      {/* Header */}
      <div className="sh-header">
        <div className="sh-header-icon">📈</div>
        <h1 className="sh-title">Score History & Trends</h1>
        <p className="sh-summary">{data.summary}</p>
      </div>

      {/* Key Stats */}
      <div className="sh-stats-row">
        <StatCard label="Current" value={stats.current_score} color="#22c55e" />
        <StatCard label="Average" value={stats.average_score} color="#3b82f6" />
        <StatCard label="Highest" value={stats.highest_score} color="#8b5cf6" />
        <StatCard
          label="Improvement"
          value={`${imp.total_improvement > 0 ? '+' : ''}${imp.total_improvement}`}
          subtext={`${imp.improvement_rate_percent}%`}
          color={trendColor}
        />
        <StatCard label="Analyses" value={stats.total_analyses} />
      </div>

      {/* Sparkline */}
      <div className="sh-sparkline-section">
        <Sparkline data={data.moving_average} width={800} height={60} />
      </div>

      {/* Timeline Chart */}
      <div className="sh-panel">
        <h3 className="sh-section-title">📊 Score Timeline</h3>
        <TimelineChart timeline={timeline} movingAverage={data.moving_average} />
      </div>

      {/* Improvement Metrics */}
      <div className="sh-panel">
        <h3 className="sh-section-title">🚀 Improvement Metrics</h3>
        <div className="sh-imp-grid">
          <div className="sh-imp-item">
            <span className="sh-imp-val" style={{ color: '#22c55e' }}>{imp.analyses_with_improvement}</span>
            <span className="sh-imp-lbl">Improved</span>
          </div>
          <div className="sh-imp-item">
            <span className="sh-imp-val" style={{ color: '#ef4444' }}>{imp.analyses_with_decline}</span>
            <span className="sh-imp-lbl">Declined</span>
          </div>
          <div className="sh-imp-item">
            <span className="sh-imp-val" style={{ color: '#94a3b8' }}>{imp.analyses_unchanged}</span>
            <span className="sh-imp-lbl">Unchanged</span>
          </div>
          <div className="sh-imp-item">
            <span className="sh-imp-val" style={{ color: '#f97316' }}>+{imp.best_single_jump}</span>
            <span className="sh-imp-lbl">Best Jump</span>
          </div>
          <div className="sh-imp-item">
            <span className="sh-imp-val" style={{ color: '#8b5cf6' }}>{imp.improvement_streak}</span>
            <span className="sh-imp-lbl">Current Streak</span>
          </div>
          <div className="sh-imp-item">
            <span className="sh-imp-val" style={{ color: '#eab308' }}>{imp.longest_streak}</span>
            <span className="sh-imp-lbl">Longest Streak</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sh-tabs">
        <button className={`sh-tab ${activeTab === 'overview' ? 'sh-tab-active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`sh-tab ${activeTab === 'skills' ? 'sh-tab-active' : ''}`} onClick={() => setActiveTab('skills')}>Skills</button>
        <button className={`sh-tab ${activeTab === 'roles' ? 'sh-tab-active' : ''}`} onClick={() => setActiveTab('roles')}>Roles</button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Monthly Data */}
          {data.monthly_data.length > 0 && (
            <div className="sh-panel">
              <h3 className="sh-section-title">📅 Monthly Breakdown</h3>
              <div className="sh-monthly-list">
                {data.monthly_data.map(m => (
                  <div key={m.month} className="sh-monthly-row">
                    <span className="sh-month-label">{m.month}</span>
                    <span className="sh-month-count">{m.analysis_count} analyses</span>
                    <span className="sh-month-avg">{m.average_score} avg</span>
                    <span className="sh-month-delta" style={{ color: m.score_delta > 0 ? '#22c55e' : m.score_delta < 0 ? '#ef4444' : '#94a3b8' }}>
                      {m.score_delta > 0 ? '+' : ''}{m.score_delta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Timeline */}
          <div className="sh-panel">
            <h3 className="sh-section-title">🕐 Recent Analyses</h3>
            <div className="sh-timeline-list">
              {timeline.slice().reverse().slice(0, 10).map(point => (
                <div key={point.analysis_id} className="sh-timeline-item">
                  <div className="sh-tl-score" style={{
                    color: point.score >= 70 ? '#22c55e' : point.score >= 50 ? '#eab308' : '#ef4444'
                  }}>{point.score}</div>
                  <div className="sh-tl-info">
                    <div className="sh-tl-role">{point.target_role || 'General'}</div>
                    <div className="sh-tl-meta">{point.file_name} · {point.matched_count} matched · {point.missing_count} missing</div>
                  </div>
                  <div className="sh-tl-date">{new Date(point.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'skills' && (
        <SkillProgressionPanel progression={data.skill_progression} />
      )}

      {activeTab === 'roles' && (
        <div className="sh-panel">
          <h3 className="sh-section-title">💼 Performance by Role</h3>
          <div className="sh-role-list">
            {data.role_performance.map(rp => (
              <div key={rp.role} className="sh-role-card">
                <div className="sh-role-header">
                  <span className="sh-role-name">{rp.role}</span>
                  <span className="sh-role-avg" style={{
                    color: rp.average_score >= 70 ? '#22c55e' : rp.average_score >= 50 ? '#eab308' : '#ef4444'
                  }}>{rp.average_score}</span>
                </div>
                <div className="sh-role-meta">{rp.analysis_count} analyses · {rp.lowest_score}–{rp.highest_score} range</div>
                {rp.most_common_missing.length > 0 && (
                  <div className="sh-role-skills">
                    <span className="sh-role-skills-label">Common gaps:</span>
                    {rp.most_common_missing.slice(0, 4).map(s => (
                      <span key={s} className="sh-skill-chip sh-skill-lost">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
