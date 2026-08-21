import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Map, Briefcase, ChevronRight, Plus, Archive, ExternalLink, FileText, CheckCircle, Trash2 } from 'lucide-react';
import axios from 'axios';
import { Footer } from '../Footer';
import { JobTrackerStats } from './JobTrackerStats';
import './JobTracker.css';

interface JobApplication {
    id: number;
    company: string;
    role_title: string;
    status: 'WISHLIST' | 'APPLIED' | 'INTERVIEWING' | 'OFFER' | 'REJECTED';
    notes: string;
    created_at: string;
    updated_at: string;
}

export const JobTrackerPage: React.FC = () => {
    const { user } = useAuth();
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [loading, setLoading] = useState(true);

    const [newCompany, setNewCompany] = useState('');
    const [newRole, setNewRole] = useState('');

    const COLUMNS = [
        { id: 'WISHLIST', label: 'Wishlist', icon: <Archive size={16} />, color: 'text-slate-400', bgColor: 'bg-slate-500/10' },
        { id: 'APPLIED', label: 'Applied', icon: <Briefcase size={16} />, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
        { id: 'INTERVIEWING', label: 'Interviewing', icon: <Map size={16} />, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
        { id: 'OFFER', label: 'Offer', icon: <CheckCircle size={16} />, color: 'text-green-400', bgColor: 'bg-green-500/10' },
        { id: 'REJECTED', label: 'Rejected', icon: <Trash2 size={16} />, color: 'text-red-400', bgColor: 'bg-red-500/10' },
    ];

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/applications/', {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            setApplications(res.data.applications);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddApplication = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCompany || !newRole) return;

        try {
            const res = await axios.post('http://localhost:8000/api/applications/create/', {
                company: newCompany,
                role_title: newRole,
                status: 'WISHLIST'
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            setApplications([res.data, ...applications]);
            setNewCompany('');
            setNewRole('');
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await axios.delete(`http://localhost:8000/api/applications/${id}/delete/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            setApplications(applications.filter(a => a.id !== id));
        } catch (e) {
            console.error(e);
        }
    };

    const updateStatus = async (id: number, newStatus: string) => {
        try {
            const res = await axios.put(`http://localhost:8000/api/applications/${id}/update/`, {
                status: newStatus
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });

            setApplications(applications.map(a => a.id === id ? { ...a, status: res.data.status } as JobApplication : a));
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="job-tracker-page min-h-screen">
            <div className="container mx-auto px-4 py-8">

                <div className="mb-8 border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center gap-3">
                            <Briefcase className="text-blue-400" size={32} />
                            Application Tracker
                        </h1>
                        <p className="text-slate-400 mt-2">Manage your active pipeline and track conversions from Wishlist to Offer.</p>
                    </div>

                    <form onSubmit={handleAddApplication} className="flex max-w-lg w-full gap-2">
                        <input
                            type="text"
                            value={newCompany}
                            onChange={(e) => setNewCompany(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="Google, Stripe, etc."
                            required
                        />
                        <input
                            type="text"
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="Role Title"
                            required
                        />
                        <button
                            type="submit"
                            className="px-4 rounded-xl font-bold transition-all flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white hover:scale-105"
                        >
                            <Plus size={24} />
                        </button>
                    </form>
                </div>

                {applications.length > 0 && <JobTrackerStats applications={applications} />}

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                    </div>
                ) : (
                    <div className="flex gap-4 overflow-x-auto pb-8 kanban-scroll scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {COLUMNS.map(col => {
                            const colApps = applications.filter(a => a.status === col.id);

                            return (
                                <div key={col.id} className="kanban-column bg-slate-800/40 rounded-2xl border border-white/5 p-4 flex flex-col gap-3 min-w-[300px] w-[300px] shrink-0">
                                    <div className={`flex items-center gap-2 font-bold px-3 py-2 rounded-lg ${col.bgColor} ${col.color} border border-white/5`}>
                                        {col.icon}
                                        {col.label}
                                        <span className="ml-auto bg-slate-900 px-2 py-0.5 rounded-full text-xs font-mono text-slate-300">
                                            {colApps.length}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-3 flex-1">
                                        {colApps.length === 0 ? (
                                            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center opacity-40">
                                                {col.icon}
                                                <span className="text-sm mt-2 font-medium">No empty</span>
                                            </div>
                                        ) : (
                                            colApps.map(app => (
                                                <div key={app.id} className="bg-slate-900 border border-white/10 hover:border-blue-500/50 transition-all rounded-xl p-4 shadow-lg flex flex-col gap-2 relative group">

                                                    <button
                                                        title="Delete"
                                                        className="absolute top-3 right-3 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                        onClick={() => handleDelete(app.id)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>

                                                    <div className="font-bold text-white text-lg leading-tight mb-1">{app.company}</div>
                                                    <div className="text-slate-400 text-sm font-medium">{app.role_title}</div>

                                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                                                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                            <FileText size={12} /> {(new Date(app.created_at)).toLocaleDateString()}
                                                        </span>

                                                        <select
                                                            className="bg-white/5 border border-white/10 rounded-md text-xs px-2 py-1 text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer hover:bg-white/10"
                                                            value={app.status}
                                                            onChange={(e) => updateStatus(app.id, e.target.value)}
                                                        >
                                                            {COLUMNS.map(c => (
                                                                <option key={c.id} value={c.id} className="bg-slate-900 text-sm">{c.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
};
