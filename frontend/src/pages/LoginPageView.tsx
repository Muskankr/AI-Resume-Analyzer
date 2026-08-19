import React from 'react';
import { LoginForm } from '../components/auth/LoginForm';

export const LoginPageView: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
            <LoginForm />
        </div>
    );
};

export default LoginPageView;
