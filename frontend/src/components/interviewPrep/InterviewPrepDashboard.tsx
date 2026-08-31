import React, { useState, useMemo } from 'react';
import { StatCard, QuestionCard, SessionCard, CompanyCard, STARCard, StreakCard } from './InterviewPrepCard';
import { BarChart, DonutChart, TrendLine, RadarChart } from './InterviewPrepCharts';
import { InterviewPrepTimeline } from './InterviewPrepTimeline';
import { getQuestions, getCompanyProfiles, getPracticeSessions, getSTARStories, getStreak, getAuditLogs, getMonthlyTrends } from './InterviewPrepEngine';
import { CATEGORY_COLORS, DIFFICULTY_COLORS } from './interviewPrepTypes';

const TABS = ['Overview', 'Questions', 'Practice', 'Companies', 'STAR Stories', 'Progress', 'Mock Interview', 'Timeline'];

const InterviewPrepDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [categoryFilter, setCategoryFilter] = useState('');

  const questions = useMemo(() => getQuestions(), []);
  const companies = useMemo(() => getCompanyProfiles(), []);
  const sessions = useMemo(() => getPracticeSessions(), []);
  const stories = useMemo(() => getSTARStories(), []);
  const streak = useMemo(() => getStreak(), []);
  const auditLogs = useMemo(() => getAuditLogs(), []);
  const trends = useMemo(() => getMonthlyTrends(), []);

  const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
  const avgScore = completedSessions.length > 0 ? Math.round(completedSessions.reduce((s, sess) => s + (sess.score || 0), 0) / completedSessions.length) : 0;

  const filteredQuestions = categoryFilter ? questions.filter(q => q.category === categoryFilter) : questions;

  // Chart data
  const categoryDonut = Object.entries(
    questions.reduce((acc, q) => { acc[q.category] = (acc[q.category] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([label, value]) => ({ label, value, color: CATEGORY_COLORS[label as keyof typeof CATEGORY_COLORS] || '#6b7280' }));

  const difficultyBar = Object.entries(
    questions.reduce((acc, q) => { acc[q.difficulty] = (acc[q.difficulty] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([label, value]) => ({ label, value, color: DIFFICULTY_COLORS[label as keyof typeof DIFFICULTY_COLORS] || '#6b7280' }));

  const scoreRadar = completedSessions.length > 0 ? [
    { label: 'Clarity', value: 82, max: 100 },
    { label: 'Relevance', value: 85, max: 100 },
    { label: 'Structure', value: 78, max: 100 },
    { label: 'Impact', value: 80, max: 100 },
    { label: 'Keywords', value: 72, max: 100 },
  ] : [];

  const trendLabels = trends.map(t => t.month);
  const trendLines = [
    { label: 'Sessions', data: trends.map(t => t.sessions), color: '#6366f1' },
    { label: 'Avg Score', data: trends.map(t => t.avgScore), color: '#22c55e' },
  ];

  const companyBar = companies.map(c => ({ label: c.name, value: c.successRate, color: c.type === 'FAANG' ? '#6366f1' : '#22c55e' }));

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', background: '#121218', minHeight: '100vh', color: '#fff' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>🎤 Resume Interview Prep Coach</h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 20, fontSize: 14 }}>
        Practice interview questions, build STAR stories, and ace your next interview
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
            <StreakCard streak={streak} />
            <StatCard label="Total Questions" value={questions.length} icon="❓" color="#6366f1" subtitle="in question bank" />
            <StatCard label="Avg Score" value={`${avgScore}%`} icon="⭐" color="#22c55e" subtitle={`${completedSessions.length} completed`} />
            <StatCard label="STAR Stories" value={stories.length} icon="📖" color="#f59e0b" subtitle="ready to use" />
            <StatCard label="Companies" value={companies.length} icon="🏢" color="#06b6d4" subtitle="in prep guide" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Question Categories</h3>
              <DonutChart data={categoryDonut} />
            </div>
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Skill Radar</h3>
              <div style={{ display: 'flex', justifyContent: 'center' }}><RadarChart data={scoreRadar} size={220} color="#6366f1" /></div>
            </div>
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>By Difficulty</h3>
              <BarChart data={difficultyBar} width={350} height={160} />
            </div>
          </div>

          <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Practice Trends</h3>
            <TrendLine lines={trendLines} labels={trendLabels} width={600} height={180} />
          </div>

          <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Company Success Rates</h3>
            <BarChart data={companyBar} width={500} height={160} />
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>🔥 Top Questions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 12 }}>
            {questions.sort((a, b) => b.frequency - a.frequency).slice(0, 3).map(q => (
              <QuestionCard key={q.questionId} question={q} />
            ))}
          </div>
        </div>
      )}

      {/* ── QUESTIONS ── */}
      {activeTab === 'Questions' && (
        <div>
          <div style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #2d2d3f', background: '#1e1e2e', color: '#fff', fontSize: 13 }}>
              <option value="">All Categories</option>
              {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', alignSelf: 'center' }}>{filteredQuestions.length} questions</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 12 }}>
            {filteredQuestions.sort((a, b) => b.frequency - a.frequency).map(q => (
              <QuestionCard key={q.questionId} question={q} />
            ))}
          </div>
        </div>
      )}

      {/* ── PRACTICE ── */}
      {activeTab === 'Practice' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📝 Practice Sessions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12 }}>
            {sessions.map(s => <SessionCard key={s.sessionId} session={s} />)}
          </div>
        </div>
      )}

      {/* ── COMPANIES ── */}
      {activeTab === 'Companies' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
            {companies.map(c => <CompanyCard key={c.companyId} profile={c} />)}
          </div>
        </div>
      )}

      {/* ── STAR STORIES ── */}
      {activeTab === 'STAR Stories' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
            {stories.map(s => <STARCard key={s.storyId} story={s} />)}
          </div>
        </div>
      )}

      {/* ── PROGRESS ── */}
      {activeTab === 'Progress' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <StreakCard streak={streak} />
            <StatCard label="Best Score" value={`${streak.bestScore}%`} icon="🏆" color="#f59e0b" subtitle="all time" />
            <StatCard label="Practice Days" value={streak.totalPracticeDays} icon="📅" color="#06b6d4" subtitle="total" />
          </div>
          <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Monthly Progress</h3>
            <TrendLine lines={trendLines} labels={trendLabels} width={600} height={180} />
          </div>
        </div>
      )}

      {/* ── MOCK INTERVIEW ── */}
      {activeTab === 'Mock Interview' && (
        <div style={{ textAlign: 'center', padding: 60, background: '#1e1e2e', borderRadius: 12, maxWidth: 600, margin: '0 auto' }}>
          <span style={{ fontSize: 48 }}>🎤</span>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '16px 0 8px', color: '#fff' }}>Mock Interview Mode</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
            Practice a full mock interview with timed questions, AI scoring, and detailed feedback. Choose a company and round to begin.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            {companies.slice(0, 4).map(c => (
              <div key={c.companyId} style={{ padding: '10px 16px', borderRadius: 10, background: '#2d2d3f', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{c.logo}</span>
                <span style={{ fontSize: 13, color: '#fff' }}>{c.name}</span>
              </div>
            ))}
          </div>
          <button style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Start Mock Interview
          </button>
        </div>
      )}

      {/* ── TIMELINE ── */}
      {activeTab === 'Timeline' && (
        <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20, maxWidth: 600 }}>
          <InterviewPrepTimeline logs={auditLogs} />
        </div>
      )}
    </div>
  );
};

export default InterviewPrepDashboard;
