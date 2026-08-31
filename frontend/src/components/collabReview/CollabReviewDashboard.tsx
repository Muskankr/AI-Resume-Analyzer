import React, { useState, useMemo } from 'react';
import {
  StatCard, ReviewerCard, ReviewRequestCard, FeedbackCard, CommentCard,
  LeaderboardCard, ActivityCard
} from './CollabReviewCard';
import {  DonutChart, TrendLine, RadarChart } from './CollabReviewCharts';
import { CollabReviewTimeline } from './CollabReviewTimeline';
import {
  getReviewers, getReviewRequests, getFeedbackItems, getInlineComments,
  getReviewSummary, getLeaderboard, getActivityLog, getAuditLogs, getMonthlyTrends
} from './CollabReviewEngine';
import { SEVERITY_COLORS, STATUS_COLORS,} from './collabReviewTypes';

const TABS = ['Overview', 'Review Requests', 'Feedback', 'Comments', 'Reviewers', 'Leaderboard', 'Activity', 'Timeline'];

const CollabReviewDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedRequestId, setSelectedRequestId] = useState('rr1');

  const reviewers = useMemo(() => getReviewers(), []);
  const requests = useMemo(() => getReviewRequests(), []);
  const feedbackItems = useMemo(() => getFeedbackItems(), []);
  const comments = useMemo(() => getInlineComments(), []);
  const leaderboard = useMemo(() => getLeaderboard(), []);
  const activityLog = useMemo(() => getActivityLog(), []);
  const auditLogs = useMemo(() => getAuditLogs(), []);
  const trends = useMemo(() => getMonthlyTrends(), []);

  const selectedSummary = useMemo(() => getReviewSummary(selectedRequestId), [selectedRequestId]);
  const selectedFeedback = useMemo(() => feedbackItems.filter(f => f.requestId === selectedRequestId), [feedbackItems, selectedRequestId]);
  const selectedComments = useMemo(() => comments.filter(c => c.requestId === selectedRequestId), [comments, selectedRequestId]);

  const totalFeedback = feedbackItems.length;
  const criticalItems = feedbackItems.filter(f => f.severity === 'CRITICAL').length;
  const completedReviews = requests.filter(r => r.status === 'COMPLETED').length;
  const activeReviewers = reviewers.filter(r => r.isAvailable).length;

  // Overview data
  const severityDonut = Object.entries(
    feedbackItems.reduce((acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([label, value]) => ({ label, value, color: SEVERITY_COLORS[label as keyof typeof SEVERITY_COLORS] || '#6b7280' }));

  // const categoryData = Object.entries(
  //   feedbackItems.reduce((acc, f) => { acc[f.category] = (acc[f.category] || 0) + 1; return acc; }, {} as Record<string, number>)
  // ).map(([label, value]) => ({ label, value, color: '#6366f1' }));

  const radarData = selectedSummary.categoryScores.map(c => ({
    label: c.category, value: c.score, max: 100
  }));

  const trendLabels = trends.map(t => t.month);
  const trendLines = [
    { label: 'Avg Score', data: trends.map(t => t.avgScore), color: '#6366f1' },
    { label: 'Reviews', data: trends.map(t => t.reviewsCompleted * 5), color: '#22c55e' },
    { label: 'Feedback', data: trends.map(t => t.feedbackItems), color: '#f59e0b' }
  ];

  const reviewStatusDonut = Object.entries(
    requests.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([label, value]) => ({ label, value, color: STATUS_COLORS[label as keyof typeof STATUS_COLORS] || '#6b7280' }));

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', background: '#121218', minHeight: '100vh', color: '#fff' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>👥 Resume Collaboration & Peer Review</h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 20, fontSize: 14 }}>
        Request reviews, track feedback, collaborate with peers and mentors to perfect your resume
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
            <StatCard label="Avg Review Score" value={`${selectedSummary.overallScore}%`} icon="⭐" color="#6366f1" subtitle="for selected resume" />
            <StatCard label="Total Feedback" value={totalFeedback} icon="💬" color="#f59e0b" subtitle={`${criticalItems} critical`} />
            <StatCard label="Completed Reviews" value={completedReviews} icon="✅" color="#22c55e" subtitle={`of ${requests.length} total`} />
            <StatCard label="Active Reviewers" value={activeReviewers} icon="👥" color="#06b6d4" subtitle={`of ${reviewers.length} total`} />
            <StatCard label="Open Comments" value={comments.filter(c => !c.resolved).length} icon="💭" color="#ec4899" subtitle="need attention" />
            <StatCard label="Acceptance Rate" value={`${Math.round((selectedSummary.acceptedCount / (selectedSummary.totalFeedback || 1)) * 100)}%`} icon="👍" color="#22c55e" subtitle="feedback accepted" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Category Scores</h3>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <RadarChart data={radarData} size={240} color="#6366f1" />
              </div>
            </div>
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Feedback by Severity</h3>
              <DonutChart data={severityDonut} />
            </div>
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Review Status</h3>
              <DonutChart data={reviewStatusDonut} />
            </div>
          </div>

          <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>Review Score Trends</h3>
            <TrendLine lines={trendLines} labels={trendLabels} width={600} height={180} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#22c55e' }}>💪 Top Strengths</h3>
              {selectedSummary.topStrengths.map((s, i) => (
                <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>✅ {s}</div>
              ))}
            </div>
            <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#f59e0b' }}>🔑 Top Improvements</h3>
              {selectedSummary.topImprovements.map((s, i) => (
                <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>📌 {s}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── REVIEW REQUESTS ── */}
      {activeTab === 'Review Requests' && (
        <div>
          <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Viewing:</span>
            <select
              value={selectedRequestId}
              onChange={(e) => setSelectedRequestId(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #2d2d3f', background: '#1e1e2e', color: '#fff', fontSize: 13 }}
            >
              {requests.map(r => (
                <option key={r.requestId} value={r.requestId}>{r.resumeTitle} ({r.status})</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
            {requests.map(req => (
              <div key={req.requestId} onClick={() => setSelectedRequestId(req.requestId)} style={{ cursor: 'pointer' }}>
                <ReviewRequestCard request={req} isSelected={req.requestId === selectedRequestId} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FEEDBACK ── */}
      {activeTab === 'Feedback' && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'rgba(255,255,255,0.8)' }}>
            💬 Feedback for: {requests.find(r => r.requestId === selectedRequestId)?.resumeTitle}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 12 }}>
            {selectedFeedback.map(fb => (
              <FeedbackCard key={fb.feedbackId} feedback={fb} />
            ))}
          </div>
          {selectedFeedback.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>
              No feedback yet for this review request.
            </div>
          )}
        </div>
      )}

      {/* ── COMMENTS ── */}
      {activeTab === 'Comments' && (
        <div style={{ maxWidth: 700 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'rgba(255,255,255,0.8)' }}>
            💭 Inline Comments ({selectedComments.filter(c => !c.resolved).length} open)
          </h3>
          {selectedComments.map(c => (
            <CommentCard key={c.commentId} comment={c} />
          ))}
          {selectedComments.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>
              No inline comments for this review.
            </div>
          )}
        </div>
      )}

      {/* ── REVIEWERS ── */}
      {activeTab === 'Reviewers' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
            {reviewers.map(r => <ReviewerCard key={r.reviewerId} reviewer={r} />)}
          </div>
        </div>
      )}

      {/* ── LEADERBOARD ── */}
      {activeTab === 'Leaderboard' && (
        <div style={{ maxWidth: 700 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>🏆 Top Reviewers</h3>
          {leaderboard.map((entry, i) => (
            <LeaderboardCard key={entry.reviewerId} entry={entry} rank={i + 1} />
          ))}
        </div>
      )}

      {/* ── ACTIVITY ── */}
      {activeTab === 'Activity' && (
        <div style={{ maxWidth: 700, background: '#1e1e2e', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'rgba(255,255,255,0.8)' }}>📡 Recent Activity</h3>
          {activityLog.map(a => <ActivityCard key={a.activityId} activity={a} />)}
        </div>
      )}

      {/* ── TIMELINE ── */}
      {activeTab === 'Timeline' && (
        <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 20, maxWidth: 600 }}>
          <CollabReviewTimeline logs={auditLogs} />
        </div>
      )}
    </div>
  );
};

export default CollabReviewDashboard;
