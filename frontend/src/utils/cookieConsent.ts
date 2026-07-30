export type CookieConsentChoice = 'accepted' | 'declined'

export const COOKIE_CONSENT_STORAGE_KEY = 'cookie_consent_choice'

export function getCookieConsentChoice(): CookieConsentChoice | null {
  try {
    const saved = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
    return saved === 'accepted' || saved === 'declined' ? saved : null
  } catch {
    return null
  }
}

export function saveCookieConsentChoice(choice: CookieConsentChoice) {
  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, choice)
  } catch {
    // Consent still applies for the current session if storage is unavailable.
  }
}

export function hasAnalyticsConsent() {
  return getCookieConsentChoice() === 'accepted'
}

export function initializeTrackingIfConsented() {
  if (!hasAnalyticsConsent()) return

  // Add analytics initialization here when a provider is introduced.
}
