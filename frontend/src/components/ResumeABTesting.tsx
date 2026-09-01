import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ResumeABTesting.css';

interface ResumeStat {
    resume_id: number | null;
    resume_name: string;
    total_applications: number;
    successful_applications: number;
    success_rate: number;
}

interface ABStats {
    total_applications: number;
    resume_stats: ResumeStat[];
    best_performing_resume_id: number | null;
}

interface ApplicationFormData {
    resume_analysis: number | null;
    company_name: string;
    job_title: string;
    status: string;
    notes: string;
}

const ResumeABTesting: React.FC = () => {
    const [stats, setStats] = useState<ABStats | null>(null);
    const [formData, setFormData] = useState<ApplicationFormData>({
        resume_analysis: null,
        company_name: '',
        job_title: '',
        status: 'applied',
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/ab-testing-stats/');
            setStats(response.data);
        } catch (err: any) {
            setError('Failed to load A/B testing statistics.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'resume_analysis' ? (value ? Number(value) : null) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            await axios.post('/api/log-application/', formData);
            setSuccessMsg('Application logged successfully!');
            setFormData({ resume_analysis: null, company_name: '', job_title: '', status: 'applied', notes: '' });
            fetchStats(); // Refresh stats
        } catch (err: any) {
            setError(err.response?.data?.errors ? JSON.stringify(err.response.data.errors) : 'Failed to log application.');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !stats) {
        return <div className="loading-container">Loading A/B Testing Dashboard...</div>;
    }

    return (
        <div className="ab-testing-container">
            <h2 className="ab-title">Resume A/B Testing Dashboard</h2>

            <div className="ab-workspace">
                <div className="log-panel glass-card">
                    <h3>Log New Application</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="resume_analysis">Resume Version</label>
                            <select
                                id="resume_analysis"
                                name="resume_analysis"
                                value={formData.resume_analysis || ''}
                                onChange={handleInputChange}
                            >
                                <option value="">Select a resume version...</option>
                                {/* In a real app, populate this from user's resume history */}
                                <option value="1">Resume V1 (ATS Score: 85)</option>
                                <option value="2">Resume V2 (ATS Score: 90)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="company_name">Company Name</label>
                            <input
                                type="text"
                                id="company_name"
                                name="company_name"
                                value={formData.company_name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="job_title">Job Title</label>
                            <input
                                type="text"
                                id="job_title"
                                name="job_title"
                                value={formData.job_title}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="status">Outcome Status</label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                            >
                                <option value="applied">Applied</option>
                                <option value="screening">Screening</option>
                                <option value="interviewed">Interviewed</option>
                                <option value="offered">Offered</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="notes">Notes (Optional)</label>
                            <textarea
                                id="notes"
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                rows={3}
                            />
                        </div>

                        <button type="submit" className="submit-btn glass-button" disabled={loading}>
                            {loading ? 'Logging...' : 'Log Application'}
                        </button>

                        {error && <p className="error-message">{error}</p>}
                        {successMsg && <p className="success-message">{successMsg}</p>}
                    </form>
                </div>

                <div className="stats-panel glass-card">
                    <h3>Performance Analytics</h3>

                    {stats && stats.total_applications === 0 ? (
                        <div className="empty-stats">
                            <p>No applications logged yet. Start tracking your resume performance!</p>
                        </div>
                    ) : (
                        stats && (
                            <>
                                <div className="total-metric">
                                    <span className="metric-value">{stats.total_applications}</span>
                                    <span className="metric-label">Total Applications Tracked</span>
                                </div>

                                {stats.best_performing_resume_id && (
                                    <div className="best-performer-badge">
                                        🏆 Best Performing: Resume ID {stats.best_performing_resume_id}
                                    </div>
                                )}

                                <div className="stats-table-container">
                                    <table className="stats-table">
                                        <thead>
                                            <tr>
                                                <th>Resume Version</th>
                                                <th>Total Apps</th>
                                                <th>Successful</th>
                                                <th>Success Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.resume_stats.map((stat, index) => (
                                                <tr key={index} className={stat.resume_id === stats.best_performing_resume_id ? 'best-row' : ''}>
                                                    <td>{stat.resume_name}</td>
                                                    <td>{stat.total_applications}</td>
                                                    <td>{stat.successful_applications}</td>
                                                    <td>
                                                        <div className="progress-bar-bg">
                                                            <div
                                                                className="progress-bar-fill"
                                                                style={{ width: `${stat.success_rate}%` }}
                                                            ></div>
                                                            <span className="progress-text">{stat.success_rate}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResumeABTesting;
