/**
 * Active Session & Device Management Service Engine
 * Data models, mock session generator, IP geolocation lookup, and token revocation handlers.
 */

export interface ActiveUserSession {
    sessionId: string;
    userId: string;
    deviceName: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
    browser: string;
    os: string;
    ipAddress: string;
    location: string;
    lastActiveAt: string;
    createdAt: string;
    isCurrentSession: boolean;
    isTrustedDevice: boolean;
}

export interface SecurityAuditLogEntry {
    id: string;
    eventType: 'session_revoked' | 'all_sessions_revoked' | 'trusted_device_added' | 'new_login';
    description: string;
    ipAddress: string;
    timestamp: string;
}

// Initial Mock Active User Sessions
export const MOCK_USER_SESSIONS: ActiveUserSession[] = [
    {
        sessionId: "sess_curr_9901",
        userId: "usr_alex_77",
        deviceName: "MacBook Pro 16-inch",
        deviceType: "desktop",
        browser: "Chrome 128.0",
        os: "macOS Sonoma 14.5",
        ipAddress: "192.168.1.45 (103.21.124.89)",
        location: "San Francisco, CA, USA",
        lastActiveAt: "Just now",
        createdAt: "2026-08-19 06:15 AM",
        isCurrentSession: true,
        isTrustedDevice: true
    },
    {
        sessionId: "sess_mob_4412",
        userId: "usr_alex_77",
        deviceName: "iPhone 15 Pro",
        deviceType: "mobile",
        browser: "Safari iOS 17.5",
        os: "iOS 17.5.1",
        ipAddress: "172.56.21.90",
        location: "San Jose, CA, USA",
        lastActiveAt: "25 minutes ago",
        createdAt: "2026-08-18 09:30 PM",
        isCurrentSession: false,
        isTrustedDevice: true
    },
    {
        sessionId: "sess_tab_1109",
        userId: "usr_alex_77",
        deviceName: "iPad Air 5th Gen",
        deviceType: "tablet",
        browser: "Safari 17.4",
        os: "iPadOS 17.4",
        ipAddress: "198.51.100.14",
        location: "Seattle, WA, USA",
        lastActiveAt: "3 hours ago",
        createdAt: "2026-08-15 11:20 AM",
        isCurrentSession: false,
        isTrustedDevice: false
    },
    {
        sessionId: "sess_win_3389",
        userId: "usr_alex_77",
        deviceName: "Dell XPS 15 Workstation",
        deviceType: "desktop",
        browser: "Firefox 129.0",
        os: "Windows 11 Pro",
        ipAddress: "203.0.113.195",
        location: "Austin, TX, USA",
        lastActiveAt: "2 days ago",
        createdAt: "2026-08-10 02:45 PM",
        isCurrentSession: false,
        isTrustedDevice: false
    }
];

export interface SessionState {
    sessions: ActiveUserSession[];
    auditLogs: SecurityAuditLogEntry[];
}

export const revokeSessionById = (
    state: SessionState, 
    sessionId: string
): SessionState => {
    const target = state.sessions.find(s => s.sessionId === sessionId);
    if (!target || target.isCurrentSession) return state;

    const updatedSessions = state.sessions.filter(s => s.sessionId !== sessionId);
    const newLog: SecurityAuditLogEntry = {
        id: `log_${Date.now()}`,
        eventType: 'session_revoked',
        description: `Revoked session on ${target.deviceName} (${target.browser} - ${target.location})`,
        ipAddress: target.ipAddress,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    return {
        sessions: updatedSessions,
        auditLogs: [newLog, ...state.auditLogs]
    };
};

export const revokeAllOtherSessions = (state: SessionState): SessionState => {
    const currentSession = state.sessions.find(s => s.isCurrentSession);
    if (!currentSession) return state;

    const revokedCount = state.sessions.length - 1;
    const newLog: SecurityAuditLogEntry = {
        id: `log_${Date.now()}`,
        eventType: 'all_sessions_revoked',
        description: `Revoked ${revokedCount} active background device session(s) globally`,
        ipAddress: currentSession.ipAddress,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    return {
        sessions: [currentSession],
        auditLogs: [newLog, ...state.auditLogs]
    };
};
