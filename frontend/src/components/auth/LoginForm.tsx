import React, { useState, useEffect } from 'react';
import { 
    Mail, 
    Lock, 
    Eye, 
    EyeOff, 
    LogIn, 
    ShieldCheck, 
    AlertCircle, 
    CheckCircle2 
} from 'lucide-react';
import { 
    LoginFormData, 
    LoginFormErrors, 
    LockoutState, 
    validateLoginForm, 
    updateLockoutOnFailure 
} from '../../services/loginAuthEngine';
import { AccountLockoutBanner } from './AccountLockoutBanner';
import { SocialOAuthButtons } from './SocialOAuthButtons';

interface LoginFormProps {
    onLoginSuccess?: (data: LoginFormData) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
    const [formData, setFormData] = useState<LoginFormData>({
        email: '',
        password: '',
        rememberMe: true
    });
    const [errors, setErrors] = useState<LoginFormErrors>({});
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [lockoutState, setLockoutState] = useState<LockoutState>({
        failedAttempts: 0,
        isLocked: false,
        lockoutTimeRemainingSeconds: 0
    });

    // Countdown Timer for Account Lockout
    useEffect(() => {
        let timer: any;
        if (lockoutState.isLocked && lockoutState.lockoutTimeRemainingSeconds > 0) {
            timer = setInterval(() => {
                setLockoutState(prev => {
                    if (prev.lockoutTimeRemainingSeconds <= 1) {
                        return { failedAttempts: 0, isLocked: false, lockoutTimeRemainingSeconds: 0 };
                    }
                    return { ...prev, lockoutTimeRemainingSeconds: prev.lockoutTimeRemainingSeconds - 1 };
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [lockoutState.isLocked, lockoutState.lockoutTimeRemainingSeconds]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (lockoutState.isLocked) return;

        const validation = validateLoginForm(formData);
        setErrors(validation.errors);

        if (!validation.isValid) return;

        setIsSubmitting(true);

        // Simulate Auth API call verification
        setTimeout(() => {
            setIsSubmitting(false);
            if (formData.email === "alex@example.com" && formData.password === "Password123") {
                alert("Login Successful! Redirecting to Candidate Dashboard...");
                if (onLoginSuccess) onLoginSuccess(formData);
            } else {
                const updatedLockout = updateLockoutOnFailure(lockoutState);
                setLockoutState(updatedLockout);
                setErrors({ email: "Invalid credentials. Use demo: alex@example.com / Password123" });
            }
        }, 1000);
    };

    return (
        <div className="w-full max-w-md mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center space-y-1">
                <h2 className="text-2xl font-black text-slate-100">Welcome Back</h2>
                <p className="text-xs text-slate-400">Sign in to your AI Resume Analyzer candidate portal.</p>
            </div>

            {/* Lockout Banner Alert */}
            <AccountLockoutBanner lockoutState={lockoutState} />

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Email Address</label>
                    <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            disabled={lockoutState.isLocked || isSubmitting}
                            placeholder="alex@example.com"
                            className={`w-full bg-slate-950 border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors ${
                                errors.email ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                            }`}
                        />
                    </div>
                    {errors.email && <p className="text-[11px] text-rose-400 font-semibold mt-1">{errors.email}</p>}
                </div>

                {/* Password Field */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-400">Password</label>
                        <a href="#forgot" className="text-[11px] text-indigo-400 hover:underline font-semibold">Forgot?</a>
                    </div>
                    <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            disabled={lockoutState.isLocked || isSubmitting}
                            placeholder="••••••••"
                            className={`w-full bg-slate-950 border rounded-2xl pl-10 pr-10 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors ${
                                errors.password ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                            }`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {errors.password && <p className="text-[11px] text-rose-400 font-semibold mt-1">{errors.password}</p>}
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.rememberMe}
                            onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                            className="accent-indigo-600 rounded"
                        />
                        <span>Remember device session</span>
                    </label>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={lockoutState.isLocked || isSubmitting}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                >
                    <LogIn className="w-4 h-4" />
                    {isSubmitting ? "Authenticating..." : "Sign In to Account"}
                </button>
            </form>

            {/* Social OAuth Providers */}
            <SocialOAuthButtons
                onGoogleClick={() => alert("Connecting Google OAuth SSO...")}
                onGitHubClick={() => alert("Connecting GitHub OAuth SSO...")}
                disabled={lockoutState.isLocked}
            />
        </div>
    );
};
