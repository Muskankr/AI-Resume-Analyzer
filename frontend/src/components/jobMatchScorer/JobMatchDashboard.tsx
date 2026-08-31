import React, { useState, useMemo } from 'react';
import {
  StatCard, JobCard, CategoryScoreCard, EditCard, KeywordChip,
  SectionScoreBar, CompanyCard
} from './JobMatchCard';
import { BarChart, DonutChart, TrendLine, RadarChart, HorizontalBar } from './JobMatchCharts';
import { JobMatchTimeline } from './JobMatchTimeline';
import {
  getJobPostings, matchResumeToJob, getCompanyHistory, getMatchTrends, getAuditLogs
} from './JobMatchEngine';
import {
  GRADE_COLORS
} from './jobMatchTypes';

const TABS = ['Overview', 'Job Listings', 'Match Details', 'Keywords', 'Recommendations', 'History', 'Timeline'];

const JobMatchDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedJobId, setSelectedJobId] = useState<string>('jp1');

  const jobPostings = useMemo(() => getJobPostings(), []);
  const companyHistory = useMemo(() => getCompanyHistory(), []);
  const matchTrends = useMemo(() => getMatchTrends(), []);
  const auditLogs = useMemo(() => getAuditLogs(), []);

  const selectedMatch = useMemo(() => {
    const job = jobPostings.find(j => j.jobId === selectedJobId);
    return job ? matchResumeToJob(job) : null;
  }, [selectedJobId, jobPostings]);

  const selectedJob = useMemo(() => jobPostings.find(j => j.jobId === selectedJobId), [selectedJobId, jobPostings]);

  // Compute all matches for overview
  const allMatches = useMemo(() => jobPostings.map(j => ({
    job: j,
    match: matchResumeToJob(j)
  })), [jobPostings]);

  const avgScore = Math.round(allMatches.reduce((s, m) => s + m.match.overallScore, 0) / allMatches.length);
  const bestMatch = allMatches.reduce((best, m) => m.match.overallScore > best.match.overallScore ? m : best, allMatches[0]);
  const totalApplications = matchTrends.reduce((s, t) => s + t.applications, 0);

  // Overview charts
  const scoreByJob = allMatches.map(m => ({
    label: m.job.company, value: m.match.overallScore,
    color: GRADE_COLORS[m.match.grade]
  }));

  const categoryRadar = selectedMatch ? selectedMatch.categoryBreakdown.map(c => ({
    label: c.category, value: c.score, max: 100
  })) : [];

  const trendLabels = matchTrends.map(t => t.month);
  const trendLines = [
    { label: 'Avg Score', data: matchTrends.map(t => t.avgScore), color: '#6366f1' },
    { label: 'Best Score', data: matchTrends.map(t => t.bestScore), color: '#22c55e' },
    { label: 'Applications', data: matchTrends.map(t => t.applications * 10), color: '#f59e0b' }
  ];

  const severityDonut = selectedMatch ? (() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, OPTIONAL: 0 };
    selectedMatch.jobKeywords.forEach(kw => {
      if (!kw.foundInResume) counts[kw.relevance as keyof typeof counts]++;
    });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([label, value]) => ({
      label, value, color: label === 'CRITICAL' ? '#ef4444' : label === 'HIGH' ? '#f97316' : label === 'MEDIUM' ? '#eab308' : label === 'LOW' ? '#22c55e' : '#6b7280'
    }));
  })() : [];

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', background: '#121218', minHeight: '100vh', color: '#fff' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>🎯 Resume Job Match Scorer</h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 20, fontSize: 14 }}>
        Score your resume against job postings, track match quality, and get tailored recommendations
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
            <StatCard label="Average Match" value={`${avgScore}%`} icon="📊" color="#6366f1" subtitle="across all jobs" />
            <StatCard label="Best Match" value={`${bestMatch.match.overallScore}%`} icon="🏆" color="#22c55e" subtitle={`${bestMatch.job.company} — ${bestMatch.job.title}`} />
            <StatCard label="Jobs Analyzed" value={allMatches.length} icon="💼" color="#f59e0b" subtitle="resumes scored" />
            <StatCard label="Applications" value={totalApplications} icon="📨" color="#ec4899" subtitle="submitted this quarter" />
            <StatCard label="Total Keywords" value={selectedMatch?.totalKeywords || 0} icon="🔑" color="#06b6d4" subtitle={`${selectedMatch?.matchedCount || 0} matched`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Match Scores by Company</h3>
              <BarChart data={scoreByJob} width={500} height={200} />
            </div>
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Category Breakdown (Selected)</h3>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <RadarChart data={categoryRadar} size={220} color="#6366f1" />
              </div>
            </div>
          </div>

          <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Match Trends</h3>
            <TrendLine lines={trendLines} labels={trendLabels} width={600} height={180} />
          </div>

          <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Company Match History</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {companyHistory.map(ch => <CompanyCard key={ch.companyId} history={ch} />)}
            </div>
          </div>

          {/* Top recommendations */}
          {selectedMatch && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>🔑 Top Recommendations for {selectedJob?.company}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
                {selectedMatch.recommendedEdits.slice(0, 3).map(edit => (
                  <EditCard key={edit.editId} edit={edit} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── JOB LISTINGS ── */}
      {activeTab === 'Job Listings' && (
        <div>
          {/* Job selector */}
          <div style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Score against:</span>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid #2d2d3f',
                background: '#1e1e2e', color: '#fff', fontSize: 13
              }}
            >
              {jobPostings.map(j => (
                <option key={j.jobId} value={j.jobId}>{j.title} @ {j.company}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
            {jobPostings.map(job => {
              const match = allMatches.find(m => m.job.jobId === job.jobId);
              return (
                <div key={job.jobId} onClick={() => setSelectedJobId(job.jobId)} style={{ cursor: 'pointer' }}>
                  <JobCard
                    job={job}
                    matchScore={match?.match.overallScore}
                    matchGrade={match?.match.grade}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MATCH DETAILS ── */}
      {activeTab === 'Match Details' && selectedMatch && (
        <div>
          <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#fff' }}>
                {selectedJob?.title} @ {selectedJob?.company}
              </h3>
              <div style={{
                fontSize: 32, fontWeight: 800,
                color: GRADE_COLORS[selectedMatch.grade],
                background: `${GRADE_COLORS[selectedMatch.grade]}15`,
                padding: '6px 16px', borderRadius: 10
              }}>{selectedMatch.grade}</div>
            </div>
            <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
              <span>🎯 {selectedMatch.overallScore}% match</span>
              <span>📈 {selectedMatch.passProbability}% pass probability</span>
              <span>✅ {selectedMatch.matchedCount}/{selectedMatch.totalKeywords} keywords matched</span>
            </div>
          </div>

          {/* Section Scores */}
          <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'rgba(255,255,255,0.8)' }}>Section Scores</h3>
            {selectedMatch.sectionScores.map(section => (
              <SectionScoreBar key={section.section} section={section} />
            ))}
          </div>

          {/* Category Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 20 }}>
            {selectedMatch.categoryBreakdown.map(cat => (
              <CategoryScoreCard key={cat.category} breakdown={cat} />
            ))}
          </div>

          {/* Strengths & Weaknesses */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#22c55e' }}>💪 Strengths</h3>
              {selectedMatch.strengths.map((s, i) => (
                <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8, display: 'flex', gap: 8 }}>
                  <span>✅</span> {s}
                </div>
              ))}
            </div>
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#ef4444' }}>⚠️ Weaknesses</h3>
              {selectedMatch.weaknesses.map((w, i) => (
                <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8, display: 'flex', gap: 8 }}>
                  <span>⚠️</span> {w}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── KEYWORDS ── */}
      {activeTab === 'Keywords' && selectedMatch && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>
                Missing Keywords by Severity
              </h3>
              <DonutChart data={severityDonut} />
            </div>
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>
                Keyword Coverage
              </h3>
              <HorizontalBar data={[
                { label: 'Matched', value: selectedMatch.matchedCount, color: '#22c55e' },
                { label: 'Missing', value: selectedMatch.missingCount, color: '#ef4444' },
                { label: 'Total', value: selectedMatch.totalKeywords, color: '#6366f1' }
              ]} width={350} height={120} />
            </div>
          </div>

          <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'rgba(255,255,255,0.8)' }}>
              All Job Keywords ({selectedMatch.jobKeywords.length})
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {selectedMatch.jobKeywords.map(kw => (
                <KeywordChip key={kw.keyword} keyword={kw} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RECOMMENDATIONS ── */}
      {activeTab === 'Recommendations' && selectedMatch && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12 }}>
            {selectedMatch.recommendedEdits.map(edit => (
              <EditCard key={edit.editId} edit={edit} />
            ))}
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {activeTab === 'History' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>🏢 Company Match History</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
            {companyHistory.map(ch => <CompanyCard key={ch.companyId} history={ch} />)}
          </div>

          <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Monthly Match Trends</h3>
            <TrendLine lines={trendLines} labels={trendLabels} width={600} height={180} />
          </div>
        </div>
      )}

      {/* ── TIMELINE ── */}
      {activeTab === 'Timeline' && (
        <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20, maxWidth: 600 }}>
          <JobMatchTimeline logs={auditLogs} />
        </div>
      )}
    </div>
  );
};

export default JobMatchDashboard;
