/**
 * useKeyboardNavigation Hook
 * Provides keyboard navigation for skill chips using arrow keys.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for keyboard navigation on a list of items.
 * 
 * @param {Array} items - List of items to navigate
 * @param {Object} options - Configuration options
 * @param {number} options.initialIndex - Initial focused index
 * @param {boolean} options.loop - Whether to loop around
 * @param {function} options.onSelect - Callback when item is selected
 * @param {function} options.onEscape - Callback when escape is pressed
 * @returns {Object} Navigation state and handlers
 */
const useKeyboardNavigation = (items = [], options = {}) => {
  const {
    initialIndex = -1,
    loop = true,
    onSelect = null,
    onEscape = null,
    onTab = null,
    onHome = null,
    onEnd = null,
    onDelete = null,
    onEnter = null,
    onSpace = null
  } = options;

  const [focusedIndex, setFocusedIndex] = useState(initialIndex);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef(null);
  const itemRefs = useRef({});

  // Reset focus when items change
  useEffect(() => {
    if (focusedIndex >= items.length) {
      setFocusedIndex(items.length > 0 ? 0 : -1);
    }
  }, [items.length, focusedIndex]);

  // Focus an item
  const focusItem = useCallback((index) => {
    if (index < 0 || index >= items.length) {
      if (loop && items.length > 0) {
        // Loop to the other end
        const newIndex = index < 0 ? items.length - 1 : 0;
        setFocusedIndex(newIndex);
        return newIndex;
      }
      setFocusedIndex(-1);
      return -1;
    }
    setFocusedIndex(index);
    return index;
  }, [items.length, loop]);

  // Navigate to next item
  const next = useCallback(() => {
    if (items.length === 0) return -1;
    return focusItem(focusedIndex + 1);
  }, [focusedIndex, focusItem, items.length]);

  // Navigate to previous item
  const prev = useCallback(() => {
    if (items.length === 0) return -1;
    return focusItem(focusedIndex - 1);
  }, [focusedIndex, focusItem, items.length]);

  // Navigate to first item
  const first = useCallback(() => {
    if (items.length === 0) return -1;
    return focusItem(0);
  }, [focusItem, items.length]);

  // Navigate to last item
  const last = useCallback(() => {
    if (items.length === 0) return -1;
    return focusItem(items.length - 1);
  }, [focusItem, items.length]);

  // Get current item
  const getCurrentItem = useCallback(() => {
    if (focusedIndex >= 0 && focusedIndex < items.length) {
      return items[focusedIndex];
    }
    return null;
  }, [focusedIndex, items]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event) => {
    if (!isFocused) return;

    const key = event.key;

    switch (key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        next();
        break;

      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        prev();
        break;

      case 'Home':
        event.preventDefault();
        first();
        if (onHome) onHome(getCurrentItem());
        break;

      case 'End':
        event.preventDefault();
        last();
        if (onEnd) onEnd(getCurrentItem());
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        const current = getCurrentItem();
        if (onEnter) onEnter(current);
        if (onSelect) onSelect(current);
        break;

      case 'Escape':
        event.preventDefault();
        setIsFocused(false);
        setFocusedIndex(-1);
        if (onEscape) onEscape();
        break;

      case 'Tab':
        if (onTab) onTab(event);
        break;

      case 'Delete':
      case 'Backspace':
        const currentItem = getCurrentItem();
        if (onDelete) onDelete(currentItem);
        break;

      default:
        break;
    }
  }, [
    isFocused,
    next,
    prev,
    first,
    last,
    getCurrentItem,
    onEscape,
    onTab,
    onHome,
    onEnd,
    onDelete,
    onEnter,
    onSelect
  ]);

  // Register item ref
  const registerItem = useCallback((index, ref) => {
    if (ref) {
      itemRefs.current[index] = ref;
    } else {
      delete itemRefs.current[index];
    }
  }, []);

  // Scroll to focused item
  useEffect(() => {
    if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      const element = itemRefs.current[focusedIndex];
      element.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      element.focus?.();
    }
  }, [focusedIndex]);

  // Set focus on container
  const setFocus = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.focus();
      setIsFocused(true);
      if (focusedIndex === -1 && items.length > 0) {
        setFocusedIndex(0);
      }
    }
  }, [items.length, focusedIndex]);

  // Clear focus
  const clearFocus = useCallback(() => {
    setIsFocused(false);
    setFocusedIndex(-1);
  }, []);

  // Focus on specific index
  const focusAt = useCallback((index) => {
    if (index >= 0 && index < items.length) {
      setFocusedIndex(index);
      setIsFocused(true);
      return true;
    }
    return false;
  }, [items.length]);

  return {
    focusedIndex,
    isFocused,
    containerRef,
    itemRefs: itemRefs.current,
    registerItem,
    setFocus,
    clearFocus,
    focusAt,
    focusItem,
    next,
    prev,
    first,
    last,
    getCurrentItem,
    handleKeyDown,
    hasItems: items.length > 0,
    totalItems: items.length
  };
};

export default useKeyboardNavigation;