import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface ChartDataPoint {
  date: string
  score: number
  fileName: string
}

interface ScoreTimelineChartProps {
  data: ChartDataPoint[]
}

export const ScoreTimelineChart: React.FC<ScoreTimelineChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div
        className="d-flex justify-content-center align-items-center bg-light rounded"
        style={{ height: '300px' }}
      >
        <p className="text-muted mb-0">No analysis history available yet.</p>
      </div>
    )
  }

  return (
    <div className="card shadow-sm mb-4 border-0">
      <div className="card-body">
        <h5 className="card-title mb-4 fw-semibold">ATS Score Progression</h5>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: -20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${value}%`, 'Score']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#0d6efd"
                strokeWidth={3}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
