import React from 'react';
import { SignupForm } from '../components/auth/SignupForm';

export const SignupPageView: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
            <SignupForm />
        </div>
    );
};

export default SignupPageView;
