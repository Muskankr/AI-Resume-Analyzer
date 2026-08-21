import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardCharts, DashboardStats } from '../components/DashboardCharts';
import { Home, ExternalLink, Activity, Trophy, Code2, AlertTriangle, UserCheck } from 'lucide-react';
import { Footer } from '../Footer';
import './Dashboard.css';

export const DashboardPage: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            // Must be authenticated to view dashboard
            setLoading(false);
            return;
        }

        let isMounted = true;

        const fetchDashboardStats = async () => {
            try {
                setLoading(true);
                const response = await api.get('/api/dashboard/stats/');
                if (isMounted) {
                    setStats(response.data);
                    setError(null);
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message || 'Failed to load dashboard data.');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchDashboardStats();

        return () => {
            isMounted = false;
        };
    }, [user]);

    if (!user) {
        return (
            <div className="container mt-5 text-center">
                <h2 className="mb-4">You need to sign in to view your dashboard</h2>
                <Link to="/" className="app-btn px-4 py-2" style={{ textDecoration: 'none' }}>Go Home</Link>
            </div>
        );
    }

    return (
        <div className="dashboard-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <nav className="navbar navbar-expand-lg" style={{ background: 'transparent', padding: '20px 0' }}>
                <div className="container">
                    <Link to="/" className="navbar-brand text-white d-flex align-items-center" style={{ gap: '10px', fontSize: '1.25rem', fontWeight: 600 }}>
                        <Home size={24} /> AI Resume Analyzer
                    </Link>
                    <div className="d-flex align-items-center gap-3">
                        <span style={{ color: '#94a3b8' }}>
                            Welcome back, <strong className="text-white">{user.username}</strong>
                        </span>
                        <button className="auth-bar-btn" onClick={() => { logout(); navigate('/'); }}>Logout</button>
                    </div>
                </div>
            </nav>

            <div className="container my-5 flex-grow-1">
                <div className="d-flex justify-content-between align-items-center mb-5 border-bottom pb-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <h2 style={{ fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Activity className="text-info" size={32} /> Your Analytical Dashboard
                    </h2>
                    <div>
                        <Link to="/" className="app-btn-outline px-4 py-2 d-flex align-items-center gap-2" style={{ textDecoration: 'none' }}>
                            New Analysis <ExternalLink size={18} />
                        </Link>
                    </div>
                </div>

                {loading && (
                    <div className="text-center my-5 py-5">
                        <div className="spinner-border text-info" role="status" style={{ width: '3rem', height: '3rem' }}>
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-3 text-muted">Intelligently aggregating your resume data...</p>
                    </div>
                )}

                {error && !loading && (
                    <div className="alert custom-alert-danger text-center glass-panel p-4 my-4" role="alert">
                        <AlertTriangle className="mb-3 text-danger" size={48} />
                        <h4>Failed to load dashboard</h4>
                        <p>{error}</p>
                        <button className="app-btn mt-3" onClick={() => window.location.reload()}>Retry</button>
                    </div>
                )}

                {!loading && !error && stats && (
                    <>
                        {/* Top Indicator Cards */}
                        <div className="row g-4 mb-5">
                            <div className="col-md-4">
                                <div className="glass-panel p-4 text-center h-100" style={{ borderRadius: '16px', borderTop: '4px solid #38bdf8' }}>
                                    <div className="mb-3 text-info"><Trophy size={40} /></div>
                                    <h4 style={{ color: '#94a3b8', fontSize: '1rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Average ATS Score</h4>
                                    <div className="display-4 fw-bold mt-2" style={{ color: stats.average_score >= 80 ? '#4ade80' : stats.average_score >= 60 ? '#fbbf24' : '#f87171' }}>
                                        {stats.average_score}%
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="glass-panel p-4 text-center h-100" style={{ borderRadius: '16px', borderTop: '4px solid #818cf8' }}>
                                    <div className="mb-3 text-primary"><UserCheck size={40} /></div>
                                    <h4 style={{ color: '#94a3b8', fontSize: '1rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Resumes Analysed</h4>
                                    <div className="display-4 fw-bold text-white mt-2">
                                        {stats.total_analyses}
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="glass-panel p-4 text-center h-100" style={{ borderRadius: '16px', borderTop: '4px solid #a78bfa' }}>
                                    <div className="mb-3 text-purple" style={{ color: '#a78bfa' }}><Code2 size={40} /></div>
                                    <h4 style={{ color: '#94a3b8', fontSize: '1rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Primary Target Role</h4>
                                    <div className="h3 fw-bold text-white mt-3 pb-2">
                                        {stats.scores_by_role.length > 0 ? stats.scores_by_role[0].role : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {stats.total_analyses > 0 ? (
                            <DashboardCharts stats={stats} />
                        ) : (
                            <div className="text-center glass-panel p-5 my-5" style={{ borderRadius: '16px' }}>
                                <Activity size={64} className="text-secondary mb-4 opacity-50" />
                                <h3>No analysis data yet.</h3>
                                <p className="text-muted mt-2 mb-4">Start analyzing resumes to generate your comprehensive dashboard profile.</p>
                                <Link to="/" className="app-btn px-4 py-3" style={{ textDecoration: 'none', fontSize: '1.1rem' }}>Analyze First Resume</Link>
                            </div>
                        )}
                    </>
                )}
            </div>
            <Footer />
        </div>
    );
};

export default DashboardPage;
