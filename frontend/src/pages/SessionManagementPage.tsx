import React from 'react';
import { ActiveSessionManager } from '../components/auth/ActiveSessionManager';

export const SessionManagementPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
            <ActiveSessionManager />
        </div>
    );
};

export default SessionManagementPage;
