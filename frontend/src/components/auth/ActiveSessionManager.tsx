import React, { useState } from 'react';
import { 
    Shield, 
    Smartphone, 
    Laptop, 
    LogOut, 
    RefreshCw, 
    CheckCircle2, 
    AlertTriangle,
    Sliders
} from 'lucide-react';
import { 
    MOCK_USER_SESSIONS, 
    SessionState, 
    revokeSessionById, 
    revokeAllOtherSessions 
} from '../services/sessionEngine';
import { SessionCard } from '../components/auth/SessionCard';
import { SecurityAuditLogList } from '../components/auth/SecurityAuditLogList';

export const ActiveSessionManager: React.FC = () => {
    const [state, setState] = useState<SessionState>({
        sessions: MOCK_USER_SESSIONS,
        auditLogs: []
    });

    const handleRevokeOne = (sessionId: string) => {
        const newState = revokeSessionById(state, sessionId);
        setState(newState);
    };

    const handleRevokeAll = () => {
        if (window.confirm("Are you sure you want to log out all other active device sessions globally?")) {
            const newState = revokeAllOtherSessions(state);
            setState(newState);
        }
    };

    const activeCount = state.sessions.length;

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl">
                <div>
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                        <Shield className="w-4 h-4" />
                        Account Security & Token Revocation
                    </div>
                    <h1 className="text-2xl font-black text-slate-100 mt-1">Active Sessions & Device Manager</h1>
                    <p className="text-xs text-slate-400">Monitor active browser sessions, IP geolocations, and revoke unrecognised devices.</p>
                </div>

                <div className="flex items-center gap-3">
                    <span className="px-3.5 py-1.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold">
                        {activeCount} Active Device{activeCount > 1 ? 's' : ''}
                    </span>
                    {activeCount > 1 && (
                        <button
                            onClick={handleRevokeAll}
                            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-500/20 transition-all"
                        >
                            <LogOut className="w-3.5 h-3.5" /> Revoke All Other Sessions
                        </button>
                    )}
                </div>
            </div>

            {/* Session Cards List */}
            <div className="space-y-4">
                {state.sessions.map((sess) => (
                    <SessionCard
                        key={sess.sessionId}
                        session={sess}
                        onRevoke={handleRevokeOne}
                    />
                ))}
            </div>

            {/* Security Audit Log */}
            <SecurityAuditLogList logs={state.auditLogs} />
        </div>
    );
};
