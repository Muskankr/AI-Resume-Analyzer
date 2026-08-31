import { useState, useMemo } from 'react';
import './AchievementQuantifierPanel.css';

/* ─── Types ─────────────────────────────────────────────────────────── */

interface MetricSuggestion {
  template: string;
  example: string;
  category: string;
  confidence: number;
}

interface BulletQuantification {
  original_text: string;
  line_number: number;
  detected_verb: string | null;
  detected_category: string | null;
  is_quantified: boolean;
  suggestions: MetricSuggestion[];
  priority: string;
  estimated_impact: number;
}

interface QuantificationResult {
  total_bullets: number;
  quantified_bullets: number;
  unquantified_bullets: number;
  quantification_rate: number;
  overall_impact_score: number;
  bullet_analyses: BulletQuantification[];
  top_quick_wins: BulletQuantification[];
  category_coverage: Record<string, number>;
  summary: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────── */

const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
  high: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  medium: { color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
  low: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
};

const CATEGORY_LABELS: Record<string, string> = {
  performance: '⚡ Performance',
  efficiency: '🔄 Efficiency',
  revenue: '💰 Revenue',
  users: '👥 Users',
  cost: '📉 Cost',
  time: '⏱ Time',
  team_size: '👔 Team',
  features: '🚀 Features',
  systems: '🏗 Systems',
  general: '📊 General',
};

/* ─── Sub-components ────────────────────────────────────────────────── */

function QuantGauge({ rate }: { rate: number }) {
  const color = rate >= 80 ? '#22c55e' : rate >= 60 ? '#eab308' : rate >= 40 ? '#f97316' : '#ef4444';
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (rate / 100) * circumference;

  return (
    <div className="aq-gauge">
      <svg width={110} height={110} viewBox="0 0 110 110">
        <circle cx={55} cy={55} r={45} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
        <circle
          cx={55} cy={55} r={45} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 55 55)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="aq-gauge-center">
        <div className="aq-gauge-val" style={{ color }}>{rate}%</div>
        <div className="aq-gauge-lbl">Quantified</div>
      </div>
    </div>
  );
}

function BulletCard({ bullet }: { bullet: BulletQuantification }) {
  const [expanded, setExpanded] = useState(false);
  const pri = PRIORITY_COLORS[bullet.priority] || PRIORITY_COLORS.medium;

  return (
    <div className={`aq-bullet-card ${bullet.is_quantified ? 'aq-quantified' : 'aq-unquantified'}`}>
      <div className="aq-bullet-header" onClick={() => setExpanded(!expanded)}>
        <div className="aq-bullet-status">
          {bullet.is_quantified ? '✅' : '🔢'}
        </div>
        <div className="aq-bullet-text">{bullet.original_text}</div>
        <div className="aq-bullet-badges">
          {bullet.detected_verb && (
            <span className="aq-verb-badge">{bullet.detected_verb}</span>
          )}
          <span className="aq-priority-badge" style={{ color: pri.color, background: pri.bg }}>
            {bullet.priority}
          </span>
          <span className="aq-chevron">{expanded ? '▴' : '▾'}</span>
        </div>
      </div>

      {expanded && !bullet.is_quantified && bullet.suggestions.length > 0 && (
        <div className="aq-bullet-suggestions">
          <div className="aq-sug-label">💡 Suggested Metrics</div>
          {bullet.suggestions.map((s, i) => (
            <div key={i} className="aq-suggestion">
              <div className="aq-sug-template">{s.template}</div>
              <div className="aq-sug-example">e.g., "{s.example}"</div>
              <div className="aq-sug-confidence">Confidence: {Math.round(s.confidence * 100)}%</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────── */

interface AchievementQuantifierPanelProps {
  result: QuantificationResult;
}

export default function AchievementQuantifierPanel({ result }: AchievementQuantifierPanelProps) {
  const [filter, setFilter] = useState<'all' | 'unquantified' | 'quantified'>('all');

  const filtered = useMemo(() => {
    if (filter === 'unquantified') return result.bullet_analyses.filter(b => !b.is_quantified);
    if (filter === 'quantified') return result.bullet_analyses.filter(b => b.is_quantified);
    return result.bullet_analyses;
  }, [result.bullet_analyses, filter]);

  const topCategories = Object.entries(result.category_coverage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <div className="aq-panel">
      <div className="aq-header">
        <div className="aq-header-icon">🔢</div>
        <h2 className="aq-title">Achievement Quantifier</h2>
        <p className="aq-subtitle">{result.summary}</p>
      </div>

      {/* Metrics Row */}
      <div className="aq-metrics-row">
        <QuantGauge rate={result.quantification_rate} />
        <div className="aq-metrics-grid">
          <div className="aq-metric">
            <span className="aq-metric-val">{result.total_bullets}</span>
            <span className="aq-metric-lbl">Total Bullets</span>
          </div>
          <div className="aq-metric">
            <span className="aq-metric-val" style={{ color: '#22c55e' }}>{result.quantified_bullets}</span>
            <span className="aq-metric-lbl">Quantified</span>
          </div>
          <div className="aq-metric">
            <span className="aq-metric-val" style={{ color: '#f97316' }}>{result.unquantified_bullets}</span>
            <span className="aq-metric-lbl">Need Metrics</span>
          </div>
          <div className="aq-metric">
            <span className="aq-metric-val" style={{ color: '#3b82f6' }}>{result.overall_impact_score}</span>
            <span className="aq-metric-lbl">Impact Score</span>
          </div>
        </div>
      </div>

      {/* Top Quick Wins */}
      {result.top_quick_wins.length > 0 && (
        <div className="aq-quick-wins">
          <h3 className="aq-section-title">🔥 Top Quick Wins — Add Metrics Here First</h3>
          <div className="aq-quick-wins-list">
            {result.top_quick_wins.map((b, i) => (
              <BulletCard key={i} bullet={b} />
            ))}
          </div>
        </div>
      )}

      {/* Category Coverage */}
      {topCategories.length > 0 && (
        <div className="aq-categories">
          <h3 className="aq-section-title">📊 Categories Detected</h3>
          <div className="aq-cat-chips">
            {topCategories.map(([cat, count]) => (
              <span key={cat} className="aq-cat-chip">
                {CATEGORY_LABELS[cat] || cat} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* All Bullets */}
      <div className="aq-all-bullets">
        <h3 className="aq-section-title">📝 All Bullet Points ({result.bullet_analyses.length})</h3>
        <div className="aq-filter-bar">
          <button className={`aq-filter-btn ${filter === 'all' ? 'aq-filter-active' : ''}`} onClick={() => setFilter('all')}>
            All ({result.total_bullets})
          </button>
          <button className={`aq-filter-btn ${filter === 'unquantified' ? 'aq-filter-active' : ''}`} onClick={() => setFilter('unquantified')}>
            Need Metrics ({result.unquantified_bullets})
          </button>
          <button className={`aq-filter-btn ${filter === 'quantified' ? 'aq-filter-active' : ''}`} onClick={() => setFilter('quantified')}>
            Quantified ({result.quantified_bullets})
          </button>
        </div>
        <div className="aq-bullet-list">
          {filtered.map((b, i) => (
            <BulletCard key={i} bullet={b} />
          ))}
        </div>
      </div>
    </div>
  );
}
