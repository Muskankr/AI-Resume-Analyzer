import { useEffect, useState } from 'react'
import {
  getCookieConsentChoice,
  initializeTrackingIfConsented,
  saveCookieConsentChoice,
  type CookieConsentChoice,
} from '../utils/cookieConsent'

export default function CookieConsentBanner() {
  const [choice, setChoice] = useState<CookieConsentChoice | null>(() => getCookieConsentChoice())

  useEffect(() => {
    initializeTrackingIfConsented()
  }, [choice])

  const handleChoice = (nextChoice: CookieConsentChoice) => {
    saveCookieConsentChoice(nextChoice)
    setChoice(nextChoice)
  }

  if (choice) return null

  return (
    <section className="cookie-consent-banner" aria-label="Cookie consent notice">
      <div className="cookie-consent-banner__copy">
        <h2>Cookie preferences</h2>
        <p>
          We only use essential storage by default. Accept analytics cookies to help improve the
          app, or decline to keep optional tracking off.
        </p>
      </div>

      <div className="cookie-consent-banner__actions">
        <button
          type="button"
          className="app-btn app-btn--secondary cookie-consent-banner__button"
          onClick={() => handleChoice('declined')}
        >
          Decline
        </button>
        <button
          type="button"
          className="app-btn app-btn--accent cookie-consent-banner__button"
          onClick={() => handleChoice('accepted')}
        >
          Accept
        </button>
      </div>
    </section>
  )
}
