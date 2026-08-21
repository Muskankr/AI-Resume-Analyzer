import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export interface DashboardStats {
  total_analyses: number;
  average_score: number;
  scores_by_role: Array<{ role: string; average_score: number; count: number }>;
  top_skills_found: Array<{ skill: string; count: number }>;
  top_skills_missing: Array<{ skill: string; count: number }>;
  recent_timeline: Array<{
    id: number;
    created_at: string;
    score: number;
    target_role: string;
    file_name: string;
  }>;
}

interface DashboardChartsProps {
  stats: DashboardStats;
}

const COLORS = ['#38bdf8', '#818cf8', '#a78bfa', '#f472b6', '#fb7185', '#34d399', '#fbbf24'];

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ stats }) => {
  const timelineData = useMemo(() => {
    return stats.recent_timeline.map((item) => ({
      name: new Date(item.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      score: item.score,
      role: item.target_role,
      fileName: item.file_name,
    }));
  }, [stats.recent_timeline]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(15, 23, 42, 0.95)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ margin: 0, color: '#e2e8f0', fontWeight: 'bold' }}>{label}</p>
          <p style={{ margin: '4px 0 0', color: '#38bdf8' }}>Score: {payload[0].value}%</p>
          {payload[0].payload.fileName && <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '12px' }}>{payload[0].payload.fileName}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-charts-container">
      <div className="row g-4 mb-4">
        <div className="col-lg-12">
          <div className="chart-card glass-panel p-4" style={{ borderRadius: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h5 className="mb-4 text-start" style={{ color: '#f8fafc', fontWeight: 600 }}>Score History (Recent Searches)</h5>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="score" stroke="#38bdf8" strokeWidth={3} activeDot={{ r: 8 }} dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="chart-card glass-panel p-4" style={{ borderRadius: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.1)', height: '100%' }}>
            <h5 className="mb-4 text-start" style={{ color: '#f8fafc', fontWeight: 600 }}>Top Technical Skills Found</h5>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={stats.top_skills_found} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                  <YAxis dataKey="skill" type="category" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} width={80} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <Bar dataKey="count" fill="#34d399" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        <div className="col-lg-6">
          <div className="chart-card glass-panel p-4" style={{ borderRadius: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.1)', height: '100%' }}>
            <h5 className="mb-4 text-start" style={{ color: '#f8fafc', fontWeight: 600 }}>Commonly Missing Skills</h5>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={stats.top_skills_missing} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                  <YAxis dataKey="skill" type="category" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} width={80} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <Bar dataKey="count" fill="#fb7185" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-12">
          <div className="chart-card glass-panel p-4" style={{ borderRadius: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h5 className="mb-4 text-start" style={{ color: '#f8fafc', fontWeight: 600 }}>Performance by Target Role</h5>
            <div style={{ width: '100%', height: 350, display: 'flex', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.scores_by_role}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="role"
                  >
                    {stats.scores_by_role.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value} Analyses (Avg Score: ${props.payload.average_score}%)`,
                      name,
                    ]}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
