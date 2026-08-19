import React from 'react';
import { Check, X, Shield } from 'lucide-react';
import { PasswordStrengthResult } from '../../services/signupAuthEngine';

interface PasswordStrengthMeterProps {
    strength: PasswordStrengthResult;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ strength }) => {
    return (
        <div className="space-y-2 pt-1">
            {/* Visual Progress Bar */}
            <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="text-slate-400">Password Strength:</span>
                <span style={{ color: strength.color }} className="font-bold">{strength.label}</span>
            </div>

            <div className="flex gap-1 h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                {[0, 1, 2, 3].map((step) => (
                    <div
                        key={step}
                        className="h-full flex-1 transition-all duration-300 rounded-full"
                        style={{
                            backgroundColor: step <= strength.score - 1 ? strength.color : 'transparent'
                        }}
                    />
                ))}
            </div>

            {/* Checklist */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-400 pt-1">
                <div className="flex items-center gap-1">
                    {strength.hasMinLength ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-slate-600" />}
                    <span>At least 8 chars</span>
                </div>
                <div className="flex items-center gap-1">
                    {strength.hasUppercase && strength.hasLowercase ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-slate-600" />}
                    <span>Upper & lower case</span>
                </div>
                <div className="flex items-center gap-1">
                    {strength.hasNumber ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-slate-600" />}
                    <span>At least 1 number</span>
                </div>
                <div className="flex items-center gap-1">
                    {strength.hasSpecialChar ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-slate-600" />}
                    <span>Special character (!@#)</span>
                </div>
            </div>
        </div>
    );
};
