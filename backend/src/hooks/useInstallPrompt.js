import { useState, useEffect } from 'react';

const DISMISS_KEY = 'pwa_install_dismissed_until';
const COOLDOWN_DAYS = 7;

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if previously dismissed within cooldown period
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Delay prompt slightly to meet "not on first load / after engagement" criteria
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 5000);

      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Set cooldown expiration timestamp
    const futureTime = Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, futureTime.toString());
  };

  return { showBanner, handleInstallClick, handleDismiss };
}
