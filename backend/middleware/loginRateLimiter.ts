// middleware/loginRateLimiter.ts

interface AttemptRecord {
    failures: number;
    lockoutUntil: number | null;
}

// In-memory store (or Redis/Database mapping in production)
const loginAttempts = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface RateLimitResult {
    allowed: boolean;
    remainingAttempts: number;
    message?: string;
    lockoutExpiresAt?: number;
}

/**
 * Checks if a login identifier (email/username + IP) is currently rate-limited.
 */
export function checkLoginRateLimit(identifier: string): RateLimitResult {
    const record = loginAttempts.get(identifier);
    const now = Date.now();

    if (record && record.lockoutUntil) {
        if (now < record.lockoutUntil) {
            const remainingMinutes = Math.ceil((record.lockoutUntil - now) / 60000);
            return {
                allowed: false,
                remainingAttempts: 0,
                message: `Account temporarily locked due to repeated failed login attempts. Please try again in ${remainingMinutes} minute(s) or use password recovery.`,
                lockoutExpiresAt: record.lockoutUntil
            };
        } else {
            // Lockout expired, reset record
            loginAttempts.delete(identifier);
        }
    }

    const currentFailures = record ? record.failures : 0;
    const remainingAttempts = Math.max(0, MAX_ATTEMPTS - currentFailures);

    return {
        allowed: true,
        remainingAttempts
    };
}

/**
 * Records a failed login attempt, triggering a lockout if threshold is reached.
 */
export function recordFailedLogin(identifier: string): RateLimitResult {
    const now = Date.now();
    let record = loginAttempts.get(identifier);

    if (!record) {
        record = { failures: 0, lockoutUntil: null };
    }

    record.failures += 1;

    if (record.failures >= MAX_ATTEMPTS) {
        record.lockoutUntil = now + LOCKOUT_DURATION_MS;
        loginAttempts.set(identifier, record);
        return {
            allowed: false,
            remainingAttempts: 0,
            message: `Too many failed login attempts. Your account has been locked for 15 minutes for security.`,
            lockoutExpiresAt: record.lockoutUntil
        };
    }

    loginAttempts.set(identifier, record);
    return {
        allowed: true,
        remainingAttempts: MAX_ATTEMPTS - record.failures,
        message: `Invalid credentials. ${MAX_ATTEMPTS - record.failures} attempt(s) remaining before temporary lockout.`
    };
}

/**
 * Resets failed login counters upon successful authentication.
 */
export function resetLoginAttempts(identifier: string): void {
    loginAttempts.delete(identifier);
}
