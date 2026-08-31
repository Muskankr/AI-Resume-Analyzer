/**
 * SkillChip Component
 * Individual skill chip with keyboard navigation support.
 */

import React, { forwardRef, useRef, useEffect } from 'react';
import {
  Chip,
  Box,
  Tooltip,
  Typography,
  IconButton,
  useTheme,
  alpha
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import StarIcon from '@mui/icons-material/Star';

const SkillChip = forwardRef(({
  label,
  value,
  isMatched = false,
  isMissing = false,
  isFocused = false,
  onSelect = null,
  onRemove = null,
  onFocus = null,
  onKeyDown = null,
  showScore = true,
  score = null,
  category = null,
  icon = null,
  size = 'medium',
  variant = 'outlined',
  color = 'default',
  tooltip = '',
  className = '',
  style = {},
  ...props
}, ref) => {
  const theme = useTheme();
  const chipRef = useRef(null);

  // Focus management
  useEffect(() => {
    if (isFocused && chipRef.current) {
      chipRef.current.focus();
    }
  }, [isFocused]);

  // Get chip color based on status
  const getChipColor = () => {
    if (isMatched) return 'success';
    if (isMissing) return 'error';
    if (color !== 'default') return color;
    return 'primary';
  };

  // Get chip variant based on status
  const getChipVariant = () => {
    if (isMatched || isMissing) return 'filled';
    return variant;
  };

  // Get icon based on status
  const getChipIcon = () => {
    if (icon) return icon;
    if (isMatched) return <CheckCircleIcon fontSize="small" />;
    if (isMissing) return <CancelIcon fontSize="small" />;
    return null;
  };

  // Handle keyboard events
  const handleKeyDown = (event) => {
    const key = event.key;

    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (onSelect) onSelect({ label, value, isMatched, isMissing });
    }

    if (key === 'Delete' || key === 'Backspace') {
      if (onRemove) {
        event.preventDefault();
        onRemove({ label, value, isMatched, isMissing });
      }
    }

    if (onKeyDown) {
      onKeyDown(event);
    }
  };

  // Handle click
  const handleClick = () => {
    if (onSelect) onSelect({ label, value, isMatched, isMissing });
  };

  // Handle remove
  const handleRemove = (event) => {
    event.stopPropagation();
    if (onRemove) onRemove({ label, value, isMatched, isMissing });
  };

  // Tooltip content
  const tooltipContent = tooltip || (
    <Box>
      <Typography variant="caption" display="block">
        <strong>{label}</strong>
        {score !== null && showScore && (
          <span style={{ marginLeft: 4 }}>
            (Score: {score}%)
          </span>
        )}
      </Typography>
      {category && (
        <Typography variant="caption" display="block" color="text.secondary">
          Category: {category}
        </Typography>
      )}
      {isMatched && (
        <Typography variant="caption" display="block" color="success.main">
          ✅ Matched skill
        </Typography>
      )}
      {isMissing && (
        <Typography variant="caption" display="block" color="error.main">
          ❌ Missing skill
        </Typography>
      )}
      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
        Press Enter to select, Delete to remove
      </Typography>
    </Box>
  );

  // Status label
  const statusLabel = isMatched ? '✅' : isMissing ? '❌' : '';

  // Chip styles
  const chipStyles = {
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    borderColor: isFocused ? theme.palette.primary.main : undefined,
    boxShadow: isFocused ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.3)}` : undefined,
    transform: isFocused ? 'scale(1.02)' : 'scale(1)',
    ...style
  };

  return (
    <Tooltip
      title={tooltipContent}
      arrow
      placement="top"
      enterDelay={500}
      leaveDelay={200}
    >
      <Box
        ref={ref || chipRef}
        component="div"
        tabIndex={0}
        role="button"
        aria-label={`${label} skill chip${isMatched ? ' (matched)' : ''}${isMissing ? ' (missing)' : ''}`}
        aria-selected={isFocused}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onFocus={() => onFocus && onFocus({ label, value, isMatched, isMissing })}
        sx={{
          display: 'inline-block',
          margin: '2px',
          outline: 'none',
          '&:focus': {
            outline: 'none'
          },
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
            borderRadius: 1
          }
        }}
        className={className}
      >
        <Chip
          label={
            <Box display="flex" alignItems="center" gap={0.5}>
              {statusLabel && (
                <span style={{ marginRight: 2 }}>{statusLabel}</span>
              )}
              <span>{label}</span>
              {score !== null && showScore && (
                <span style={{
                  fontSize: '0.7rem',
                  opacity: 0.7,
                  marginLeft: 4,
                  fontWeight: 'bold'
                }}>
                  {score}%
                </span>
              )}
            </Box>
          }
          icon={getChipIcon()}
          color={getChipColor()}
          variant={getChipVariant()}
          size={size}
          onDelete={onRemove ? handleRemove : undefined}
          deleteIcon={onRemove ? <CloseIcon fontSize="small" /> : undefined}
          sx={chipStyles}
          {...props}
        />
      </Box>
    </Tooltip>
  );
});

SkillChip.displayName = 'SkillChip';

export default SkillChip;