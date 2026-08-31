import React from 'react';
import type { PrepAuditLog } from './interviewPrepTypes';

interface InterviewPrepTimelineProps { logs: PrepAuditLog[]; }

const ACTION_STYLES: Record<string, { color: string; icon: string }> = {
  PRACTICE_COMPLETED: { color: '#22c55e', icon: '✅' },
  SESSION_STARTED: { color: '#3b82f6', icon: '▶️' },
  STAR_SAVED: { color: '#f59e0b', icon: '⭐' },
  MOCK_INTERVIEW_DONE: { color: '#8b5cf6', icon: '🎤' },
  FEEDBACK_RECEIVED: { color: '#ec4899', icon: '💬' },
  STREAK_ACHIEVED: { color: '#f59e0b', icon: '🔥' },
};

export const InterviewPrepTimeline: React.FC<InterviewPrepTimelineProps> = ({ logs }) => (
  <div style={{ padding: '16px 0' }}>
    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 16 }}>📋 Practice Activity</h3>
    <div style={{ position: 'relative', paddingLeft: 24 }}>
      <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: '#2d2d3f' }} />
      {logs.map((log) => {
        const style = ACTION_STYLES[log.action] || { color: '#6b7280', icon: '📝' };
        const date = new Date(log.timestamp);
        const timeStr = date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        return (
          <div key={log.logId} style={{ marginBottom: 20, position: 'relative' }}>
            <div style={{ position: 'absolute', left: -20, top: 4, width: 12, height: 12, borderRadius: 6, background: style.color, border: '2px solid #1e1e2e' }} />
            <div style={{ background: '#1e1e2e', borderRadius: 10, padding: '10px 14px', border: `1px solid ${style.color}30` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{style.icon} {log.action.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{timeStr}</span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{log.details}</div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
