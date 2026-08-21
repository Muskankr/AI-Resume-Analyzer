import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import {
    LEGAL_SUMMARY_SECTIONS,
    LEGAL_TERMS_VERSION,
    LEGAL_PRIVACY_VERSION
} from '../../services/legalConsentEngine';

interface LegalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAcceptAll: () => void;
}

export const TermsPrivacyModal: React.FC<LegalModalProps> = ({
    isOpen,
    onClose,
    onAcceptAll
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                        <ShieldCheck className="w-5 h-5" />
                        Terms of Service & Privacy Agreement
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close terms and privacy agreement"
                        className="p-2 text-slate-400 hover:text-slate-200 rounded-xl bg-slate-950 border border-slate-800"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="overflow-y-auto space-y-4 pr-2 flex-1 text-xs text-slate-300">

                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                        <p className="font-bold text-slate-100">
                            Effective Date: August 2026
                        </p>

                        <p className="text-slate-400">
                            Terms Version:{' '}
                            <span className="font-mono text-indigo-400">
                                {LEGAL_TERMS_VERSION}
                            </span>
                            {' | '}
                            Privacy Policy:{' '}
                            <span className="font-mono text-teal-400">
                                {LEGAL_PRIVACY_VERSION}
                            </span>
                        </p>
                    </div>

                    {LEGAL_SUMMARY_SECTIONS.map((sec) => (
                        <div
                            key={sec.id}
                            className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2"
                        >
                            <h4 className="font-bold text-sm text-slate-100">
                                {sec.title}
                            </h4>

                            <p className="text-slate-300 font-medium">
                                {sec.summary}
                            </p>

                            <p className="text-slate-400 leading-relaxed text-[11px]">
                                {sec.fullDetail}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Actions Footer */}
                <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">

                    <span className="text-[11px] text-slate-500">
                        By accepting, an immutable audit log timestamp will be generated.
                    </span>

                    <div className="flex items-center gap-2 w-full sm:w-auto">

                        <button
                            type="button"
                            onClick={onClose}
                            className="w-1/2 sm:w-auto px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold"
                        >
                            Decline
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                onAcceptAll();
                                onClose();
                            }}
                            className="w-1/2 sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20"
                        >
                            Accept & Agree
                        </button>

                    </div>
                </div>
            </div>
        </div>
    );
};
