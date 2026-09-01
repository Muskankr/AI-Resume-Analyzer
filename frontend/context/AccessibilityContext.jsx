/**
 * Accessibility Context
 * Provides accessibility settings across the application.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getFont, applyFont, getSavedFont, FONTS, DEFAULT_FONT, getDyslexiaFonts } from '../utils/fonts';

// Create context
const AccessibilityContext = createContext();

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider = ({ children }) => {
  // State
  const [fontKey, setFontKey] = useState(DEFAULT_FONT);
  const [isLoaded, setIsLoaded] = useState(false);
  const [availableFonts, setAvailableFonts] = useState(Object.values(FONTS));
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [largeText, setLargeText] = useState(false);

  // Initialize
  useEffect(() => {
    const savedFont = getSavedFont();
    setFontKey(savedFont);
    applyFont(savedFont);
    setIsLoaded(true);

    // Check system preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setReducedMotion(true);
      document.documentElement.classList.add('reduce-motion');
    }
  }, []);

  // Apply font
  const applyFontKey = useCallback((key) => {
    if (FONTS[key]) {
      setFontKey(key);
      applyFont(key);
    }
  }, []);

  // Toggle high contrast
  const toggleHighContrast = useCallback((enabled) => {
    setHighContrast(enabled);
    if (enabled) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, []);

  // Toggle reduced motion
  const toggleReducedMotion = useCallback((enabled) => {
    setReducedMotion(enabled);
    if (enabled) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, []);

  // Toggle large text
  const toggleLargeText = useCallback((enabled) => {
    setLargeText(enabled);
    if (enabled) {
      document.documentElement.classList.add('large-text');
    } else {
      document.documentElement.classList.remove('large-text');
    }
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    applyFontKey(DEFAULT_FONT);
    toggleHighContrast(false);
    toggleReducedMotion(false);
    toggleLargeText(false);
  }, [applyFontKey, toggleHighContrast, toggleReducedMotion, toggleLargeText]);

  // Get dyslexia-friendly fonts
  const dyslexiaFonts = useMemo(() => getDyslexiaFonts(), []);

  // Context value
  const value = {
    // State
    fontKey,
    isLoaded,
    availableFonts,
    highContrast,
    reducedMotion,
    largeText,
    dyslexiaFonts,

    // Actions
    setFont: applyFontKey,
    toggleHighContrast,
    toggleReducedMotion,
    toggleLargeText,
    resetSettings,

    // Current font object
    currentFont: FONTS[fontKey] || FONTS[DEFAULT_FONT],
    isDyslexiaFont: FONTS[fontKey]?.category === 'dyslexia'
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export default AccessibilityProvider;