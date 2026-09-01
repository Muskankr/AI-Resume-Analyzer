/**
 * FontSizeContext - Context provider for in-app font size control
 * Persists font size preference across sessions
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Font size levels
export const FONT_SIZES = {
  xs: {
    id: 'xs',
    label: 'Extra Small',
    value: 0.75,
    emoji: '🔍',
    description: 'Smaller text for compact views'
  },
  sm: {
    id: 'sm',
    label: 'Small',
    value: 0.875,
    emoji: '📘',
    description: 'Slightly smaller than default'
  },
  md: {
    id: 'md',
    label: 'Medium (Default)',
    value: 1.0,
    emoji: '📗',
    description: 'Standard font size'
  },
  lg: {
    id: 'lg',
    label: 'Large',
    value: 1.125,
    emoji: '📕',
    description: 'Easier reading'
  },
  xl: {
    id: 'xl',
    label: 'Extra Large',
    value: 1.25,
    emoji: '📒',
    description: 'Comfortable reading'
  },
  xxl: {
    id: 'xxl',
    label: 'XX Large',
    value: 1.5,
    emoji: '📖',
    description: 'Maximum readability'
  }
};

// Font size levels array for easy iteration
export const FONT_SIZE_LEVELS = Object.values(FONT_SIZES);

// Default font size
export const DEFAULT_FONT_SIZE = 'md';

// Storage key
const FONT_SIZE_STORAGE_KEY = 'app-font-size';

// Create context
const FontSizeContext = createContext();

export const FontSizeProvider = ({ children }) => {
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [previewText, setPreviewText] = useState('');

  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (saved && FONT_SIZES[saved]) {
      setFontSize(saved);
    }
    setIsLoaded(true);
  }, []);

  // Apply font size
  useEffect(() => {
    if (isLoaded) {
      applyFontSize(fontSize);
    }
  }, [fontSize, isLoaded]);

  // Apply font size to document
  const applyFontSize = useCallback((sizeKey) => {
    const size = FONT_SIZES[sizeKey];
    if (!size) return;

    // Remove all font size classes
    document.documentElement.classList.remove(
      'font-size-xs',
      'font-size-sm',
      'font-size-md',
      'font-size-lg',
      'font-size-xl',
      'font-size-xxl'
    );

    // Add class for current size
    document.documentElement.classList.add(`font-size-${sizeKey}`);

    // Set CSS variable
    document.documentElement.style.setProperty('--font-size-scale', size.value);

    // Apply to body
    document.body.style.fontSize = `${size.value * 100}%`;

    // Save to localStorage
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, sizeKey);
  }, []);

  // Change font size
  const changeFontSize = useCallback((sizeKey) => {
    if (FONT_SIZES[sizeKey]) {
      setFontSize(sizeKey);
    }
  }, []);

  // Increase font size
  const increaseFontSize = useCallback(() => {
    const levels = FONT_SIZE_LEVELS;
    const currentIndex = levels.findIndex(l => l.id === fontSize);
    if (currentIndex < levels.length - 1) {
      changeFontSize(levels[currentIndex + 1].id);
    }
  }, [fontSize, changeFontSize]);

  // Decrease font size
  const decreaseFontSize = useCallback(() => {
    const levels = FONT_SIZE_LEVELS;
    const currentIndex = levels.findIndex(l => l.id === fontSize);
    if (currentIndex > 0) {
      changeFontSize(levels[currentIndex - 1].id);
    }
  }, [fontSize, changeFontSize]);

  // Reset to default
  const resetFontSize = useCallback(() => {
    changeFontSize(DEFAULT_FONT_SIZE);
  }, [changeFontSize]);

  // Get current font size info
  const currentFontSize = FONT_SIZES[fontSize] || FONT_SIZES[DEFAULT_FONT_SIZE];

  // Get font size label
  const getFontSizeLabel = useCallback((sizeKey) => {
    return FONT_SIZES[sizeKey]?.label || sizeKey;
  }, []);

  // Get font size value
  const getFontSizeValue = useCallback((sizeKey) => {
    return FONT_SIZES[sizeKey]?.value || 1;
  }, []);

  const value = {
    fontSize,
    currentFontSize,
    isLoaded,
    changeFontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    getFontSizeLabel,
    getFontSizeValue,
    availableSizes: FONT_SIZE_LEVELS,
    isDefault: fontSize === DEFAULT_FONT_SIZE
  };

  return (
    <FontSizeContext.Provider value={value}>
      {children}
    </FontSizeContext.Provider>
  );
};

export const useFontSize = () => {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize must be used within FontSizeProvider');
  }
  return context;
};

export default FontSizeProvider;