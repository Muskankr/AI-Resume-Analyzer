import React from 'react';
import type {
  ResumeTemplate, ExportJob, SectionOptimization, DesignElement
} from './presentationTypes';
import {
  STYLE_COLORS, STYLE_ICONS, LAYOUT_ICONS, FORMAT_COLORS,
  STATUS_COLORS, getScoreColor, formatFileSize
} from './presentationTypes';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, subtitle }) => (
  <div style={{ background: '#1e1e2e', borderRadius: 12, padding: '20px 16px', borderLeft: `4px solid ${color}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{label}</span>
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    {subtitle && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{subtitle}</div>}
  </div>
);

interface TemplateCardProps {
  template: ResumeTemplate;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template, isSelected, onSelect }) => (
  <div onClick={onSelect} style={{
    background: '#1e1e2e', borderRadius: 12, padding: 16, cursor: 'pointer',
    border: isSelected ? '2px solid #6366f1' : '2px solid transparent',
    borderLeft: `4px solid ${STYLE_COLORS[template.style]}`,
    transition: 'all 0.2s'
  }}>
    {/* Preview mockup */}
    <div style={{
      height: 120, borderRadius: 8, marginBottom: 12,
      background: `linear-gradient(135deg, ${template.primaryColor}15, ${template.secondaryColor}30)`,
      border: `1px solid ${template.primaryColor}30`,
      display: 'flex', flexDirection: 'column', padding: 10, gap: 4
    }}>
      <div style={{ height: 8, width: '60%', background: template.primaryColor, borderRadius: 2, opacity: 0.6 }} />
      <div style={{ height: 4, width: '40%', background: '#999', borderRadius: 2, opacity: 0.3 }} />
      <div style={{ height: 2, width: '80%', background: '#666', borderRadius: 1, opacity: 0.2, marginTop: 6 }} />
      <div style={{ height: 2, width: '90%', background: '#666', borderRadius: 1, opacity: 0.2 }} />
      <div style={{ height: 2, width: '70%', background: '#666', borderRadius: 1, opacity: 0.2 }} />
      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
        {[1,2,3].map(i => <div key={i} style={{ height: 3, width: 30, background: template.primaryColor, borderRadius: 1, opacity: 0.4 }} />)}
      </div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{template.name}</span>
      {template.isPremium && (
        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#f59e0b20', color: '#f59e0b', fontWeight: 600 }}>✨ PRO</span>
      )}
    </div>
    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{template.description}</div>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: `${STYLE_COLORS[template.style]}20`, color: STYLE_COLORS[template.style] }}>
        {STYLE_ICONS[template.style]} {template.style}
      </span>
      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#2d2d3f', color: 'rgba(255,255,255,0.5)' }}>
        {LAYOUT_ICONS[template.layout]} {template.layout.replace(/_/g, ' ')}
      </span>
      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#2d2d3f', color: 'rgba(255,255,255,0.5)' }}>
        {template.fontFamily} {template.fontSize}pt
      </span>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
      <span>⭐ {template.popularity}% popularity</span>
      <span>{template.primaryColor}</span>
    </div>
  </div>
);

interface ExportJobCardProps {
  job: ExportJob;
}

export const ExportJobCard: React.FC<ExportJobCardProps> = ({ job }) => (
  <div style={{
    background: '#1e1e2e', borderRadius: 10, padding: 14,
    borderLeft: `3px solid ${STATUS_COLORS[job.status]}`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{job.fileName}</span>
      <span style={{
        fontSize: 11, padding: '2px 8px', borderRadius: 10,
        background: `${STATUS_COLORS[job.status]}20`, color: STATUS_COLORS[job.status], fontWeight: 600
      }}>{job.status}</span>
    </div>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
      <span style={{ color: FORMAT_COLORS[job.format] }}>📄 {job.format}</span>
      <span>📏 {job.pageCount} page{job.pageCount > 1 ? 's' : ''}</span>
      <span>📝 {job.wordCount} words</span>
      {job.fileSizeKb && <span>💾 {formatFileSize(job.fileSizeKb)}</span>}
    </div>
    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
      {job.optimizationLevel !== 'NONE' && (
        <span style={{ padding: '1px 6px', borderRadius: 4, background: '#22c55e15', color: '#22c55e', marginRight: 6 }}>
          {job.optimizationLevel.replace(/_/g, ' ')}
        </span>
      )}
      {new Date(job.createdAt).toLocaleString()}
    </div>
  </div>
);

interface OptimizationCardProps {
  optimization: SectionOptimization;
}

export const OptimizationCard: React.FC<OptimizationCardProps> = ({ optimization }) => {
  const wordDiff = optimization.currentWordCount - optimization.recommendedWordCount;
  return (
    <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 16, borderLeft: `4px solid ${getScoreColor(optimization.impactScore)}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{optimization.sectionName}</span>
        <span style={{ fontSize: 12, color: wordDiff > 0 ? '#f59e0b' : '#22c55e' }}>
          {wordDiff > 0 ? `✂️ Trim ${wordDiff} words` : '✅ Good length'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Readability</span>
            <span style={{ color: getScoreColor(optimization.readabilityScore), fontWeight: 600 }}>{optimization.readabilityScore}%</span>
          </div>
          <div style={{ height: 4, background: '#2d2d3f', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${optimization.readabilityScore}%`, background: getScoreColor(optimization.readabilityScore), borderRadius: 2 }} />
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Impact</span>
            <span style={{ color: getScoreColor(optimization.impactScore), fontWeight: 600 }}>{optimization.impactScore}%</span>
          </div>
          <div style={{ height: 4, background: '#2d2d3f', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${optimization.impactScore}%`, background: getScoreColor(optimization.impactScore), borderRadius: 2 }} />
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
        📝 {optimization.currentWordCount} / {optimization.recommendedWordCount} recommended words
      </div>
      {optimization.suggestions.map((s, i) => (
        <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>💡 {s}</div>
      ))}
    </div>
  );
};

interface DesignElementCardProps {
  element: DesignElement;
  onToggle?: () => void;
}

export const DesignElementCard: React.FC<DesignElementCardProps> = ({ element, onToggle }) => (
  <div style={{
    background: '#1e1e2e', borderRadius: 10, padding: 14,
    border: `1px solid ${element.isEnabled ? '#6366f140' : '#2d2d3f'}`,
    opacity: element.isEnabled ? 1 : 0.7
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 24 }}>{element.previewIcon}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>{element.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{element.description}</div>
        </div>
      </div>
      <button onClick={onToggle} style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: element.isEnabled ? '#6366f1' : '#2d2d3f',
        position: 'relative', transition: 'all 0.2s'
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: 9, background: '#fff',
          position: 'absolute', top: 3,
          left: element.isEnabled ? 23 : 3,
          transition: 'left 0.2s'
        }} />
      </button>
    </div>
    {element.premiumOnly && (
      <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 6 }}>✨ Premium feature</div>
    )}
  </div>
);

interface ScoreCardProps {
  score: { aspect: string; score: number; maxScore: number; tips: string[] };
}

export const PresentationScoreCard: React.FC<ScoreCardProps> = ({ score }) => {
  const pct = Math.round((score.score / score.maxScore) * 100);
  return (
    <div style={{ background: '#1e1e2e', borderRadius: 10, padding: 14, borderLeft: `3px solid ${getScoreColor(pct)}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{score.aspect}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: getScoreColor(pct) }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: '#2d2d3f', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: getScoreColor(pct), borderRadius: 3 }} />
      </div>
      {score.tips.map((tip, i) => (
        <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>💡 {tip}</div>
      ))}
    </div>
  );
};
