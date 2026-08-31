/**
 * SkillChipNavigator Component
 * Wrapper component that provides keyboard navigation context.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// Create context
const SkillChipNavigatorContext = createContext();

export const useSkillChipNavigator = () => {
  const context = useContext(SkillChipNavigatorContext);
  if (!context) {
    throw new Error('useSkillChipNavigator must be used within SkillChipNavigatorProvider');
  }
  return context;
};

export const SkillChipNavigatorProvider = ({ children }) => {
  const [focusedGroup, setFocusedGroup] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [groups, setGroups] = useState({});
  const groupRefs = useRef({});

  const registerGroup = useCallback((groupId, items) => {
    setGroups(prev => ({
      ...prev,
      [groupId]: items
    }));
    return groupId;
  }, []);

  const unregisterGroup = useCallback((groupId) => {
    setGroups(prev => {
      const newGroups = { ...prev };
      delete newGroups[groupId];
      return newGroups;
    });
    if (focusedGroup === groupId) {
      setFocusedGroup(null);
      setFocusedIndex(-1);
    }
  }, [focusedGroup]);

  const focusGroup = useCallback((groupId) => {
    setFocusedGroup(groupId);
    setFocusedIndex(0);
    if (groupRefs.current[groupId]) {
      groupRefs.current[groupId].focus();
    }
  }, []);

  const focusNext = useCallback(() => {
    if (!focusedGroup) return;
    const items = groups[focusedGroup] || [];
    if (focusedIndex < items.length - 1) {
      setFocusedIndex(prev => prev + 1);
    }
  }, [focusedGroup, focusedIndex, groups]);

  const focusPrev = useCallback(() => {
    if (!focusedGroup) return;
    if (focusedIndex > 0) {
      setFocusedIndex(prev => prev - 1);
    }
  }, [focusedGroup, focusedIndex]);

  const focusFirst = useCallback(() => {
    if (!focusedGroup) return;
    setFocusedIndex(0);
  }, [focusedGroup]);

  const focusLast = useCallback(() => {
    if (!focusedGroup) return;
    const items = groups[focusedGroup] || [];
    setFocusedIndex(items.length - 1);
  }, [focusedGroup, groups]);

  const clearFocus = useCallback(() => {
    setFocusedGroup(null);
    setFocusedIndex(-1);
  }, []);

  const getFocusedItem = useCallback(() => {
    if (!focusedGroup) return null;
    const items = groups[focusedGroup] || [];
    return items[focusedIndex] || null;
  }, [focusedGroup, focusedIndex, groups]);

  const registerRef = useCallback((groupId, ref) => {
    groupRefs.current[groupId] = ref;
  }, []);

  const value = {
    focusedGroup,
    focusedIndex,
    groups,
    registerGroup,
    unregisterGroup,
    focusGroup,
    focusNext,
    focusPrev,
    focusFirst,
    focusLast,
    clearFocus,
    getFocusedItem,
    registerRef
  };

  return (
    <SkillChipNavigatorContext.Provider value={value}>
      {children}
    </SkillChipNavigatorContext.Provider>
  );
};

export default SkillChipNavigatorProvider;