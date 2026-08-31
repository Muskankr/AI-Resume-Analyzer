import React from 'react';
import type {
  JobPosting, MatchScoreBreakdown, RecommendedEdit,
  CompanyMatchHistory, JobKeyword, SectionScore
} from './jobMatchTypes';
import {
  GRADE_COLORS, CATEGORY_COLORS, RELEVANCE_COLORS,
  INDUSTRY_ICONS, WORKMODE_ICONS, formatSalary
} from './jobMatchTypes';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, subtitle }) => (
  <div style={{
    background: '#1e1e2e',
    borderRadius: 12,
    padding: '20px 16px',
    borderLeft: `4px solid ${color}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{label}</span>
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    {subtitle && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{subtitle}</div>}
  </div>
);

interface JobCardProps {
  job: JobPosting;
  matchScore?: number;
  matchGrade?: string;
}

export const JobCard: React.FC<JobCardProps> = ({ job, matchScore, matchGrade }) => (
  <div style={{
    background: '#1e1e2e',
    borderRadius: 12,
    padding: 18,
    borderLeft: `4px solid ${matchScore ? GRADE_COLORS[matchGrade as keyof typeof GRADE_COLORS] || '#6b7280' : '#6b7280'}`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>{job.companyLogo}</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{job.title}</span>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{job.company} · {job.location}</div>
      </div>
      {matchGrade && (
        <div style={{
          fontSize: 20, fontWeight: 800, color: GRADE_COLORS[matchGrade as keyof typeof GRADE_COLORS],
          background: `${GRADE_COLORS[matchGrade as keyof typeof GRADE_COLORS]}15`,
          padding: '4px 12px', borderRadius: 8
        }}>{matchGrade}</div>
      )}
    </div>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10, fontSize: 12 }}>
      <span style={{ padding: '2px 8px', borderRadius: 8, background: '#2d2d3f', color: 'rgba(255,255,255,0.6)' }}>
        {INDUSTRY_ICONS[job.industry]} {job.industry}
      </span>
      <span style={{ padding: '2px 8px', borderRadius: 8, background: '#2d2d3f', color: 'rgba(255,255,255,0.6)' }}>
        {WORKMODE_ICONS[job.workMode]} {job.workMode}
      </span>
      <span style={{ padding: '2px 8px', borderRadius: 8, background: '#2d2d3f', color: 'rgba(255,255,255,0.6)' }}>
        💰 {formatSalary(job.salaryRange.min)}-{formatSalary(job.salaryRange.max)}
      </span>
      <span style={{ padding: '2px 8px', borderRadius: 8, background: '#2d2d3f', color: 'rgba(255,255,255,0.6)' }}>
        👥 {job.applicants} applicants
      </span>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
      {job.requirements.slice(0, 6).map(req => (
        <span key={req} style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, background: '#6366f120', color: '#a78bfa' }}>{req}</span>
      ))}
      {job.requirements.length > 6 && (
        <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, background: '#2d2d3f', color: 'rgba(255,255,255,0.4)' }}>+{job.requirements.length - 6}</span>
      )}
    </div>
    {matchScore !== undefined && (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Match Score</span>
          <span style={{ color: GRADE_COLORS[matchGrade as keyof typeof GRADE_COLORS] || '#fff', fontWeight: 600 }}>{matchScore}%</span>
        </div>
        <div style={{ height: 6, background: '#2d2d3f', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${matchScore}%`, background: GRADE_COLORS[matchGrade as keyof typeof GRADE_COLORS] || '#6b7280', borderRadius: 3 }} />
        </div>
      </div>
    )}
  </div>
);

interface CategoryScoreCardProps {
  breakdown: MatchScoreBreakdown;
}

