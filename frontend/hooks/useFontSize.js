/**
 * useFontSize - Custom hook for managing app font size
 * Provides easy access to font size controls
 */

import { useState, useEffect, useCallback } from 'react';

const FONT_SIZES = {
  xs: { id: 'xs', label: 'Extra Small', value: 0.75 },
  sm: { id: 'sm', label: 'Small', value: 0.875 },
  md: { id: 'md', label: 'Medium', value: 1.0 },
  lg: { id: 'lg', label: 'Large', value: 1.125 },
  xl: { id: 'xl', label: 'Extra Large', value: 1.25 },
  xxl: { id: 'xxl', label: 'XX Large', value: 1.5 }
};

const STORAGE_KEY = 'app-font-size';
const DEFAULT_SIZE = 'md';

export const useFontSize = () => {
  const [currentSize, setCurrentSize] = useState(DEFAULT_SIZE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && FONT_SIZES[saved]) {
      setCurrentSize(saved);
    }
    setIsLoaded(true);
  }, []);

  // Apply font size
  useEffect(() => {
    if (isLoaded) {
      applySize(currentSize);
    }
  }, [currentSize, isLoaded]);

  const applySize = useCallback((sizeKey) => {
    const size = FONT_SIZES[sizeKey];
    if (!size) return;

    document.documentElement.classList.remove(
      'font-size-xs', 'font-size-sm', 'font-size-md',
      'font-size-lg', 'font-size-xl', 'font-size-xxl'
    );
    document.documentElement.classList.add(`font-size-${sizeKey}`);
    document.documentElement.style.setProperty('--font-size-scale', size.value);
    document.body.style.fontSize = `${size.value * 100}%`;
    localStorage.setItem(STORAGE_KEY, sizeKey);
  }, []);

  const changeSize = useCallback((sizeKey) => {
    if (FONT_SIZES[sizeKey]) {
      setCurrentSize(sizeKey);
    }
  }, []);

  const increase = useCallback(() => {
    const levels = Object.values(FONT_SIZES);
    const idx = levels.findIndex(l => l.id === currentSize);
    if (idx < levels.length - 1) {
      changeSize(levels[idx + 1].id);
    }
  }, [currentSize, changeSize]);

  const decrease = useCallback(() => {
    const levels = Object.values(FONT_SIZES);
    const idx = levels.findIndex(l => l.id === currentSize);
    if (idx > 0) {
      changeSize(levels[idx - 1].id);
    }
  }, [currentSize, changeSize]);

  const reset = useCallback(() => {
    changeSize(DEFAULT_SIZE);
  }, [changeSize]);

  const getCurrentSize = useCallback(() => {
    return FONT_SIZES[currentSize] || FONT_SIZES[DEFAULT_SIZE];
  }, [currentSize]);

  const getSizeLabel = useCallback((sizeKey) => {
    return FONT_SIZES[sizeKey]?.label || sizeKey;
  }, []);

  const getSizeValue = useCallback((sizeKey) => {
    return FONT_SIZES[sizeKey]?.value || 1;
  }, []);

  const isDefault = currentSize === DEFAULT_SIZE;
  const isMax = currentSize === 'xxl';
  const isMin = currentSize === 'xs';

  return {
    currentSize,
    currentFontSize: getCurrentSize(),
    isLoaded,
    isDefault,
    isMax,
    isMin,
    changeSize,
    increase,
    decrease,
    reset,
    getSizeLabel,
    getSizeValue,
    availableSizes: Object.values(FONT_SIZES)
  };
};

export default useFontSize;