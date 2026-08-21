/**
 * Legal Consent & Compliance Tracking Engine
 * Terms versioning, audit logging payload generators, and consent state reducers.
 */

export interface LegalConsentState {
    termsVersion: string;
    privacyVersion: string;
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
    consentTimestamp?: string;
    ipAddress?: string;
}

export interface LegalSummarySection {
    id: string;
    title: string;
    summary: string;
    fullDetail: string;
}

export const LEGAL_TERMS_VERSION = "v2.4-2026";
export const LEGAL_PRIVACY_VERSION = "v1.9-2026";

export const LEGAL_SUMMARY_SECTIONS: LegalSummarySection[] = [
    {
        id: "data_usage",
        title: "1. Resume Data Processing & AI Scoring",
        summary: "Your uploaded resumes are parsed by our AI models solely to extract ATS keywords, formatting metrics, and skill suggestions.",
        fullDetail: "AI Resume Analyzer does not sell or distribute candidate resume data to third-party recruitment agencies without explicit candidate opt-in."
    },
    {
        id: "privacy_security",
        title: "2. Data Retention & Encryption",
        summary: "All uploaded documents are encrypted using AES-256 at rest and TLS 1.3 in transit.",
        fullDetail: "Candidates retain full ownership of their data and can request complete account and document deletion at any time via settings."
    },
    {
        id: "account_terms",
        title: "3. Account Conduct & Subscription Terms",
        summary: "Free tier accounts receive 3 monthly AI scans. Subscription upgrades are billed transparently.",
        fullDetail: "Automated scraping, reverse engineering of ATS scoring algorithms, or malicious payload uploads will result in immediate account termination."
    }
];

export const createConsentAuditRecord = (
    userId: string,
    state: LegalConsentState
): object => {
    return {
        userId,
        termsVersion: state.termsVersion,
        privacyVersion: state.privacyVersion,
        acceptedTerms: state.acceptedTerms,
        acceptedPrivacy: state.acceptedPrivacy,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
    };
};
