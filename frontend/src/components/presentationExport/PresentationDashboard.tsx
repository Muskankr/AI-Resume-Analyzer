import React, { useState, useMemo } from 'react';
import {
  StatCard, TemplateCard, ExportJobCard, OptimizationCard,
  DesignElementCard, PresentationScoreCard
} from './PresentationCard';
import { BarChart, DonutChart, TrendLine, RadarChart, HorizontalBar } from './PresentationCharts';
import { PresentationTimeline } from './PresentationTimeline';
import {
  getTemplates, getSectionConfigs, getExportJobs, getPresentationScores,
  getResumeAnalytics, getSectionOptimizations, getDesignElements, getAuditLogs, getMonthlyTrends
} from './PresentationEngine';
import {
  STYLE_COLORS, FORMAT_COLORS, formatFileSize
} from './presentationTypes';

const TABS = ['Overview', 'Templates', 'Sections', 'Design Elements', 'Exports', 'Optimization', 'Analytics', 'Timeline'];

const PresentationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedTemplateId, setSelectedTemplateId] = useState('t6');
  const [elements, setElements] = useState(getDesignElements);

  const templates = useMemo(() => getTemplates(), []);
  const sectionConfigs = useMemo(() => getSectionConfigs(), []);
  const exportJobs = useMemo(() => getExportJobs(), []);
  const scores = useMemo(() => getPresentationScores(), []);
  const analytics = useMemo(() => getResumeAnalytics(), []);
  const optimizations = useMemo(() => getSectionOptimizations(), []);
  const auditLogs = useMemo(() => getAuditLogs(), []);
  const trends = useMemo(() => getMonthlyTrends(), []);



  const avgPresentationScore = Math.round(scores.reduce((s, sc) => s + sc.score, 0) / scores.length);

  // Chart data
  const formatDonut = Object.entries(analytics.formatBreakdown).filter(([, v]) => v > 0).map(([label, value]) => ({
    label, value, color: FORMAT_COLORS[label as keyof typeof FORMAT_COLORS] || '#6b7280'
  }));

  const templateBar = Object.entries(analytics.templateUsage).map(([label, value], i) => ({
    label, value, color: Object.values(STYLE_COLORS)[i % Object.values(STYLE_COLORS).length]
  }));

  const radarData = scores.map(s => ({ label: s.aspect, value: s.score, max: 100 }));

  const trendLabels = trends.map(t => t.month);
  const trendLines = [
    { label: 'Exports', data: trends.map(t => t.exports), color: '#6366f1' },
    { label: 'Avg Score', data: trends.map(t => t.avgScore), color: '#22c55e' },
    { label: 'Templates', data: trends.map(t => t.templates * 3), color: '#f59e0b' }
  ];

  const sectionWordData = optimizations.map(o => ({
    label: o.sectionName, value: o.currentWordCount, color: o.currentWordCount <= o.recommendedWordCount ? '#22c55e' : '#f59e0b'
  }));

  const toggleElement = (id: string) => {
    setElements(prev => prev.map(e => e.elementId === id ? { ...e, isEnabled: !e.isEnabled } : e));
  };

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', background: '#121218', minHeight: '100vh', color: '#fff' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>🎨 Resume Presentation & Export Manager</h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 20, fontSize: 14 }}>
        Design beautiful resumes, optimize sections, and export in multiple formats
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid #2d2d3f', paddingBottom: 8, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            background: activeTab === tab ? '#6366f1' : 'transparent',
            color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s'
          }}>{tab}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'Overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <StatCard label="Total Exports" value={analytics.totalExports} icon="📤" color="#6366f1" subtitle="all time" />
            <StatCard label="Design Score" value={`${avgPresentationScore}%`} icon="🎨" color="#22c55e" subtitle="presentation quality" />
            <StatCard label="Templates Used" value={Object.keys(analytics.templateUsage).length} icon="📋" color="#f59e0b" subtitle="unique templates" />
            <StatCard label="Avg File Size" value={formatFileSize(analytics.avgFileSize)} icon="💾" color="#06b6d4" subtitle={`${analytics.avgPageCount} pages avg`} />
            <StatCard label="Active Elements" value={elements.filter(e => e.isEnabled).length} icon="🔧" color="#8b5cf6" subtitle={`of ${elements.length} total`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Presentation Radar</h3>
              <div style={{ display: 'flex', justifyContent: 'center' }}><RadarChart data={radarData} size={240} color="#6366f1" /></div>
            </div>
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Export Formats</h3>
              <DonutChart data={formatDonut} />
            </div>
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Template Popularity</h3>
              <BarChart data={templateBar} width={350} height={180} />
            </div>
          </div>

          <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Export & Score Trends</h3>
            <TrendLine lines={trendLines} labels={trendLabels} width={600} height={180} />
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>💡 Design Scores</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {scores.map(s => <PresentationScoreCard key={s.aspect} score={s} />)}
          </div>
        </div>
      )}

      {/* ── TEMPLATES ── */}
      {activeTab === 'Templates' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {templates.map(t => (
              <TemplateCard key={t.templateId} template={t} isSelected={t.templateId === selectedTemplateId} onSelect={() => setSelectedTemplateId(t.templateId)} />
            ))}
          </div>
        </div>
      )}

      {/* ── SECTIONS ── */}
      {activeTab === 'Sections' && (
        <div style={{ maxWidth: 700 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📄 Section Configuration</h3>
          {sectionConfigs.map((section) => (
            <div key={section.sectionId} style={{
              background: '#1e1e2e', borderRadius: 10, padding: 14, marginBottom: 10,
              borderLeft: `4px solid ${section.visibility === 'VISIBLE' ? '#22c55e' : section.visibility === 'CONDENSED' ? '#f59e0b' : '#ef4444'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>#{section.order} {section.customTitle || section.name}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 10 }}>{section.maxLines} lines max</span>
                </div>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 10,
                  background: section.visibility === 'VISIBLE' ? '#22c55e20' : section.visibility === 'CONDENSED' ? '#f59e0b20' : '#ef444420',
                  color: section.visibility === 'VISIBLE' ? '#22c55e' : section.visibility === 'CONDENSED' ? '#f59e0b' : '#ef4444',
                  fontWeight: 600
                }}>{section.visibility}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── DESIGN ELEMENTS ── */}
      {activeTab === 'Design Elements' && (
        <div style={{ maxWidth: 700 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>🔧 Toggle Design Elements</h3>
          {elements.map(el => (
            <div key={el.elementId} style={{ marginBottom: 10 }}>
              <DesignElementCard element={el} onToggle={() => toggleElement(el.elementId)} />
            </div>
          ))}
        </div>
      )}

      {/* ── EXPORTS ── */}
      {activeTab === 'Exports' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📤 Export History</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12 }}>
            {exportJobs.map(job => <ExportJobCard key={job.jobId} job={job} />)}
          </div>
        </div>
      )}

      {/* ── OPTIMIZATION ── */}
      {activeTab === 'Optimization' && (
        <div>
          <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Word Count by Section</h3>
            <HorizontalBar data={sectionWordData} width={500} height={optimizations.length * 28} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12 }}>
            {optimizations.map(opt => <OptimizationCard key={opt.sectionName} optimization={opt} />)}
          </div>
        </div>
      )}

      {/* ── ANALYTICS ── */}
      {activeTab === 'Analytics' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <StatCard label="Total Exports" value={analytics.totalExports} icon="📤" color="#6366f1" />
            <StatCard label="Avg Word Count" value={analytics.avgWordCount} icon="📝" color="#f59e0b" />
            <StatCard label="Avg File Size" value={formatFileSize(analytics.avgFileSize)} icon="💾" color="#06b6d4" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Format Distribution</h3>
              <DonutChart data={formatDonut} />
            </div>
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Optimization Score History</h3>
              <TrendLine lines={[{ label: 'Score', data: analytics.optimizationHistory.map(h => h.score), color: '#22c55e' }]} labels={analytics.optimizationHistory.map(h => h.date)} width={400} height={160} />
            </div>
          </div>
        </div>
      )}

      {/* ── TIMELINE ── */}
      {activeTab === 'Timeline' && (
        <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20, maxWidth: 600 }}>
          <PresentationTimeline logs={auditLogs} />
        </div>
      )}
    </div>
  );
};

export default PresentationDashboard;
