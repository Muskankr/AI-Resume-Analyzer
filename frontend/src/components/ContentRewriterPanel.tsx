import { useState, useMemo } from 'react';
import './ContentRewriterPanel.css';

/* ─── Types ─────────────────────────────────────────────────────────── */

interface RewriteSuggestion {
  original_text: string;
  suggested_text: string;
  issue_type: 'weak_verb' | 'passive_voice' | 'filler' | 'no_quantification' | 'too_long';
  priority: 'critical' | 'high' | 'medium' | 'low';
  impact_score: number;
  explanation: string;
  line_number: number;
}

interface ContentRewriteResult {
  total_lines_analyzed: number;
  bullet_lines_found: number;
  issues_found: number;
  overall_quality_score: number;
  suggestions: RewriteSuggestion[];
  summary: string;
  category_counts: Record<string, number>;
  top_priority_actions: RewriteSuggestion[];
}

/* ─── Constants ─────────────────────────────────────────────────────── */

const ISSUE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  weak_verb: { icon: '🔤', color: '#f97316', label: 'Weak Verb' },
  passive_voice: { icon: '🔄', color: '#eab308', label: 'Passive Voice' },
  filler: { icon: '💬', color: '#8b5cf6', label: 'Filler Phrase' },
  no_quantification: { icon: '📊', color: '#3b82f6', label: 'Missing Metric' },
  too_long: { icon: '📏', color: '#64748b', label: 'Too Long' },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string }> = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  high: { color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  medium: { color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
  low: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
};

/* ─── Sub-components ────────────────────────────────────────────────── */

function QualityGauge({ score }: { score: number }) {
  const color =
    score >= 80 ? '#22c55e' :
    score >= 60 ? '#eab308' :
    score >= 40 ? '#f97316' : '#ef4444';

  const label =
    score >= 80 ? 'Excellent' :
    score >= 60 ? 'Good' :
    score >= 40 ? 'Fair' : 'Needs Work';

  return (
    <div className="cr-gauge">
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle cx={60} cy={60} r={50} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
        <circle
          cx={60} cy={60} r={50} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${(score / 100) * 314} 314`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="cr-gauge-center">
        <div className="cr-gauge-score" style={{ color }}>{score}</div>
        <div className="cr-gauge-label">{label}</div>
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: RewriteSuggestion }) {
  const issue = ISSUE_CONFIG[suggestion.issue_type] || ISSUE_CONFIG.weak_verb;
  const priority = PRIORITY_CONFIG[suggestion.priority] || PRIORITY_CONFIG.medium;

  return (
    <div className="cr-suggestion-card">
      <div className="cr-sug-header">
        <span className="cr-sug-icon">{issue.icon}</span>
        <span className="cr-sug-type" style={{ color: issue.color }}>{issue.label}</span>
        <span
          className="cr-sug-priority"
          style={{ color: priority.color, background: priority.bg }}
        >
          {suggestion.priority}
        </span>
        <span className="cr-sug-impact">Impact: {suggestion.impact_score}/10</span>
      </div>

      <div className="cr-sug-diff">
        <div className="cr-diff-before">
          <div className="cr-diff-label">Before</div>
          <div className="cr-diff-text cr-diff-removed">{suggestion.original_text}</div>
        </div>
        <div className="cr-diff-arrow">→</div>
        <div className="cr-diff-after">
          <div className="cr-diff-label">Suggested</div>
          <div className="cr-diff-text cr-diff-added">{suggestion.suggested_text}</div>
        </div>
      </div>

      <div className="cr-sug-explanation">{suggestion.explanation}</div>
      <div className="cr-sug-meta">Line {suggestion.line_number}</div>
    </div>
  );
}

function CategoryBreakdown({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <div className="cr-categories">
      <h3 className="cr-section-title">📋 Issues by Category</h3>
      <div className="cr-cat-bars">
        {Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => {
            const config = ISSUE_CONFIG[type] || { icon: '❓', color: '#64748b', label: type };
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={type} className="cr-cat-row">
                <div className="cr-cat-info">
                  <span>{config.icon}</span>
                  <span className="cr-cat-name">{config.label}</span>
                  <span className="cr-cat-count">{count}</span>
                </div>
                <div className="cr-cat-bar-bg">
                  <div
                    className="cr-cat-bar-fill"
                    style={{ width: `${pct}%`, background: config.color }}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────── */

interface ContentRewriterPanelProps {
  result: ContentRewriteResult;
}

export default function ContentRewriterPanel({ result }: ContentRewriterPanelProps) {
  const [filter, setFilter] = useState<string>('all');
  const [showAll, setShowAll] = useState(false);

  const filteredSuggestions = useMemo(() => {
    let list = result.suggestions;
    if (filter !== 'all') {
      list = list.filter(s => s.issue_type === filter);
    }
    return showAll ? list : list.slice(0, 10);
  }, [result.suggestions, filter, showAll]);

  const filterOptions = [
    { value: 'all', label: `All (${result.suggestions.length})` },
    ...Object.entries(result.category_counts)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({
        value: type,
        label: `${ISSUE_CONFIG[type]?.label || type} (${count})`,
      })),
  ];

  return (
    <div className="cr-panel">
      {/* Header */}
      <div className="cr-header">
        <div className="cr-header-icon">✍️</div>
        <h2 className="cr-title">Content Quality Rewriter</h2>
        <p className="cr-subtitle">{result.summary}</p>
      </div>

      {/* Score + Metrics Row */}
      <div className="cr-metrics-row">
        <QualityGauge score={result.overall_quality_score} />
        <div className="cr-metrics-grid">
          <div className="cr-metric">
            <span className="cr-metric-val">{result.total_lines_analyzed}</span>
            <span className="cr-metric-lbl">Lines Analyzed</span>
          </div>
          <div className="cr-metric">
            <span className="cr-metric-val">{result.bullet_lines_found}</span>
            <span className="cr-metric-lbl">Bullets Found</span>
          </div>
          <div className="cr-metric">
            <span className="cr-metric-val" style={{ color: result.issues_found > 0 ? '#f97316' : '#22c55e' }}>
              {result.issues_found}
            </span>
            <span className="cr-metric-lbl">Issues Found</span>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <CategoryBreakdown counts={result.category_counts} />

      {/* Top Priority Actions */}
      {result.top_priority_actions.length > 0 && (
        <div className="cr-top-actions">
          <h3 className="cr-section-title">🔥 Top Priority Fixes</h3>
          <div className="cr-top-actions-list">
            {result.top_priority_actions.map((s, i) => (
              <SuggestionCard key={i} suggestion={s} />
            ))}
          </div>
        </div>
      )}

      {/* All Suggestions */}
      <div className="cr-all-suggestions">
        <h3 className="cr-section-title">📝 All Suggestions ({result.suggestions.length})</h3>

        {/* Filter bar */}
        <div className="cr-filter-bar">
          {filterOptions.map(opt => (
            <button
              key={opt.value}
              className={`cr-filter-btn ${filter === opt.value ? 'cr-filter-active' : ''}`}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="cr-suggestions-list">
          {filteredSuggestions.map((s, i) => (
            <SuggestionCard key={i} suggestion={s} />
          ))}
        </div>

        {result.suggestions.length > 10 && !showAll && filter === 'all' && (
          <button className="cr-show-more-btn" onClick={() => setShowAll(true)}>
            Show All {result.suggestions.length} Suggestions
          </button>
        )}
      </div>
    </div>
  );
}
