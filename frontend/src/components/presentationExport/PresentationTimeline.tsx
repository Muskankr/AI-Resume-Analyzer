import React from 'react';
import type { PresentationAuditLog } from './presentationTypes';

interface PresentationTimelineProps { logs: PresentationAuditLog[]; }

const ACTION_STYLES: Record<string, { color: string; icon: string }> = {
  TEMPLATE_SELECTED: { color: '#6366f1', icon: '🎨' },
  EXPORT_GENERATED: { color: '#22c55e', icon: '📤' },
  SECTION_reordered: { color: '#f59e0b', icon: '🔄' },
  COLOR_CHANGED: { color: '#ec4899', icon: '🎨' },
  OPTIMIZATION_APPLIED: { color: '#06b6d4', icon: '⚡' },
  DESIGN_ELEMENT_TOGGLED: { color: '#8b5cf6', icon: '🔧' },
};

export const PresentationTimeline: React.FC<PresentationTimelineProps> = ({ logs }) => (
  <div style={{ padding: '16px 0' }}>
    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 16 }}>📋 Design Activity</h3>
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
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>by {log.performer}</div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
