/**
 * SkillChipGroup Component
 * Group of skill chips with keyboard arrow navigation.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import useKeyboardNavigation from '../hooks/useKeyboardNavigation';
import SkillChip from './SkillChip';

const SkillChipGroup = ({
  title = '',
  skills = [],
  matched = [],
  missing = [],
  onSkillSelect = null,
  onSkillRemove = null,
  onSkillAdd = null,
  showScores = true,
  maxDisplay = null,
  emptyMessage = 'No skills found',
  groupType = 'all', // 'all', 'matched', 'missing'
  allowRemoval = true,
  allowSelection = true,
  size = 'medium',
  color = 'primary',
  className = '',
  style = {}
}) => {
  const theme = useTheme();
  const [focusedChip, setFocusedChip] = useState(null);

  // Prepare skills data
  const getSkillsData = useCallback(() => {
    if (groupType === 'matched') {
      return matched.map(skill => ({ ...skill, isMatched: true, isMissing: false }));
    }
    if (groupType === 'missing') {
      return missing.map(skill => ({ ...skill, isMatched: false, isMissing: true }));
    }
    // All skills
    const allSkills = skills.map(skill => ({
      ...skill,
      isMatched: matched.some(m => m.id === skill.id || m.label === skill.label),
      isMissing: missing.some(m => m.id === skill.id || m.label === skill.label)
    }));
    return allSkills;
  }, [skills, matched, missing, groupType]);

  const skillData = getSkillsData();

  // Keyboard navigation
  const {
    focusedIndex,
    isFocused,
    containerRef,
    registerItem,
    setFocus,
    clearFocus,
    focusAt,
    handleKeyDown,
    getCurrentItem,
    totalItems
  } = useKeyboardNavigation(skillData, {
    loop: true,
    onSelect: (item) => {
      if (onSkillSelect && allowSelection) {
        onSkillSelect(item);
      }
    },
    onDelete: (item) => {
      if (onSkillRemove && allowRemoval) {
        onSkillRemove(item);
      }
    },
    onEscape: () => {
      clearFocus();
    },
    onTab: (event) => {
      // Allow tab to move out of group
      clearFocus();
    }
  });

  // Handle chip select
  const handleChipSelect = useCallback((item) => {
    if (onSkillSelect && allowSelection) {
      onSkillSelect(item);
    }
  }, [onSkillSelect, allowSelection]);

  // Handle chip remove
  const handleChipRemove = useCallback((item) => {
    if (onSkillRemove && allowRemoval) {
      onSkillRemove(item);
    }
  }, [onSkillRemove, allowRemoval]);

  // Handle chip focus
  const handleChipFocus = useCallback((item, index) => {
    setFocusedChip(item);
    focusAt(index);
  }, [focusAt]);

  // Display skills
  const displaySkills = maxDisplay ? skillData.slice(0, maxDisplay) : skillData;
  const hiddenCount = skillData.length - displaySkills.length;

  // Keyboard instructions
  const keyboardInstructions = (
    <Box
      sx={{
        fontSize: '0.75rem',
        color: 'text.secondary',
        mt: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap'
      }}
    >
      <span>⌨️</span>
      <span>Arrow keys to navigate</span>
      <span>•</span>
      <span>Enter to select</span>
      {allowRemoval && (
        <>
          <span>•</span>
          <span>Delete to remove</span>
        </>
      )}
      <span>•</span>
      <span>Escape to exit</span>
    </Box>
  );

  if (skillData.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderStyle: 'dashed',
          bgcolor: alpha(theme.palette.grey[100], 0.5),
          ...style
        }}
      >
        <Typography variant="body2" color="textSecondary" align="center">
          {emptyMessage}
        </Typography>
      </Paper>
    );
  }

  return (
    <Box className={className} style={style}>
      {title && (
        <Typography
          variant="subtitle2"
          gutterBottom
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 600
          }}
        >
          <span>{title}</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'text.secondary' }}>
            {skillData.length} skills
            {groupType === 'matched' && ` (${skillData.length} matched)`}
            {groupType === 'missing' && ` (${skillData.length} missing)`}
          </span>
        </Typography>
      )}

      <Paper
        ref={containerRef}
        variant="outlined"
        tabIndex={0}
        role="listbox"
        aria-label={title || 'Skill chips group'}
        onFocus={setFocus}
        onKeyDown={handleKeyDown}
        sx={{
          p: 1.5,
          minHeight: 50,
          outline: 'none',
          borderColor: isFocused ? theme.palette.primary.main : undefined,
          boxShadow: isFocused ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.15)}` : undefined,
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          backgroundColor: isFocused ? alpha(theme.palette.primary.main, 0.02) : 'transparent',
          '&:focus': { outline: 'none' },
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2
          }
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.5,
            minHeight: 36
          }}
        >
          {displaySkills.map((skill, index) => {
            const isFocused = focusedIndex === index;
            const matchedSkill = matched.find(m => m.id === skill.id || m.label === skill.label);
            const missingSkill = missing.find(m => m.id === skill.id || m.label === skill.label);

            return (
              <SkillChip
                key={skill.id || skill.label || index}
                ref={(ref) => registerItem(index, ref)}
                label={skill.label || skill.name || skill}
                value={skill.value || skill}
                isMatched={!!matchedSkill}
                isMissing={!!missingSkill}
                isFocused={isFocused}
                score={skill.score}
                showScore={showScores}
                category={skill.category}
                onSelect={handleChipSelect}
                onRemove={allowRemoval ? handleChipRemove : null}
                onFocus={() => handleChipFocus(skill, index)}
                size={size}
                variant={skill.isMatched ? 'filled' : 'outlined'}
                color={skill.isMatched ? 'success' : skill.isMissing ? 'error' : color}
                tooltip={`${skill.label} - ${skill.isMatched ? '✅ Matched' : skill.isMissing ? '❌ Missing' : 'Skill'}`}
              />
            );
          })}

          {hiddenCount > 0 && (
            <Chip
              label={`+${hiddenCount} more`}
              size="small"
              variant="outlined"
              sx={{ opacity: 0.6 }}
            />
          )}
        </Box>

        {keyboardInstructions}
      </Paper>
    </Box>
  );
};

export default SkillChipGroup;