import React from 'react';
import { Lock, ShieldAlert, Clock } from 'lucide-react';
import { LockoutState } from '../../services/loginAuthEngine';

interface AccountLockoutBannerProps {
    lockoutState: LockoutState;
}

export const AccountLockoutBanner: React.FC<AccountLockoutBannerProps> = ({ lockoutState }) => {
    if (!lockoutState.isLocked) return null;

    return (
        <div className="bg-rose-950/80 border border-rose-500/50 rounded-2xl p-4 space-y-2 text-xs text-rose-200 shadow-lg shadow-rose-500/10 animate-fade-in">
            <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-rose-300">
                    <ShieldAlert className="w-4 h-4 text-rose-400" /> Account Security Lockout
                </span>
                <span className="font-mono font-bold bg-rose-900/60 border border-rose-500/30 px-2 py-0.5 rounded-lg text-rose-200 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {lockoutState.lockoutTimeRemainingSeconds}s
                </span>
            </div>
            <p className="opacity-90 leading-relaxed">
                Too many consecutive failed login attempts ({lockoutState.failedAttempts}/{lockoutState.failedAttempts}). Sign-in is temporarily disabled to protect your account.
            </p>
        </div>
    );
};
