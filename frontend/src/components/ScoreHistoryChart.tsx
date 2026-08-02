import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import type { AnalysisEntry } from '../hooks/useAnalysisHistory'

interface ScoreHistoryChartProps {
  entries: AnalysisEntry[]
}

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const entry = payload[0].payload
    return (
      <div
        style={{
          backgroundColor: 'var(--bg-color, #1a1a1a)',
          color: 'var(--text-color, #f4f4f5)',
          padding: '8px 12px',
          border: '1px solid var(--border-color, #333)',
          borderRadius: '4px',
          fontSize: '0.85rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>{entry.dateLabel}</div>
        <div>
          Score: <span style={{ color: 'var(--accent-color, #3b82f6)' }}>{entry.score}%</span>
        </div>
        <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '2px' }}>
          Role: {entry.targetRole || 'N/A'}
        </div>
      </div>
    )
  }
  return null
}

export const ScoreHistoryChart: React.FC<ScoreHistoryChartProps> = ({ entries }) => {
  const data = useMemo(() => {
    // Sort entries by timestamp (oldest first)
    const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp)

    // Format timestamp for display
    return sorted.map((entry) => {
      const date = new Date(entry.timestamp)
      return {
        ...entry,
        dateLabel: date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        fullDate: date.toLocaleString(),
      }
    })
  }, [entries])

  if (entries.length < 2) {
    return null // Graceful empty/single-entry state
  }

  return (
    <div
      className="score-history-chart"
      style={{ width: '100%', height: '200px', marginBottom: '1rem', padding: '0 10px' }}
    >
      <h4 style={{ fontSize: '0.9rem', marginBottom: '10px', textAlign: 'center', opacity: 0.9 }}>
        ATS Score History
      </h4>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
          <XAxis dataKey="dateLabel" stroke="#888" fontSize={11} tickMargin={8} minTickGap={15} />
          <YAxis domain={[0, 100]} stroke="#888" fontSize={11} tickFormatter={(val: number) => `${val}`} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--accent-color, #3b82f6)"
            strokeWidth={2}
            dot={{ r: 4, fill: 'var(--accent-color, #3b82f6)' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
