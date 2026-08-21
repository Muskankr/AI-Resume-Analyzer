import React from 'react';
import { RegistrationLegalConsentBox } from '../components/legal/RegistrationLegalConsentBox';

export const LegalConsentPageView: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
            <RegistrationLegalConsentBox />
        </div>
    );
};

export default LegalConsentPageView;
