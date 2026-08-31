import React, { useState, useMemo } from 'react';
import {
  StatCard, SkillCard, GapCard, CareerPathCard, ResourceCard,
  RecommendationCard, OverlapCard
} from './SkillGapCard';
import {
  DonutChart, TrendLine, RadarChart, GapComparisonChart
} from './SkillGapCharts';
import { SkillGapAuditTimeline } from './SkillGapTimeline';
import {
  getUserSkills, getTargetSkills, getSkillGaps, getCareerPaths,
  getOverlapAnalysis, getRecommendations, getAuditLogs, getMonthlyTrends
} from './SkillGapEngine';
import type {
  GapSeverity, SkillCategory
} from './skillGapTypes';
import {
  CATEGORY_COLORS, SEVERITY_COLORS, PROFICIENCY_COLORS
} from './skillGapTypes';

const TABS = ['Overview', 'My Skills', 'Skill Gaps', 'Career Paths', 'Learning', 'Recommendations', 'Timeline'];

const SkillGapDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [severityFilter, setSeverityFilter] = useState<GapSeverity | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<SkillCategory | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  const userSkills = useMemo(() => getUserSkills(), []);
  const targetSkills = useMemo(() => getTargetSkills(), []);
  const gaps = useMemo(() => getSkillGaps(userSkills, targetSkills), [userSkills, targetSkills]);
  const careerPaths = useMemo(() => getCareerPaths(), []);
  const overlaps = useMemo(() => getOverlapAnalysis(), []);
  const recommendations = useMemo(() => getRecommendations(), []);
  const auditLogs = useMemo(() => getAuditLogs(), []);
  const trends = useMemo(() => getMonthlyTrends(), []);

  // Compute stats
  const overallMatch = 68;
  const totalGaps = gaps.length;
  const criticalGaps = gaps.filter(g => g.severity === 'CRITICAL' || g.severity === 'MAJOR').length;
  const alignedSkills = userSkills.length;

  // Filtered gaps
  const filteredGaps = useMemo(() => {
    let result = gaps;
    if (severityFilter) result = result.filter(g => g.severity === severityFilter);
    if (categoryFilter) result = result.filter(g => g.category === categoryFilter);
    if (searchQuery) result = result.filter(g => g.skillName.toLowerCase().includes(searchQuery.toLowerCase()));
    return result;
  }, [gaps, severityFilter, categoryFilter, searchQuery]);

  // Donut data
  const severityDonutData = Object.entries(
    gaps.reduce((acc, g) => { acc[g.severity] = (acc[g.severity] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([label, value]) => ({ label, value, color: SEVERITY_COLORS[label as GapSeverity] || '#6b7280' }));

  const categoryDonutData = Object.entries(
    userSkills.reduce((acc, s) => { acc[s.category] = (acc[s.category] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([label, value]) => ({ label, value: value as number, color: CATEGORY_COLORS[label as SkillCategory] || '#6b7280' }));

  // Radar data from user skills
  const radarData = userSkills.slice(0, 8).map(s => ({
    label: s.name,
    value: s.confidenceScore,
    max: 100
  }));

  // Gap comparison data
  const gapComparisonData = gaps.slice(0, 8).map(g => ({
    skill: g.skillName,
    current: Object.keys(PROFICIENCY_COLORS).indexOf(g.currentProficiency),
    target: Object.keys(PROFICIENCY_COLORS).indexOf(g.requiredProficiency)
  }));

  // Trend labels
  const trendLabels = trends.map(t => t.month);
  const trendLines = [
    { label: 'Match Score', data: trends.map(t => t.overallMatchScore), color: '#6366f1' },
    { label: 'Skills Acquired', data: trends.map(t => t.skillsAcquired * 10), color: '#22c55e' },
    { label: 'Gaps Closed', data: trends.map(t => t.gapsClosed * 15), color: '#f59e0b' }
  ];

  // All learning resources
  const allResources = useMemo(() => gaps.flatMap(g => g.learningResources), [gaps]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', background: '#121218', minHeight: '100vh', color: '#fff' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>🎯 Skill Gap Analysis & Career Path Recommender</h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 20, fontSize: 14 }}>
        Analyze your skill gaps, discover career paths, and get personalized learning recommendations
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid #2d2d3f', paddingBottom: 8, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            background: activeTab === tab ? '#6366f1' : 'transparent',
            color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.5)',
            transition: 'all 0.2s'
          }}>{tab}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'Overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <StatCard label="Overall Match" value={`${overallMatch}%`} icon="🎯" color="#6366f1" subtitle="vs Senior Full-Stack Engineer" />
            <StatCard label="Critical Gaps" value={criticalGaps} icon="⚠️" color="#ef4444" subtitle="need attention" />
            <StatCard label="Total Gaps" value={totalGaps} icon="📊" color="#f59e0b" subtitle="skills to acquire" />
            <StatCard label="My Skills" value={alignedSkills} icon="💪" color="#22c55e" subtitle="current skillset" />
            <StatCard label="Career Paths" value={careerPaths.length} icon="🛤️" color="#06b6d4" subtitle="matched routes" />
            <StatCard label="Resources" value={allResources.length} icon="📚" color="#ec4899" subtitle="learning materials" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
            {/* Skill Radar */}
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Skill Proficiency Radar</h3>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <RadarChart data={radarData} size={240} color="#6366f1" />
              </div>
            </div>
            {/* Gap Severity */}
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Gap Severity Distribution</h3>
              <DonutChart data={severityDonutData} />
            </div>
            {/* Skill Categories */}
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>My Skill Categories</h3>
              <DonutChart data={categoryDonutData} />
            </div>
          </div>

          {/* Gap Comparison */}
          <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Current vs Target Proficiency</h3>
            <GapComparisonChart gaps={gapComparisonData} width={600} height={200} />
          </div>

          {/* Trend */}
          <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Progress Over Time</h3>
            <TrendLine lines={trendLines} labels={trendLabels} width={600} height={180} />
          </div>

          {/* Top Recommendations */}
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>🔑 Top Recommendations</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
            {recommendations.slice(0, 3).map(rec => (
              <RecommendationCard key={rec.recommendationId} recommendation={rec} />
            ))}
          </div>
        </div>
      )}

      {/* ── MY SKILLS ── */}
      {activeTab === 'My Skills' && (
        <div>
          <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Skill Confidence Radar</h3>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RadarChart data={radarData} size={260} color="#22c55e" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
            {userSkills.map(skill => (
              <SkillCard key={skill.skillId} skill={skill} />
            ))}
          </div>
        </div>
      )}

      {/* ── SKILL GAPS ── */}
      {activeTab === 'Skill Gaps' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="🔍 Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid #2d2d3f',
                background: '#1e1e2e', color: '#fff', fontSize: 13, width: 200
              }}
            />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as GapSeverity | '')}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid #2d2d3f',
                background: '#1e1e2e', color: '#fff', fontSize: 13
              }}
            >
              <option value="">All Severities</option>
              {Object.keys(SEVERITY_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as SkillCategory | '')}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid #2d2d3f',
                background: '#1e1e2e', color: '#fff', fontSize: 13
              }}
            >
              <option value="">All Categories</option>
              {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12 }}>
            {filteredGaps.map(gap => (
              <GapCard key={gap.gapId} gap={gap} />
            ))}
          </div>
          {filteredGaps.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>
              No gaps match your filters. Try adjusting your search.
            </div>
          )}
        </div>
      )}

      {/* ── CAREER PATHS ── */}
      {activeTab === 'Career Paths' && (
        <div>
          <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Skill Overlap Analysis</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
              {overlaps.map(o => <OverlapCard key={o.overlapId} overlap={o} />)}
            </div>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>🛤️ Recommended Career Paths</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
            {careerPaths.map(path => (
              <CareerPathCard key={path.pathId} path={path} />
            ))}
          </div>
        </div>
      )}

      {/* ── LEARNING ── */}
      {activeTab === 'Learning' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
              📚 All Learning Resources ({allResources.length})
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {allResources.sort((a, b) => b.relevanceScore - a.relevanceScore).map(res => (
              <ResourceCard key={res.resourceId} resource={res} />
            ))}
          </div>
        </div>
      )}

      {/* ── RECOMMENDATIONS ── */}
      {activeTab === 'Recommendations' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
            {recommendations.map(rec => (
              <RecommendationCard key={rec.recommendationId} recommendation={rec} />
            ))}
          </div>
        </div>
      )}

      {/* ── TIMELINE ── */}
      {activeTab === 'Timeline' && (
        <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20, maxWidth: 600 }}>
          <SkillGapAuditTimeline logs={auditLogs} />
        </div>
      )}
    </div>
  );
};

export default SkillGapDashboard;
