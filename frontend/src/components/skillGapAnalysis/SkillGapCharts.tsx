import React from 'react';
// import {
//   UserSkill, SkillGap, CATEGORY_COLORS, PROFICIENCY_COLORS, SEVERITY_COLORS
// } from './skillGapTypes';

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  width?: number;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({ data, width = 400, height = 200 }) => {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.max(16, (width - 40) / data.length - 6);
  return (
    <svg width={width} height={height + 30} viewBox={`0 0 ${width} ${height + 30}`}>
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <g key={f}>
          <line x1={30} y1={height - f * (height - 20)} x2={width - 10} y2={height - f * (height - 20)} stroke="#2d2d3f" strokeWidth={1} />
          <text x={25} y={height - f * (height - 20) + 3} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.3)">{Math.round(maxVal * f)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const barH = (d.value / maxVal) * (height - 20);
        const x = 35 + i * ((width - 45) / data.length);
        return (
          <g key={i}>
            <rect x={x} y={height - barH} width={barWidth} height={barH} rx={3} fill={d.color || '#6366f1'} opacity={0.85} />
            <text x={x + barWidth / 2} y={height + 14} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.5)">
              {d.label.length > 5 ? d.label.slice(0, 5) + '…' : d.label}
            </text>
            <text x={x + barWidth / 2} y={height - barH - 5} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={600}>
              {d.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({ data, size = 160 }) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2, cy = size / 2, r = size / 2 - 10, inner = r * 0.6;
  let cum = 0;
  const slices = data.map(d => {
    const start = (cum / total) * Math.PI * 2 - Math.PI / 2;
    cum += d.value;
    const end = (cum / total) * Math.PI * 2 - Math.PI / 2;
    const largeArc = end - start > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    const ix1 = cx + inner * Math.cos(start), iy1 = cy + inner * Math.sin(start);
    const ix2 = cx + inner * Math.cos(end), iy2 = cy + inner * Math.sin(end);
    const path = `M${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} L${ix2},${iy2} A${inner},${inner} 0 ${largeArc} 0 ${ix1},${iy1} Z`;
    return <path key={d.label} d={path} fill={d.color} />;
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={size} height={size}>{slices}</svg>
      <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map(d => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color }} />
            <span>{d.label}: {d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface TrendLineProps {
  lines: { label: string; data: number[]; color: string }[];
  labels?: string[];
  width?: number;
  height?: number;
}

export const TrendLine: React.FC<TrendLineProps> = ({ lines, labels = [], width = 400, height = 180 }) => {
  const allVals = lines.flatMap(l => l.data);
  const maxVal = Math.max(...allVals, 1);
  const n = lines[0]?.data.length || 1;
  const px = (i: number) => 35 + (i / (n - 1 || 1)) * (width - 55);
  const py = (v: number) => height - 20 - ((v / maxVal) * (height - 40));

  return (
    <svg width={width} height={height + 25} viewBox={`0 0 ${width} ${height + 25}`}>
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <g key={f}>
          <line x1={35} y1={py(maxVal * f)} x2={width - 10} y2={py(maxVal * f)} stroke="#2d2d3f" strokeWidth={1} />
          <text x={30} y={py(maxVal * f) + 3} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.3)">{Math.round(maxVal * f)}</text>
        </g>
      ))}
      {labels.map((l, i) => (
        <text key={i} x={px(i)} y={height + 18} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.4)">
          {l.length > 3 ? l.slice(0, 3) : l}
        </text>
      ))}
      {lines.map(line => {
        const pts = line.data.map((v, i) => `${px(i)},${py(v)}`).join(' ');
        return (
          <g key={line.label}>
            <polyline points={pts} fill="none" stroke={line.color} strokeWidth={2} strokeLinejoin="round" />
            {line.data.map((v, i) => (
              <circle key={i} cx={px(i)} cy={py(v)} r={3} fill={line.color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
};

interface RadarChartProps {
  data: { label: string; value: number; max?: number }[];
  size?: number;
  color?: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({ data, size = 200, color = '#6366f1' }) => {
  const cx = size / 2, cy = size / 2, r = size / 2 - 30;
  const n = data.length;
  const angle = (i: number) => (i * 2 * Math.PI) / n - Math.PI / 2;
  const maxVal = Math.max(...data.map(d => d.max || 10), 1);

  const polygon = (vals: number[]) => vals.map((v, i) => {
    const rad = (v / maxVal) * r;
    return `${cx + rad * Math.cos(angle(i))},${cy + rad * Math.sin(angle(i))}`;
  }).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map(f => (
        <polygon key={f} points={data.map((_, i) => {
          const rad = f * r;
          return `${cx + rad * Math.cos(angle(i))},${cy + rad * Math.sin(angle(i))}`;
        }).join(' ')} fill="none" stroke="#2d2d3f" strokeWidth={1} />
      ))}
      {data.map((_, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(angle(i))} y2={cy + r * Math.sin(angle(i))} stroke="#2d2d3f" strokeWidth={1} />
      ))}
      <polygon points={polygon(data.map(d => d.value))} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={2} />
      {data.map((d, i) => {
        const lx = cx + (r + 20) * Math.cos(angle(i));
        const ly = cy + (r + 20) * Math.sin(angle(i));
        return <text key={i} x={lx} y={ly} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.6)">{d.label}</text>;
      })}
    </svg>
  );
};

interface HorizontalBarProps {
  data: { label: string; value: number; color?: string }[];
  width?: number;
  height?: number;
}

export const HorizontalBar: React.FC<HorizontalBarProps> = ({ data, width = 400, height = 200 }) => {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barH = Math.max(16, (height - 10) / data.length - 6);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {data.map((d, i) => {
        const y = i * (barH + 6);
        const w = (d.value / maxVal) * (width - 120);
        return (
          <g key={i}>
            <text x={100} y={y + barH / 2 + 3} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.6)">{d.label}</text>
            <rect x={105} y={y} width={w} height={barH} rx={3} fill={d.color || '#6366f1'} opacity={0.85} />
            <text x={110 + w} y={y + barH / 2 + 3} fontSize={10} fill="#fff" fontWeight={600}>{d.value}</text>
          </g>
        );
      })}
    </svg>
  );
};

// Specialized chart: Gap comparison (current vs target proficiency)
interface GapComparisonProps {
  gaps: { skill: string; current: number; target: number }[];
  width?: number;
  height?: number;
}

export const GapComparisonChart: React.FC<GapComparisonProps> = ({ gaps, width = 500, height = 200 }) => {
  const maxVal = 4; // Max proficiency level (EXPERT = 4)
  const barGroupWidth = (width - 60) / gaps.length;
  const barW = Math.min(20, barGroupWidth / 2 - 4);

  return (
    <svg width={width} height={height + 40} viewBox={`0 0 ${width} ${height + 40}`}>
      {[0, 1, 2, 3, 4].map(v => (
        <g key={v}>
          <line x1={45} y1={height - (v / maxVal) * (height - 20)} x2={width - 10} y2={height - (v / maxVal) * (height - 20)} stroke="#2d2d3f" strokeWidth={1} />
          <text x={40} y={height - (v / maxVal) * (height - 20) + 3} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.3)">{v}</text>
        </g>
      ))}
      {gaps.map((g, i) => {
        const x = 55 + i * barGroupWidth;
        const currentH = (g.current / maxVal) * (height - 20);
        const targetH = (g.target / maxVal) * (height - 20);
        return (
          <g key={i}>
            <rect x={x} y={height - currentH} width={barW} height={currentH} rx={2} fill="#3b82f6" opacity={0.85} />
            <rect x={x + barW + 4} y={height - targetH} width={barW} height={targetH} rx={2} fill="#f59e0b" opacity={0.85} />
            <text x={x + barW + 2} y={height + 14} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.5)">
              {g.skill.length > 6 ? g.skill.slice(0, 6) + '…' : g.skill}
            </text>
          </g>
        );
      })}
      {/* Legend */}
      <rect x={width - 140} y={5} width={10} height={10} rx={2} fill="#3b82f6" />
      <text x={width - 126} y={14} fontSize={10} fill="rgba(255,255,255,0.6)">Current</text>
      <rect x={width - 70} y={5} width={10} height={10} rx={2} fill="#f59e0b" />
      <text x={width - 56} y={14} fontSize={10} fill="rgba(255,255,255,0.6)">Target</text>
    </svg>
  );
};
