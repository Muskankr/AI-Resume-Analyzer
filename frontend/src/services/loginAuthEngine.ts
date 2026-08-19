/**
 * Auth Login Validation & Rate Limiting Engine
 * Email/password format validation, account lockout guards, and authentication state reducers.
 */

export interface LoginFormData {
    email: string;
    password: string;
    rememberMe: boolean;
}

export interface LoginFormErrors {
    email?: string;
    password?: string;
}

export interface LockoutState {
    failedAttempts: number;
    isLocked: boolean;
    lockoutTimeRemainingSeconds: number;
}

export const validateLoginForm = (data: LoginFormData): { isValid: boolean; errors: LoginFormErrors } => {
    const errors: LoginFormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!data.email.trim()) {
        errors.email = "Email address is required.";
    } else if (!emailRegex.test(data.email.trim())) {
        errors.email = "Please enter a valid email address (e.g. user@domain.com).";
    }

    if (!data.password) {
        errors.password = "Password is required.";
    } else if (data.password.length < 8) {
        errors.password = "Password must be at least 8 characters long.";
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

export const MAX_ALLOWED_FAILED_ATTEMPTS = 3;
export const LOCKOUT_DURATION_SECONDS = 30;

export const updateLockoutOnFailure = (current: LockoutState): LockoutState => {
    const newAttempts = current.failedAttempts + 1;
    if (newAttempts >= MAX_ALLOWED_FAILED_ATTEMPTS) {
        return {
            failedAttempts: newAttempts,
            isLocked: true,
            lockoutTimeRemainingSeconds: LOCKOUT_DURATION_SECONDS
        };
    }
    return {
        ...current,
        failedAttempts: newAttempts
    };
};
