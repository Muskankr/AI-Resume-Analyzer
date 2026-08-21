import React, { useMemo } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid
} from 'recharts';
import { Target, TrendingUp, Filter } from 'lucide-react';

interface JobApplication {
    id: number;
    company: string;
    role_title: string;
    status: 'WISHLIST' | 'APPLIED' | 'INTERVIEWING' | 'OFFER' | 'REJECTED';
    notes: string;
    created_at: string;
    updated_at: string;
}

interface JobTrackerStatsProps {
    applications: JobApplication[];
}

export const JobTrackerStats: React.FC<JobTrackerStatsProps> = ({ applications }) => {
    const stats = useMemo(() => {
        const counts = {
            WISHLIST: 0,
            APPLIED: 0,
            INTERVIEWING: 0,
            OFFER: 0,
            REJECTED: 0
        };
        applications.forEach(app => {
            if (counts[app.status] !== undefined) {
                counts[app.status]++;
            }
        });

        const total = applications.length;
        const responseRate = total > 0 ? ((counts.INTERVIEWING + counts.OFFER + counts.REJECTED) / (total - counts.WISHLIST) * 100).toFixed(1) : '0.0';
        const offerRate = total > 0 && (total - counts.WISHLIST) > 0 ? ((counts.OFFER) / (total - counts.WISHLIST) * 100).toFixed(1) : '0.0';

        return { counts, total, responseRate, offerRate };
    }, [applications]);

    const pieData = [
        { name: 'Wishlist', value: stats.counts.WISHLIST, color: '#94a3b8' },
        { name: 'Applied', value: stats.counts.APPLIED, color: '#3b82f6' },
        { name: 'Interviewing', value: stats.counts.INTERVIEWING, color: '#a855f7' },
        { name: 'Offer', value: stats.counts.OFFER, color: '#22c55e' },
        { name: 'Rejected', value: stats.counts.REJECTED, color: '#ef4444' }
    ].filter(d => d.value > 0);

    const funnelData = [
        { stage: 'Applied', count: applications.length - stats.counts.WISHLIST },
        { stage: 'Response', count: stats.counts.INTERVIEWING + stats.counts.OFFER + stats.counts.REJECTED },
        { stage: 'Interviews', count: stats.counts.INTERVIEWING + stats.counts.OFFER },
        { stage: 'Offers', count: stats.counts.OFFER }
    ];

    if (applications.length === 0) {
        return (
            <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-6 mb-8 mt-4 text-center text-slate-400">
                Add some applications to see your statistics!
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-4">
            <div className="bg-slate-800/80 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <TrendingUp className="text-blue-400 mb-3" size={32} />
                <div className="text-4xl font-black text-white mb-1">{stats.total}</div>
                <div className="text-sm font-medium text-slate-400 uppercase tracking-widest">Total Tracked</div>
            </div>

            <div className="bg-slate-800/80 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Filter className="text-purple-400 mb-3" size={32} />
                <div className="text-4xl font-black text-white mb-1">{stats.responseRate}%</div>
                <div className="text-sm font-medium text-slate-400 uppercase tracking-widest">Response Rate</div>
            </div>

            <div className="bg-slate-800/80 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Target className="text-green-400 mb-3" size={32} />
                <div className="text-4xl font-black text-white mb-1">{stats.offerRate}%</div>
                <div className="text-sm font-medium text-slate-400 uppercase tracking-widest">Offer Rate</div>
            </div>

            <div className="md:col-span-1 bg-slate-800/40 border border-white/10 rounded-2xl p-6 h-80">
                <h3 className="text-lg font-bold text-slate-200 mb-4 text-center">Status Breakdown</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                            itemStyle={{ color: '#f8fafc' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="md:col-span-2 bg-slate-800/40 border border-white/10 rounded-2xl p-6 h-80">
                <h3 className="text-lg font-bold text-slate-200 mb-4 text-center">Application Funnel</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="stage" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                        <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} allowDecimals={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                            cursor={{ fill: '#334155', opacity: 0.4 }}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                            {funnelData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={
                                    index === 0 ? '#3b82f6' :
                                        index === 1 ? '#8b5cf6' :
                                            index === 2 ? '#d946ef' : '#22c55e'
                                } />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
