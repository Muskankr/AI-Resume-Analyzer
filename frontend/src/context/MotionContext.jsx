import React, { createContext, useContext, useState, useEffect } from 'react';

const MotionContext = createContext();

export function MotionProvider({ children }) {
  // 1. Core State Resolution: Check localStorage first, fallback to checking OS preferences
  const [reducedMotionSetting, setReducedMotionSetting] = useState(() => {
    const savedPreference = localStorage.getItem('openprep_reduced_motion');
    if (savedPreference !== null) {
      return savedPreference === 'true';
    }
    // Read OS setting dynamically if local preference isn't set yet
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  // 2. Synchronize DOM utility markers for global CSS transition modifications
  useEffect(() => {
    if (reducedMotionSetting) {
      document.documentElement.classList.add('reduce-motion-active');
    } else {
      document.documentElement.classList.remove('reduce-motion-active');
    }
    localStorage.setItem('openprep_reduced_motion', String(reducedMotionSetting));
  }, [reducedMotionSetting]);

  // Listen for underlying live hardware/OS preference transformations
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleOsChange = (e) => {
      // Only mirror OS transformations if the user hasn't explicitly overridden them in localStorage
      if (localStorage.getItem('openprep_reduced_motion') === null) {
        setReducedMotionSetting(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleOsChange);
    return () => mediaQuery.removeEventListener('change', handleOsChange);
  }, []);

  const toggleReducedMotion = () => {
    setReducedMotionSetting(prev => !prev);
  };

  return (
    <MotionContext.Provider value={{ isReducedMotion: reducedMotionSetting, toggleReducedMotion }}>
      {children}
    </MotionContext.Provider>
  );
}

export const useMotion = () => useContext(MotionContext);
