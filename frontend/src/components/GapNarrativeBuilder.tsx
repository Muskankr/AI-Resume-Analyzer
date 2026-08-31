import React, { useState } from 'react';
import axios from 'axios';
import './GapNarrativeBuilder.css';

interface TimelineEntry {
    role: string;
    start_date: string;
    end_date: string;
}

interface NarrativeOption {
    category: string;
    text: string;
}

interface GapDetail {
    role_before: string;
    role_after: string;
    start_date: string;
    end_date: string;
    duration_months: number;
    narratives: NarrativeOption[];
}

interface GapResponse {
    total_gaps_detected: number;
    gaps: GapDetail[];
}

const GapNarrativeBuilder: React.FC = () => {
    const [timeline, setTimeline] = useState<TimelineEntry[]>([
        { role: '', start_date: '', end_date: '' }
    ]);
    const [context, setContext] = useState({ skills: '', target_role: '', activities: '' });
    const [results, setResults] = useState<GapResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleTimelineChange = (index: number, field: keyof TimelineEntry, value: string) => {
        const newTimeline = [...timeline];
        newTimeline[index][field] = value;
        setTimeline(newTimeline);
    };

    const addTimelineEntry = () => {
        setTimeline([...timeline, { role: '', start_date: '', end_date: '' }]);
    };

    const handleAnalyze = async () => {
        const validTimeline = timeline.filter(t => t.role && t.start_date);
        if (validTimeline.length < 2) {
            setError('Please provide at least two timeline entries to detect gaps.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.post('/api/generate-gap-narrative/', {
                timeline_data: validTimeline,
                context: context
            });
            setResults(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to generate narratives.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="gap-narrative-container">
            <h2 className="narrative-title">Resume Gap Narrative Builder</h2>

            <div className="narrative-workspace">
                <div className="input-panel glass-card">
                    <h3>1. Employment Timeline</h3>
                    {timeline.map((entry, index) => (
                        <div key={index} className="timeline-entry">
                            <input
                                type="text"
                                placeholder="Job Title / Role"
                                value={entry.role}
                                onChange={(e) => handleTimelineChange(index, 'role', e.target.value)}
                            />
                            <div className="date-inputs">
                                <input
                                    type="text"
                                    placeholder="Start (e.g., Jan 2020)"
                                    value={entry.start_date}
                                    onChange={(e) => handleTimelineChange(index, 'start_date', e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="End (e.g., Dec 2021 or Present)"
                                    value={entry.end_date}
                                    onChange={(e) => handleTimelineChange(index, 'end_date', e.target.value)}
                                />
                            </div>
                        </div>
                    ))}
                    <button className="add-entry-btn" onClick={addTimelineEntry}>+ Add Another Role</button>

                    <h3 className="mt-4">2. Gap Context (Optional)</h3>
                    <div className="context-inputs">
                        <input
                            type="text"
                            placeholder="Key skills acquired during gap (e.g., Python, AWS)"
                            value={context.skills}
                            onChange={(e) => setContext({ ...context, skills: e.target.value })}
                        />
                        <input
                            type="text"
                            placeholder="Target Role (e.g., Software Engineer)"
                            value={context.target_role}
                            onChange={(e) => setContext({ ...context, target_role: e.target.value })}
                        />
                        <input
                            type="text"
                            placeholder="Activities during gap (e.g., freelance projects, caregiving)"
                            value={context.activities}
                            onChange={(e) => setContext({ ...context, activities: e.target.value })}
                        />
                    </div>

                    <button
                        className="analyze-btn glass-button"
                        onClick={handleAnalyze}
                        disabled={loading}
                    >
                        {loading ? 'Analyzing Timeline...' : 'Generate Narratives'}
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </div>

                <div className="results-panel glass-card">
                    <h3>Detected Gaps & Narratives</h3>

                    {!results && !loading && (
                        <div className="empty-state">
                            <p>Add your timeline and click "Generate Narratives" to see professional explanations for any employment gaps.</p>
                        </div>
                    )}

                    {loading && <div className="loading-state">Analyzing timeline and generating narratives...</div>}

                    {results && !loading && (
                        <div className="results-content">
                            {results.total_gaps_detected === 0 ? (
                                <div className="no-gaps">
                                    ✅ No significant employment gaps detected in your timeline!
                                </div>
                            ) : (
                                results.gaps.map((gap, index) => (
                                    <div key={index} className="gap-card">
                                        <div className="gap-header">
                                            <h4>Gap: {gap.start_date} – {gap.end_date} ({gap.duration_months} months)</h4>
                                            <span className="gap-roles">{gap.role_before} → {gap.role_after}</span>
                                        </div>

                                        <div className="narratives-list">
                                            {gap.narratives.map((narrative, nIdx) => (
                                                <div key={nIdx} className="narrative-item">
                                                    <div className="narrative-category">{narrative.category}</div>
                                                    <p className="narrative-text">{narrative.text}</p>
                                                    <button
                                                        className="copy-narrative-btn"
                                                        onClick={() => copyToClipboard(narrative.text)}
                                                    >
                                                        Copy to Clipboard
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GapNarrativeBuilder;
