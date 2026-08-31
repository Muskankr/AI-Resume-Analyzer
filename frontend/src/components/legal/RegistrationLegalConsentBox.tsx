import React, { useState } from 'react'
import { ShieldCheck, FileText, CheckCircle2, ArrowRight } from 'lucide-react'
import type { LegalConsentState } from '../../services/legalConsentEngine'
import {
  LEGAL_TERMS_VERSION,
  LEGAL_PRIVACY_VERSION,
  createConsentAuditRecord,
} from '../../services/legalConsentEngine'
import { TermsPrivacyModal } from './TermsPrivacyModal'

export const RegistrationLegalConsentBox: React.FC = () => {
  const [consent, setConsent] = useState<LegalConsentState>({
    termsVersion: LEGAL_TERMS_VERSION,
    privacyVersion: LEGAL_PRIVACY_VERSION,
    acceptedTerms: false,
    acceptedPrivacy: false,
  })

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)

  const handleAcceptAll = () => {
    setConsent((prev) => ({
      ...prev,
      acceptedTerms: true,
      acceptedPrivacy: true,
      consentTimestamp: new Date().toISOString(),
    }))
  }

  const handleCompleteRegistration = () => {
    if (!consent.acceptedTerms || !consent.acceptedPrivacy) {
      alert('Please accept both the Terms of Service and Privacy Policy before continuing.')
      return
    }

    const auditLog = createConsentAuditRecord('usr_candidate_9921', consent)

    setIsSubmitted(true)
    console.log('Consent Audit Log Created:', auditLog)
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold mb-2">
          <ShieldCheck className="w-4 h-4" />
          GDPR & CCPA Compliance
        </div>

        <h2 className="text-2xl font-black text-slate-100">Legal Agreement & Consent</h2>

        <p className="text-xs text-slate-400">
          Please review and accept terms before creating your account.
        </p>
      </div>

      {isSubmitted ? (
        <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-6 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />

          <h3 className="text-base font-bold text-slate-100">Registration Consent Verified</h3>

          <p className="text-xs text-slate-400">
            Audit log record created at{' '}
            <span className="font-mono text-emerald-400">{consent.consentTimestamp}</span>
          </p>

          <button
            type="button"
            onClick={() => setIsSubmitted(false)}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300"
          >
            Reset Demo
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent.acceptedTerms}
                onChange={(e) =>
                  setConsent((prev) => ({
                    ...prev,
                    acceptedTerms: e.target.checked,
                  }))
                }
                className="accent-indigo-600 rounded mt-0.5"
              />

              <div className="text-slate-300">
                <span>I explicitly agree to the </span>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="text-indigo-400 underline font-semibold hover:text-indigo-300"
                >
                  Terms of Service ({LEGAL_TERMS_VERSION})
                </button>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer border-t border-slate-800/80 pt-3">
              <input
                type="checkbox"
                checked={consent.acceptedPrivacy}
                onChange={(e) =>
                  setConsent((prev) => ({
                    ...prev,
                    acceptedPrivacy: e.target.checked,
                  }))
                }
                className="accent-indigo-600 rounded mt-0.5"
              />

              <div className="text-slate-300">
                <span>I consent to data processing under the </span>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="text-teal-400 underline font-semibold hover:text-teal-300"
                >
                  Privacy Policy ({LEGAL_PRIVACY_VERSION})
                </button>
              </div>
            </label>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full py-2.5 rounded-2xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4 text-indigo-400" />
            Read Full Terms & Privacy Modal
          </button>

          <button
            type="button"
            onClick={handleCompleteRegistration}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
          >
            <span>Confirm Legal Consent & Register</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <TermsPrivacyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAcceptAll={handleAcceptAll}
      />
    </div>
  )
}
