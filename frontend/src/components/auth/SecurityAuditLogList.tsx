import React from 'react';
import { ShieldCheck, History, AlertTriangle } from 'lucide-react';
import { SecurityAuditLogEntry } from '../../services/sessionEngine';

interface SecurityAuditLogListProps {
    logs: SecurityAuditLogEntry[];
}

export const SecurityAuditLogList: React.FC<SecurityAuditLogListProps> = ({ logs }) => {
    return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                <History className="w-4 h-4 text-indigo-400" />
                Device Security & Session Revocation Audit Log
            </h3>

            {logs.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No security revocation events logged for this account.</p>
            ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {logs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-rose-400" />
                                <span className="text-slate-300 font-medium">{log.description}</span>
                            </div>

                            <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
                                <span>{log.ipAddress}</span>
                                <span>{log.timestamp}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
