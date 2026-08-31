import React from 'react';
// 1. Type-only imports (stripped out during compilation)
import type {
  Reviewer, 
  ReviewRequest, 
  FeedbackItem, 
  InlineComment,
  ReviewerLeaderboard, 
  CollaborationActivityLog
} from './collabReviewTypes';

// 2. Runtime values (compiled into real JavaScript for your UI)
import {
  STATUS_COLORS, 
  ROLE_COLORS, 
  SEVERITY_COLORS, 
  CATEGORY_ICONS,
  ROLE_ICONS, 
  ACTIVITY_ICONS, 
  getScoreColor
} from './collabReviewTypes';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, subtitle }) => (
  <div style={{
    background: '#1e1e2e', borderRadius: 12, padding: '20px 16px',
    borderLeft: `4px solid ${color}`, display: 'flex', flexDirection: 'column', gap: 8
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{label}</span>
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    {subtitle && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{subtitle}</div>}
  </div>
);

interface ReviewerCardProps {
  reviewer: Reviewer;
}

export const ReviewerCard: React.FC<ReviewerCardProps> = ({ reviewer }) => (
  <div style={{
    background: '#1e1e2e', borderRadius: 12, padding: 16,
    borderLeft: `4px solid ${ROLE_COLORS[reviewer.role]}`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>{reviewer.avatar}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{reviewer.name}</div>
          <div style={{ fontSize: 12, color: ROLE_COLORS[reviewer.role] }}>{ROLE_ICONS[reviewer.role]} {reviewer.role.replace(/_/g, ' ')}</div>
        </div>
      </div>
      <div style={{
        width: 10, height: 10, borderRadius: 5,
        background: reviewer.isAvailable ? '#22c55e' : '#ef4444'
      }} />
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
      {reviewer.expertise.map(e => (
        <span key={e} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#2d2d3f', color: 'rgba(255,255,255,0.5)' }}>{e}</span>
      ))}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
      <span>📝 {reviewer.reviewsCompleted} reviews</span>
      <span>⭐ {reviewer.avgRating}</span>
      <span>⏱️ {reviewer.responseTime}</span>
    </div>
  </div>
);

interface ReviewRequestCardProps {
  request: ReviewRequest;
  isSelected?: boolean;
}

export const ReviewRequestCard: React.FC<ReviewRequestCardProps> = ({ request, isSelected }) => {
  const completedCount = request.reviewers.filter(r => r.status === 'COMPLETED').length;
  const totalReviewers = request.reviewers.length;
  const avgScore = request.reviewers
    .filter(r => r.overallScore !== undefined)
    .reduce((sum, r, _, arr) => sum + (r.overallScore || 0) / arr.length, 0);

  return (
    <div style={{
      background: '#1e1e2e', borderRadius: 12, padding: 16,
      border: isSelected ? '2px solid #6366f1' : '2px solid transparent',
      borderLeft: `4px solid ${STATUS_COLORS[request.status]}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{request.resumeTitle}</span>
        {request.isUrgent && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#ef444430', color: '#ef4444', fontWeight: 600 }}>🔥 URGENT</span>}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
        🎯 {request.targetRole} · {request.resumeVersion}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: `${STATUS_COLORS[request.status]}20`, color: STATUS_COLORS[request.status], fontWeight: 600 }}>
          {request.status}
        </span>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#2d2d3f', color: 'rgba(255,255,255,0.5)' }}>
          📋 {completedCount}/{totalReviewers} reviews
        </span>
        {avgScore > 0 && (
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#2d2d3f', color: getScoreColor(avgScore) }}>
            ⭐ {Math.round(avgScore)}%
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {request.reviewers.map(r => (
          <span key={r.reviewerId} style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 8,
            background: r.status === 'COMPLETED' ? '#22c55e15' : r.status === 'IN_PROGRESS' ? '#3b82f615' : '#f59e0b15',
            color: r.status === 'COMPLETED' ? '#22c55e' : r.status === 'IN_PROGRESS' ? '#3b82f6' : '#f59e0b'
          }}>
            {r.reviewerName} ({r.role.replace(/_/g, ' ')})
          </span>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
        📅 Deadline: {request.deadline}
      </div>
    </div>
  );
};

interface FeedbackCardProps {
  feedback: FeedbackItem;
}

export const FeedbackCard: React.FC<FeedbackCardProps> = ({ feedback }) => (
  <div style={{
    background: '#1e1e2e', borderRadius: 12, padding: 16,
    borderLeft: `4px solid ${SEVERITY_COLORS[feedback.severity]}`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{CATEGORY_ICONS[feedback.category]}</span>
        <span style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>{feedback.category}</span>
      </div>
      <span style={{
        fontSize: 11, padding: '2px 8px', borderRadius: 10,
        background: `${SEVERITY_COLORS[feedback.severity]}20`,
        color: SEVERITY_COLORS[feedback.severity], fontWeight: 600
      }}>{feedback.severity}</span>
    </div>
    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
      📄 {feedback.section} {feedback.lineReference ? `· ${feedback.lineReference}` : ''}
    </div>
    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '0 0 8px', lineHeight: 1.5 }}>{feedback.comment}</p>
    {feedback.originalText && feedback.suggestedText && (
      <div style={{ fontSize: 11, background: '#2d2d3f', borderRadius: 8, padding: 10, marginBottom: 8 }}>
        <div style={{ color: '#ef4444', marginBottom: 4 }}>❌ {feedback.originalText}</div>
        <div style={{ color: '#22c55e' }}>✅ {feedback.suggestedText}</div>
      </div>
    )}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
        👤 {feedback.reviewerName} · {new Date(feedback.createdAt).toLocaleDateString()}
      </span>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: feedback.isAccepted ? '#22c55e' : 'rgba(255,255,255,0.4)' }}>
          👍 {feedback.upvotes} {feedback.isAccepted ? '✅ Accepted' : ''}
        </span>
      </div>
    </div>
  </div>
);

interface CommentCardProps {
  comment: InlineComment;
}

export const CommentCard: React.FC<CommentCardProps> = ({ comment }) => (
  <div style={{
    background: '#1e1e2e', borderRadius: 10, padding: 14,
    border: `1px solid ${comment.resolved ? '#22c55e40' : '#2d2d3f'}`,
    opacity: comment.resolved ? 0.7 : 1
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{comment.reviewerName}</span>
        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: '#2d2d3f', color: 'rgba(255,255,255,0.5)' }}>
          {comment.type}
        </span>
      </div>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
        📄 {comment.section}, Line {comment.lineNumber}
      </span>
    </div>
    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '0 0 8px' }}>{comment.text}</p>
    {comment.replies.length > 0 && (
      <div style={{ borderTop: '1px solid #2d2d3f', paddingTop: 8, marginTop: 4 }}>
        {comment.replies.map(reply => (
          <div key={reply.commentId} style={{ fontSize: 12, marginLeft: 16, marginBottom: 4 }}>
            <span style={{ color: '#6366f1', fontWeight: 600 }}>{reply.reviewerName}: </span>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>{reply.text}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

interface LeaderboardCardProps {
  entry: ReviewerLeaderboard;
  rank: number;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ entry, rank }) => (
  <div style={{
    background: '#1e1e2e', borderRadius: 12, padding: 16,
    borderLeft: `4px solid ${rank <= 3 ? '#f59e0b' : '#2d2d3f'}`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: 28, height: 28, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: rank === 1 ? '#f59e0b' : rank === 2 ? '#9ca3af' : rank === 3 ? '#cd7f32' : '#2d2d3f',
          fontSize: 13, fontWeight: 700, color: '#fff'
        }}>{rank}</span>
        <span style={{ fontSize: 22 }}>{entry.avatar}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{entry.name}</div>
          <div style={{ fontSize: 11, color: ROLE_COLORS[entry.role] }}>{entry.role.replace(/_/g, ' ')}</div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>⭐ {entry.avgScore}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{entry.helpfulVotes} helpful votes</div>
      </div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
      <span>📝 {entry.totalReviews} reviews</span>
      <span>⏱️ ~{entry.responseTimeHours}h response</span>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
      {entry.specializations.map(s => (
        <span key={s} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#2d2d3f', color: 'rgba(255,255,255,0.4)' }}>{s}</span>
      ))}
    </div>
  </div>
);

interface ActivityCardProps {
  activity: CollaborationActivityLog;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({ activity }) => (
  <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
    <span style={{ fontSize: 24 }}>{activity.actorAvatar}</span>
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{activity.actorName}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          {new Date(activity.timestamp).toLocaleString()}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>
        {ACTIVITY_ICONS[activity.type]} {activity.details}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>📄 {activity.targetResume}</div>
    </div>
  </div>
);
