import React from 'react';
import { AccessibleCaptcha } from '../components/auth/AccessibleCaptcha';

export const CaptchaVerificationPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
            <AccessibleCaptcha
                onVerifySuccess={() => alert("CAPTCHA Verification Successful!")}
                onVerifyFailure={() => alert("CAPTCHA Failed.")}
            />
        </div>
    );
};

export default CaptchaVerificationPage;
