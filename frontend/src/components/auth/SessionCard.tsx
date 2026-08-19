import React from 'react';
import { 
    Laptop, 
    Smartphone, 
    Tablet, 
    ShieldCheck, 
    ShieldAlert, 
    Globe, 
    Clock, 
    LogOut, 
    CheckCircle2 
} from 'lucide-react';
import { ActiveUserSession } from '../services/sessionEngine';

interface SessionCardProps {
    session: ActiveUserSession;
    onRevoke: (sessionId: string) => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, onRevoke }) => {
    const DeviceIcon = {
        desktop: Laptop,
        mobile: Smartphone,
        tablet: Tablet
    }[session.deviceType] || Laptop;

    return (
        <div className={`relative bg-slate-900/90 border rounded-3xl p-5 shadow-xl transition-all duration-200 hover:border-slate-700 ${
            session.isCurrentSession 
                ? 'border-emerald-500/40 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/20' 
                : 'border-slate-800'
        }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Device Icon & Details */}
                <div className="flex items-start gap-4">
                    <div className={`p-3.5 rounded-2xl border ${
                        session.isCurrentSession 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                            : 'bg-slate-950 border-slate-800 text-indigo-400'
                    }`}>
                        <DeviceIcon className="w-6 h-6" />
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-100">{session.deviceName}</h3>
                            {session.isCurrentSession && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                    Current Session
                                </span>
                            )}
                            {session.isTrustedDevice && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" /> Trusted Device
                                </span>
                            )}
                        </div>

                        <p className="text-xs text-slate-400 mt-1">
                            {session.browser} • {session.os}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                            <span className="flex items-center gap-1">
                                <Globe className="w-3.5 h-3.5 text-slate-400" /> {session.location} ({session.ipAddress})
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" /> Active: {session.lastActiveAt}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Revoke Session Action */}
                {!session.isCurrentSession && (
                    <button
                        onClick={() => onRevoke(session.sessionId)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-300 text-xs font-bold transition-all shadow-sm self-end sm:self-center"
                    >
                        <LogOut className="w-3.5 h-3.5" /> Revoke Token Access
                    </button>
                )}
            </div>
        </div>
    );
};
