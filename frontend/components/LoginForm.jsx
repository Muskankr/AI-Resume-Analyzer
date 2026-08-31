// src/components/LoginForm.jsx

import React, { useState } from 'react';

export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorData, setErrorData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorData(null);
        setActionMessage('');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setErrorData(data);
                return;
            }

            // Redirect on success
            window.location.href = '/dashboard';
        } catch (err) {
            setErrorData({ error_code: 'NETWORK_ERROR', message: 'Unable to connect to the server. Please check your connection.' });
        } finally {
            setLoading(false);
        }
    };

    const handleActionClick = async (actionType) => {
        if (actionType === 'RESEND_VERIFICATION') {
            try {
                await fetch('/api/auth/resend-verification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                setActionMessage('Verification email resent successfully! Please check your inbox.');
            } catch (err) {
                setActionMessage('Failed to resend verification email. Please try again later.');
            }
        }
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Sign In to AI Resume Analyzer</h2>

            {errorData && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-800">{errorData.message}</p>
                    
                    {errorData.action === 'RESEND_VERIFICATION' && (
                        <button 
                            type="button"
                            onClick={() => handleActionClick('RESEND_VERIFICATION')}
                            className="mt-2 text-xs font-bold text-blue-600 hover:underline block"
                        >
                            Resend Verification Email
                        </button>
                    )}

                    {errorData.action === 'CONTACT_SUPPORT' && (
                        <a 
                            href="/support"
                            className="mt-2 text-xs font-bold text-blue-600 hover:underline block"
                        >
                            Contact Support Team
                        </a>
                    )}
                </div>
            )}

            {actionMessage && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg">
                    {actionMessage}
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                        required 
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                        required 
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>
            </form>
        </div>
    );
}
