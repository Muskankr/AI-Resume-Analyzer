// components/LoginForm.tsx

import React, { useState } from 'react';
import { checkLoginRateLimit, recordFailedLogin, resetLoginAttempts } from '../middleware/loginRateLimiter';

export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isLocked, setIsLocked] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Check rate limit before processing credentials
        const limitCheck = checkLoginRateLimit(email);
        if (!limitCheck.allowed) {
            setIsLocked(true);
            setFeedback(limitCheck.message || 'Account locked.');
            return;
        }

        // Simulate authentication check
        const isAuthenticated = email === 'user@example.com' && password === 'SecurePass123!';

        if (isAuthenticated) {
            resetLoginAttempts(email);
            setFeedback('Login successful! Redirecting...');
            setIsLocked(false);
        } else {
            // Record failure and get updated status
            const failureResult = recordFailedLogin(email);
            setFeedback(failureResult.message || 'Invalid credentials.');
            if (!failureResult.allowed) {
                setIsLocked(true);
            }
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-md border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Sign In to AI Resume Analyzer</h2>
            
            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLocked}
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                        placeholder="name@example.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLocked}
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                        placeholder="••••••••"
                    />
                </div>

                {feedback && (
                    <div className={`p-3 rounded-lg text-sm ${isLocked ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-800'}`}>
                        {feedback}
                        {isLocked && (
                            <div className="mt-2 text-xs font-semibold underline cursor-pointer hover:text-red-900">
                                Forgot password or need immediate unlock? Click here to reset via email.
                            </div>
                        )}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLocked}
                    className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 transition-colors">
                    {isLocked ? 'Account Locked' : 'Sign In'}
                </button>
            </form>
        </div>
    );
}
