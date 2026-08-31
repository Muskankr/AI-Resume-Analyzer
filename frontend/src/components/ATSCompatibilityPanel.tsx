import { useState } from 'react';
import './ATSCompatibilityPanel.css';

/* ─── Types ─────────────────────────────────────────────────────────── */

interface ATSCheckItem {
  check_name: string;
  category: string;
  status: 'pass' | 'warning' | 'fail';
  score: number;
  message: string;
  suggestion: string;
  details?: Record<string, any>;
}

interface ATSCompatibilityResult {
  overall_score: number;
  grade: string;
  checks: ATSCheckItem[];
  category_scores: Record<string, number>;
  estimated_ats_pass_rate: number;
  top_fixes: ATSCheckItem[];
  summary: string;
}

/* ─── Constants ─────────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  pass: { icon: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
  warning: { icon: '⚠️', color: '#eab308', bg: 'rgba(234,179,8,0.08)' },
  fail: { icon: '❌', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
};

const CATEGORY_ICONS: Record<string, string> = {
  structure: '🏗',
  formatting: '📐',
  keywords: '🔑',
  encoding: '🔤',
  content: '📝',
};

/* ─── Sub-components ────────────────────────────────────────────────── */

function ScoreGauge({ score, label, size = 140 }: { score: number; label: string; size?: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444';
  const circumference = 2 * Math.PI * ((size - 20) / 2 - 8);
  const offset = circumference - (score / 100) * circumference;
  const center = size / 2;
  const radius = (size - 20) / 2 - 8;

  return (
    <div className="ats-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
        <circle
          cx={center} cy={center} r={radius} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="ats-gauge-center">
        <div className="ats-gauge-score" style={{ color }}>{score}</div>
        <div className="ats-gauge-label">{label}</div>
      </div>
    </div>
  );
}

function CheckCard({ check }: { check: ATSCheckItem }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[check.status] || STATUS_CONFIG.pass;

  return (
    <div className="ats-check-card" style={{ borderLeftColor: cfg.color }}>
      <div className="ats-check-header" onClick={() => setExpanded(!expanded)}>
        <span className="ats-check-icon">{cfg.icon}</span>
        <div className="ats-check-info">
          <span className="ats-check-name">{check.check_name}</span>
          <span className="ats-check-category">{CATEGORY_ICONS[check.category] || '📋'} {check.category}</span>
        </div>
        <div className="ats-check-score-wrap">
          <div className="ats-check-score-bar-bg">
            <div className="ats-check-score-bar" style={{ width: `${check.score}%`, background: cfg.color }} />
          </div>
          <span className="ats-check-score-val" style={{ color: cfg.color }}>{check.score}</span>
        </div>
        <span className="ats-chevron">{expanded ? '▴' : '▾'}</span>
      </div>
      {expanded && (
        <div className="ats-check-body">
          <p className="ats-check-message">{check.message}</p>
          <p className="ats-check-suggestion">💡 {check.suggestion}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────── */

interface ATSCompatibilityPanelProps {
  result: ATSCompatibilityResult;
}

export default function ATSCompatibilityPanel({ result }: ATSCompatibilityPanelProps) {
  const [filter, setFilter] = useState<'all' | 'fail' | 'warning' | 'pass'>('all');

  const filtered = filter === 'all'
    ? result.checks
    : result.checks.filter(c => c.status === filter);

  const passCount = result.checks.filter(c => c.status === 'pass').length;
  const warnCount = result.checks.filter(c => c.status === 'warning').length;
  const failCount = result.checks.filter(c => c.status === 'fail').length;

  return (
    <div className="ats-panel">
      {/* Header */}
      <div className="ats-header">
        <div className="ats-header-icon">🤖</div>
        <h2 className="ats-title">ATS Compatibility Check</h2>
        <p className="ats-subtitle">{result.summary}</p>
      </div>

      {/* Score Row */}
      <div className="ats-score-row">
        <ScoreGauge score={result.overall_score} label="Overall" />
        <div className="ats-score-details">
          <div className="ats-grade" style={{
            color: result.overall_score >= 80 ? '#22c55e' : result.overall_score >= 60 ? '#eab308' : '#ef4444'
          }}>
            {result.grade}
          </div>
          <div className="ats-pass-rate">
            <span className="ats-pass-label">Estimated ATS Pass Rate</span>
            <span className="ats-pass-val" style={{
              color: result.estimated_ats_pass_rate >= 70 ? '#22c55e' : '#f97316'
            }}>{result.estimated_ats_pass_rate}%</span>
          </div>
          <div className="ats-counts">
            <span className="ats-count" style={{ color: '#22c55e' }}>✅ {passCount} passed</span>
            <span className="ats-count" style={{ color: '#eab308' }}>⚠️ {warnCount} warnings</span>
            <span className="ats-count" style={{ color: '#ef4444' }}>❌ {failCount} failed</span>
          </div>
        </div>
      </div>

      {/* Category Scores */}
      <div className="ats-categories">
        <h3 className="ats-section-title">📊 Category Scores</h3>
        <div className="ats-cat-grid">
          {Object.entries(result.category_scores).map(([cat, score]) => (
            <div key={cat} className="ats-cat-card">
              <span className="ats-cat-icon">{CATEGORY_ICONS[cat] || '📋'}</span>
              <span className="ats-cat-name">{cat}</span>
              <span className="ats-cat-score" style={{
                color: score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'
              }}>{score}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Fixes */}
      {result.top_fixes.length > 0 && (
        <div className="ats-top-fixes">
          <h3 className="ats-section-title">🔧 Top Fixes</h3>
          <div className="ats-fixes-list">
            {result.top_fixes.map((fix, i) => (
              <CheckCard key={i} check={fix} />
            ))}
          </div>
        </div>
      )}

      {/* All Checks */}
      <div className="ats-all-checks">
        <h3 className="ats-section-title">📋 All Checks ({result.checks.length})</h3>
        <div className="ats-filter-bar">
          <button className={`ats-filter-btn ${filter === 'all' ? 'ats-filter-active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`ats-filter-btn ${filter === 'fail' ? 'ats-filter-active' : ''}`} onClick={() => setFilter('fail')}>❌ Failed ({failCount})</button>
          <button className={`ats-filter-btn ${filter === 'warning' ? 'ats-filter-active' : ''}`} onClick={() => setFilter('warning')}>⚠️ Warnings ({warnCount})</button>
          <button className={`ats-filter-btn ${filter === 'pass' ? 'ats-filter-active' : ''}`} onClick={() => setFilter('pass')}>✅ Passed ({passCount})</button>
        </div>
        <div className="ats-checks-list">
          {filtered.map((check, i) => (
            <CheckCard key={i} check={check} />
          ))}
        </div>
      </div>
    </div>
  );
}
