import React from 'react';
import type {
  UserSkill, SkillGap, CareerPath, LearningResource, CareerRecommendation,
  SkillOverlapAnalysis
} from './skillGapTypes';
import {
  PROFICIENCY_COLORS, SEVERITY_COLORS, CATEGORY_COLORS,
  CATEGORY_ICONS, DIFFICULTY_COLORS, FORMAT_ICONS, formatSalary
} from './skillGapTypes';

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

interface SkillCardProps {
  skill: UserSkill;
}

export const SkillCard: React.FC<SkillCardProps> = ({ skill }) => (
  <div style={{
    background: '#1e1e2e',
    borderRadius: 12,
    padding: 16,
    borderLeft: `4px solid ${PROFICIENCY_COLORS[skill.proficiency]}`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{CATEGORY_ICONS[skill.category]}</span>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{skill.name}</span>
      </div>
      <span style={{
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 10,
        background: `${PROFICIENCY_COLORS[skill.proficiency]}20`,
        color: PROFICIENCY_COLORS[skill.proficiency],
        fontWeight: 600
      }}>{skill.proficiency}</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
      <div>📅 {skill.yearsExperience}yr exp</div>
      <div>👥 {skill.endorsements} endorsements</div>
      <div>🚀 {skill.projectsUsed} projects</div>
      <div>💪 {skill.confidenceScore}% confidence</div>
    </div>
  </div>
);

interface GapCardProps {
  gap: SkillGap;
}

export const GapCard: React.FC<GapCardProps> = ({ gap }) => (
  <div style={{
    background: '#1e1e2e',
    borderRadius: 12,
    padding: 16,
    borderLeft: `4px solid ${SEVERITY_COLORS[gap.severity]}`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{CATEGORY_ICONS[gap.category]}</span>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{gap.skillName}</span>
      </div>
      <span style={{
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 10,
        background: `${SEVERITY_COLORS[gap.severity]}20`,
        color: SEVERITY_COLORS[gap.severity],
        fontWeight: 600
      }}>{gap.severity}</span>
    </div>
    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>
      <span>Current: <b style={{ color: PROFICIENCY_COLORS[gap.currentProficiency] }}>{gap.currentProficiency}</b></span>
      <span>→</span>
      <span>Target: <b style={{ color: PROFICIENCY_COLORS[gap.requiredProficiency] }}>{gap.requiredProficiency}</b></span>
    </div>
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Gap Score</span>
        <span style={{ color: SEVERITY_COLORS[gap.severity], fontWeight: 600 }}>{gap.gapScore}/100</span>
      </div>
      <div style={{ height: 6, background: '#2d2d3f', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${gap.gapScore}%`, background: SEVERITY_COLORS[gap.severity], borderRadius: 3 }} />
      </div>
    </div>
    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
      ⏱️ {gap.estimatedLearningTime} · Priority: {gap.priority}/10
    </div>
    {gap.relatedSkills.length > 0 && (
      <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
        🔗 Related: {gap.relatedSkills.join(', ')}
      </div>
    )}
  </div>
);

interface CareerPathCardProps {
  path: CareerPath;
}

export const CareerPathCard: React.FC<CareerPathCardProps> = ({ path }) => (
  <div style={{
    background: '#1e1e2e',
    borderRadius: 12,
    padding: 20,
    borderLeft: `4px solid ${DIFFICULTY_COLORS[path.difficulty]}`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{path.title}</h3>
      <span style={{
        fontSize: 11,
        padding: '3px 10px',
        borderRadius: 10,
        background: `${DIFFICULTY_COLORS[path.difficulty]}20`,
        color: DIFFICULTY_COLORS[path.difficulty],
        fontWeight: 600
      }}>{path.difficulty}</span>
    </div>
    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>{path.description}</p>

    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
      <span>🎯 {path.matchScore}% match</span>
      <span>💰 {formatSalary(path.salaryRange.min)}-{formatSalary(path.salaryRange.max)}</span>
      <span>📈 {path.demandLevel} demand</span>
    </div>

    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Skill Match</span>
        <span style={{ color: path.matchScore >= 70 ? '#22c55e' : path.matchScore >= 50 ? '#eab308' : '#ef4444', fontWeight: 600 }}>{path.matchScore}%</span>
      </div>
      <div style={{ height: 8, background: '#2d2d3f', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${path.matchScore}%`, background: path.matchScore >= 70 ? '#22c55e' : path.matchScore >= 50 ? '#eab308' : '#ef4444', borderRadius: 4 }} />
      </div>
    </div>

    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
      {path.currentRole} → <b style={{ color: '#fff' }}>{path.targetRole}</b> · {path.estimatedTimeline}
    </div>

    {path.skillGaps.length > 0 && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {path.skillGaps.map(s => (
          <span key={s} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#2d2d3f', color: '#f97316' }}>
            📌 {s}
          </span>
        ))}
      </div>
    )}

    <div style={{ borderTop: '1px solid #2d2d3f', paddingTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>Career Steps</div>
      {path.steps.map((step) => (
        <div key={step.stepId} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 12 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: step.completed ? '#22c55e' : '#2d2d3f',
            color: step.completed ? '#fff' : 'rgba(255,255,255,0.5)',
            fontSize: 11, fontWeight: 700, flexShrink: 0
          }}>{step.order}</div>
          <div>
            <div style={{ fontWeight: 600, color: '#fff' }}>{step.title}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{step.duration} · {step.milestone}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

interface ResourceCardProps {
  resource: LearningResource;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource }) => (
  <div style={{
    background: '#1e1e2e',
    borderRadius: 10,
    padding: 14,
    borderLeft: `3px solid ${CATEGORY_COLORS.PROGRAMMING_LANGUAGES}`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <span style={{ fontSize: 16 }}>{FORMAT_ICONS[resource.format]}</span>
      <span style={{ fontSize: 12, color: '#eab308' }}>⭐ {resource.rating}</span>
    </div>
    <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', marginBottom: 4 }}>{resource.title}</div>
    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{resource.provider} · {resource.duration} · {resource.cost}</div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
      <span style={{ color: PROFICIENCY_COLORS[resource.difficulty] }}>{resource.difficulty}</span>
      <span style={{ color: '#3b82f6' }}>{resource.relevanceScore}% relevant</span>
    </div>
  </div>
);

interface RecommendationCardProps {
  recommendation: CareerRecommendation;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation }) => {
  const effortColors = { LOW: '#22c55e', MEDIUM: '#eab308', HIGH: '#f97316' };
  const typeIcons = { ROLE_CHANGE: '🎯', SKILL_UPGRADE: '📈', CERTIFICATION: '📜', PROJECT: '🚀', NETWORKING: '🤝' };
  return (
    <div style={{
      background: '#1e1e2e',
      borderRadius: 12,
      padding: 16,
      borderLeft: `4px solid ${effortColors[recommendation.effort]}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{typeIcons[recommendation.type]}</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{recommendation.title}</span>
        </div>
        <span style={{
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 10,
          background: `${effortColors[recommendation.effort]}20`,
          color: effortColors[recommendation.effort],
          fontWeight: 600
        }}>{recommendation.effort} effort</span>
      </div>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 10px' }}>{recommendation.description}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
        <span>🎯 Impact: {recommendation.impactScore}/100</span>
        <span>⏱️ {recommendation.timeline}</span>
      </div>
      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {recommendation.skillsInvolved.map(s => (
          <span key={s} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#2d2d3f', color: '#a78bfa' }}>{s}</span>
        ))}
      </div>
    </div>
  );
};

interface OverlapCardProps {
  overlap: SkillOverlapAnalysis;
}

export const OverlapCard: React.FC<OverlapCardProps> = ({ overlap }) => (
  <div style={{
    background: '#1e1e2e',
    borderRadius: 12,
    padding: 16,
    borderLeft: `4px solid #3b82f6`
  }}>
    <div style={{ fontWeight: 600, fontSize: 14, color: '#fff', marginBottom: 8 }}>{overlap.skillName}</div>
    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 10px' }}>{overlap.insight}</p>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
      <span style={{ color: 'rgba(255,255,255,0.5)' }}>Overlap</span>
      <span style={{ color: '#3b82f6', fontWeight: 600 }}>{overlap.overlapPercentage}%</span>
    </div>
    <div style={{ height: 6, background: '#2d2d3f', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
      <div style={{ height: '100%', width: `${overlap.overlapPercentage}%`, background: '#3b82f6', borderRadius: 3 }} />
    </div>
    <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
      <span style={{ color: 'rgba(255,255,255,0.4)' }}>From: {overlap.transferableFrom.join(', ')}</span>
      <span style={{ color: 'rgba(255,255,255,0.4)' }}>→ To: {overlap.transferableTo.join(', ')}</span>
    </div>
  </div>
);