export const CategoryScoreCard: React.FC<CategoryScoreCardProps> = ({ breakdown }) => (
  <div style={{
    background: '#1e1e2e',
    borderRadius: 10,
    padding: 14,
    borderLeft: `3px solid ${CATEGORY_COLORS[breakdown.category]}`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{breakdown.category}</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: GRADE_COLORS[breakdown.grade] }}>{breakdown.grade}</span>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
      <span style={{ color: 'rgba(255,255,255,0.5)' }}>{breakdown.weight}% weight</span>
      <span style={{ color: GRADE_COLORS[breakdown.grade], fontWeight: 600 }}>{breakdown.score}%</span>
    </div>
    <div style={{ height: 6, background: '#2d2d3f', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
      <div style={{ height: '100%', width: `${breakdown.score}%`, background: GRADE_COLORS[breakdown.grade], borderRadius: 3 }} />
    </div>
    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{breakdown.details}</div>
  </div>
);

interface EditCardProps {
  edit: RecommendedEdit;
}

export const EditCard: React.FC<EditCardProps> = ({ edit }) => {
  const typeIcons: Record<string, string> = { ADD_KEYWORD: '🔑', REPHRASE: '✏️', ADD_QUANTIFICATION: '📊', REMOVE_IRRELEVANT: '🗑️', ADD_SECTION: '➕' };
  return (
    <div style={{
      background: '#1e1e2e',
      borderRadius: 10,
      padding: 14,
      borderLeft: `3px solid ${edit.impactScore >= 10 ? '#f59e0b' : '#3b82f6'}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{typeIcons[edit.type] || '📝'}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{edit.type.replace(/_/g, ' ')}</span>
        </div>
        <span style={{ fontSize: 11, color: '#f59e0b' }}>Impact: +{edit.impactScore}</span>
      </div>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 6px' }}>{edit.description}</p>
      {edit.beforeSnippet && edit.afterSnippet && (
        <div style={{ fontSize: 11, background: '#2d2d3f', borderRadius: 6, padding: 8, marginTop: 6 }}>
          <div style={{ color: '#ef4444', marginBottom: 4 }}>❌ {edit.beforeSnippet}</div>
          <div style={{ color: '#22c55e' }}>✅ {edit.afterSnippet}</div>
        </div>
      )}
    </div>
  );
};

interface KeywordChipProps {
  keyword: JobKeyword;
}

export const KeywordChip: React.FC<KeywordChipProps> = ({ keyword }) => (
  <div style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 8,
    background: keyword.foundInResume ? '#22c55e15' : '#ef444415',
    border: `1px solid ${keyword.foundInResume ? '#22c55e40' : '#ef444440'}`,
    fontSize: 12
  }}>
    <span>{keyword.foundInResume ? '✅' : '❌'}</span>
    <span style={{ color: keyword.foundInResume ? '#22c55e' : '#ef4444', fontWeight: 500 }}>{keyword.keyword}</span>
    <span style={{ fontSize: 10, color: RELEVANCE_COLORS[keyword.relevance] || 'rgba(255,255,255,0.3)' }}>
      {keyword.relevance}
    </span>
  </div>
);

interface SectionScoreBarProps {
  section: SectionScore;
}

export const SectionScoreBar: React.FC<SectionScoreBarProps> = ({ section }) => {
  const pct = Math.round((section.score / section.maxScore) * 100);
  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#eab308' : '#ef4444';
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
        <span style={{ color: '#fff', fontWeight: 500 }}>{section.section}</span>
        <span style={{ color, fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ height: 8, background: '#2d2d3f', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} />
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{section.feedback}</div>
    </div>
  );
};

interface CompanyCardProps {
  history: CompanyMatchHistory;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({ history }) => (
  <div style={{
    background: '#1e1e2e',
    borderRadius: 10,
    padding: 14,
    borderLeft: `3px solid ${history.avgScore >= 80 ? '#22c55e' : history.avgScore >= 60 ? '#eab308' : '#ef4444'}`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{history.companyName}</span>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{history.jobsMatched} jobs</span>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
      <span>Avg: <b style={{ color: '#eab308' }}>{history.avgScore}%</b></span>
      <span>Best: <b style={{ color: '#22c55e' }}>{history.bestScore}%</b></span>
    </div>
    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>Last match: {history.lastMatchDate}</div>
  </div>
);
