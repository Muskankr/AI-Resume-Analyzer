import { useEffect, useState } from 'react'
import {
  getCookieConsentChoice,
  initializeTrackingIfConsented,
  saveCookieConsentChoice,
  saveConsentPreferences,
  type CookieConsentChoice,
} from '../utils/cookieConsent'
import { Button } from './Button'

export default function CookieConsentBanner() {
  const [choice, setChoice] = useState<CookieConsentChoice | null>(() => getCookieConsentChoice())
  const [showDetails, setShowDetails] = useState<boolean>(false)
  const [analyticsOptIn, setAnalyticsOptIn] = useState<boolean>(false) // Off by default
  const [roastOptIn, setRoastOptIn] = useState<boolean>(false) // Off by default

  useEffect(() => {
    initializeTrackingIfConsented()
  }, [choice])

  const handleChoice = (nextChoice: CookieConsentChoice) => {
    saveCookieConsentChoice(nextChoice)
    setChoice(nextChoice)
  }

  const handleSaveCustom = () => {
    saveConsentPreferences({
      analytics: analyticsOptIn,
      resumeRoast: roastOptIn,
    })
    setChoice('customized')
  }

  if (choice) return null

  return (
    <section className="cookie-consent-banner" aria-label="Cookie consent notice">
      <div className="cookie-consent-banner__copy">
        <h2>Data Collection & Privacy Preferences</h2>
        <p>
          We use strictly essential local storage by default. Optional features such as usage
          analytics and alternate "Resume Roast" feedback require your explicit consent.
        </p>

        {showDetails && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#fff' }}>Essential Data</strong>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Authentication, resume parsing, and essential session states.
                </p>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4ade80' }}>
                Always Active
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: '8px',
              }}
            >
              <div>
                <label
                  htmlFor="consent-analytics-toggle"
                  style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', cursor: 'pointer' }}
                >
                  📊 Analytics & Performance Telemetry
                </label>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Anonymous interaction telemetry to improve parsing accuracy (Off by default).
                </p>
              </div>
              <input
                id="consent-analytics-toggle"
                type="checkbox"
                checked={analyticsOptIn}
                onChange={(e) => setAnalyticsOptIn(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: '8px',
              }}
            >
              <div>
                <label
                  htmlFor="consent-roast-toggle"
                  style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', cursor: 'pointer' }}
                >
                  🔥 AI Resume Roast Feedback Processing
                </label>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Enables humorously spicy feedback mode and alternate prompt analysis (Off by
                  default).
                </p>
              </div>
              <input
                id="consent-roast-toggle"
                type="checkbox"
                checked={roastOptIn}
                onChange={(e) => setRoastOptIn(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="cookie-consent-banner__actions">
        {!showDetails ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              className="cookie-consent-banner__button"
              onClick={() => setShowDetails(true)}
            >
              Customize
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="cookie-consent-banner__button"
              onClick={() => handleChoice('declined')}
            >
              Decline Optional
            </Button>
            <Button
              variant="accent"
              size="sm"
              className="cookie-consent-banner__button"
              onClick={() => handleChoice('accepted')}
            >
              Accept All
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              size="sm"
              className="cookie-consent-banner__button"
              onClick={() => handleChoice('declined')}
            >
              Decline All
            </Button>
            <Button
              variant="accent"
              size="sm"
              className="cookie-consent-banner__button"
              onClick={handleSaveCustom}
            >
              Save Preferences
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
