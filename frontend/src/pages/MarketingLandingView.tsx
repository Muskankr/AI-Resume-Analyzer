import React from 'react';
import { MarketingHomePage } from '../components/marketing/MarketingHomePage';

export const MarketingLandingView: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
            <MarketingHomePage />
        </div>
    );
};

export default MarketingLandingView;
