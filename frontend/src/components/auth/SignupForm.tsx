import React, { useState } from 'react';
import { 
    User, 
    Mail, 
    Lock, 
    Eye, 
    EyeOff, 
    UserPlus, 
    Briefcase, 
    CheckCircle2, 
    ShieldCheck 
} from 'lucide-react';
import { 
    SignupFormData, 
    SignupFormErrors, 
    evaluatePasswordStrength, 
    validateSignupForm 
} from '../../services/signupAuthEngine';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { SocialOAuthButtons } from './SocialOAuthButtons';

interface SignupFormProps {
    onSignupSuccess?: (data: SignupFormData) => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSignupSuccess }) => {
    const [formData, setFormData] = useState<SignupFormData>({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'job_seeker',
        acceptedTerms: false
    });
    const [errors, setErrors] = useState<SignupFormErrors>({});
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const passwordStrength = evaluatePasswordStrength(formData.password);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validation = validateSignupForm(formData);
        setErrors(validation.errors);

        if (!validation.isValid) return;

        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            alert("Account Successfully Created! Verification email sent.");
            if (onSignupSuccess) onSignupSuccess(formData);
        }, 1200);
    };

    return (
        <div className="w-full max-w-lg mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-0 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center space-y-1">
                <h2 className="text-2xl font-black text-slate-100">Create Free Candidate Account</h2>
                <p className="text-xs text-slate-400">Join 1.4M+ job seekers optimizing resumes for ATS compliance.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name Field */}
                <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Full Name</label>
                    <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            placeholder="Sarah Jenkins"
                            className={`w-full bg-slate-950 border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors ${
                                errors.fullName ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                            }`}
                        />
                    </div>
                    {errors.fullName && <p className="text-[11px] text-rose-400 font-semibold mt-1">{errors.fullName}</p>}
                </div>

                {/* Email Address Field */}
                <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Email Address</label>
                    <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="sarah@domain.com"
                            className={`w-full bg-slate-950 border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors ${
                                errors.email ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                            }`}
                        />
                    </div>
                    {errors.email && <p className="text-[11px] text-rose-400 font-semibold mt-1">{errors.email}</p>}
                </div>

                {/* Password Field & Live Strength Meter */}
                <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Account Password</label>
                    <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Create strong password..."
                            className={`w-full bg-slate-950 border rounded-2xl pl-10 pr-10 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors ${
                                errors.password ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
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
                    {formData.password && <PasswordStrengthMeter strength={passwordStrength} />}
                    {errors.password && <p className="text-[11px] text-rose-400 font-semibold mt-1">{errors.password}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Confirm Password</label>
                    <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            placeholder="Re-type password..."
                            className={`w-full bg-slate-950 border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors ${
                                errors.confirmPassword ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                            }`}
                        />
                    </div>
                    {errors.confirmPassword && <p className="text-[11px] text-rose-400 font-semibold mt-1">{errors.confirmPassword}</p>}
                </div>

                {/* Terms Consent Checkbox */}
                <div>
                    <label className="flex items-start gap-2 cursor-pointer pt-1">
                        <input
                            type="checkbox"
                            checked={formData.acceptedTerms}
                            onChange={(e) => setFormData({ ...formData, acceptedTerms: e.target.checked })}
                            className="accent-indigo-600 rounded mt-0.5"
                        />
                        <span className="text-[11px] text-slate-400 leading-snug">
                            I agree to the <a href="#terms" className="text-indigo-400 underline font-semibold">Terms of Service</a> and <a href="#privacy" className="text-indigo-400 underline font-semibold">Privacy Policy</a>.
                        </span>
                    </label>
                    {errors.acceptedTerms && <p className="text-[11px] text-rose-400 font-semibold mt-1">{errors.acceptedTerms}</p>}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                >
                    <UserPlus className="w-4 h-4" />
                    {isSubmitting ? "Creating Account..." : "Create Account & Start Scanning"}
                </button>
            </form>

            <SocialOAuthButtons
                onGoogleClick={() => alert("Signing up with Google OAuth SSO...")}
                onGitHubClick={() => alert("Signing up with GitHub OAuth SSO...")}
            />
        </div>
    );
};
