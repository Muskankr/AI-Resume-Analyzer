/**
 * Signup Registration & Password Complexity Engine
 * Data models, password entropy calculator, and form validation reducers.
 */

export interface SignupFormData {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: 'job_seeker' | 'recruiter' | 'career_coach';
    acceptedTerms: boolean;
}

export interface SignupFormErrors {
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    acceptedTerms?: string;
}

export interface PasswordStrengthResult {
    score: number; // 0 to 4
    label: 'Very Weak' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
    color: string;
    hasMinLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
}

export const evaluatePasswordStrength = (password: string): PasswordStrengthResult => {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

    let score = 0;
    if (hasMinLength) score++;
    if (hasUppercase && hasLowercase) score++;
    if (hasNumber) score++;
    if (hasSpecialChar) score++;

    const labels: PasswordStrengthResult['label'][] = ['Very Weak', 'Weak', 'Medium', 'Strong', 'Very Strong'];
    const colors = ['#f43f5e', '#fb923c', '#facc15', '#34d399', '#10b981'];

    return {
        score,
        label: labels[score] || 'Very Weak',
        color: colors[score] || '#f43f5e',
        hasMinLength,
        hasUppercase,
        hasLowercase,
        hasNumber,
        hasSpecialChar
    };
};

export const validateSignupForm = (data: SignupFormData): { isValid: boolean; errors: SignupFormErrors } => {
    const errors: SignupFormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!data.fullName.trim()) {
        errors.fullName = "Full name is required.";
    }

    if (!data.email.trim()) {
        errors.email = "Email address is required.";
    } else if (!emailRegex.test(data.email.trim())) {
        errors.email = "Please enter a valid email address.";
    }

    if (!data.password) {
        errors.password = "Password is required.";
    } else if (data.password.length < 8) {
        errors.password = "Password must be at least 8 characters long.";
    }

    if (data.password !== data.confirmPassword) {
        errors.confirmPassword = "Passwords do not match.";
    }

    if (!data.acceptedTerms) {
        errors.acceptedTerms = "You must accept the Terms of Service and Privacy Policy.";
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};
