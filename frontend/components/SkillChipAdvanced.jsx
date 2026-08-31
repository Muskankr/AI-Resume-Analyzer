/**
 * SkillChipAdvanced Component
 * Advanced skill chip with comprehensive keyboard navigation, accessibility, and visual features.
 * Supports matched/missing status, categories, scores, and interactive selection.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Chip,
  Typography,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  FormControlLabel,
  Switch,
  Slider,
  Button,
  Paper,
  Collapse,
  Fade,
  Grow,
  Zoom,
  useTheme,
  alpha,
  Badge,
  Avatar,
  Divider,
  Stack,
  Grid
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Code as CodeIcon,
  Database as DatabaseIcon,
  Cloud as CloudIcon,
  Security as SecurityIcon,
  Devices as DevicesIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  KeyboardArrowLeft as KeyboardArrowLeftIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  Home as HomeIcon,
  End as EndIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// Constants
// ============================================

const SKILL_CATEGORIES = {
  programming: { label: 'Programming', icon: <CodeIcon />, color: '#4f46e5' },
  database: { label: 'Database', icon: <DatabaseIcon />, color: '#0ea5e9' },
  cloud: { label: 'Cloud', icon: <CloudIcon />, color: '#f59e0b' },
  security: { label: 'Security', icon: <SecurityIcon />, color: '#ef4444' },
  devops: { label: 'DevOps', icon: <DevicesIcon />, color: '#8b5cf6' },
  soft_skills: { label: 'Soft Skills', icon: <PeopleIcon />, color: '#22c55e' }
};

const KEYBOARD_SHORTCUTS = [
  { keys: ['←', '↑'], action: 'Previous chip' },
  { keys: ['→', '↓'], action: 'Next chip' },
  { keys: ['Enter', 'Space'], action: 'Select chip' },
  { keys: ['Delete', 'Backspace'], action: 'Remove chip' },
  { keys: ['Escape'], action: 'Exit chip group' },
  { keys: ['Home'], action: 'First chip' },
  { keys: ['End'], action: 'Last chip' },
  { keys: ['Tab'], action: 'Enter/exit group' }
];

// ============================================
// Utility Functions
// ============================================

const getStatusColor = (status) => {
  switch (status) {
    case 'matched': return '#22c55e';
    case 'missing': return '#ef4444';
    case 'partial': return '#f59e0b';
    case 'unknown': return '#94a3b8';
    default: return '#94a3b8';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'matched': return <CheckCircleIcon />;
    case 'missing': return <CancelIcon />;
    case 'partial': return <WarningIcon />;
    default: return <InfoIcon />;
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'matched': return 'Matched';
    case 'missing': return 'Missing';
    case 'partial': return 'Partial';
    default: return 'Unknown';
  }
};

const getScoreColor = (score) => {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
};

const getScoreEmoji = (score) => {
  if (score >= 80) return '🌟';
  if (score >= 60) return '👍';
  if (score >= 40) return '📝';
  return '🔧';
};

// ============================================
// Main Component
// ============================================

const SkillChipAdvanced = ({
  // Basic props
  id,
  label,
  value,
  category = 'programming',
  score = null,
  status = 'unknown', // 'matched', 'missing', 'partial', 'unknown'
  
  // Appearance
  size = 'medium',
  variant = 'outlined',
  color = 'primary',
  avatar = null,
  icon = null,
  disabled = false,
  
  // Interactive
  selectable = true,
  removable = true,
  editable = false,
  draggable = false,
  favoritable = false,
  
  // State
  isSelected = false,
  isFocused = false,
  isFavorite = false,
  isExpanded = false,
  
  // Events
  onSelect = null,
  onRemove = null,
  onEdit = null,
  onFavorite = null,
  onExpand = null,
  onFocus = null,
  onBlur = null,
  onKeyDown = null,
  
  // Tooltip
  tooltip = '',
  
  // Additional info
  description = '',
  subSkills = [],
  relatedSkills = [],
  metadata = {},
  
  // Styles
  className = '',
  style = {},
  sx = {},
  
  // Children
  children = null,
  
  // Accessibility
  ariaLabel = '',
  ariaDescribedBy = '',
  
  ...props
}) => {
  const theme = useTheme();
  const chipRef = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [expanded, setExpanded] = useState(isExpanded);
  const [favorite, setFavorite] = useState(isFavorite);
  const [selected, setSelected] = useState(isSelected);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hover, setHover] = useState(false);

  // ============================================
  // Effects
  // ============================================

  useEffect(() => {
    if (isFocused && chipRef.current) {
      chipRef.current.focus();
    }
  }, [isFocused]);

  useEffect(() => {
    setSelected(isSelected);
  }, [isSelected]);

  useEffect(() => {
    setFavorite(isFavorite);
  }, [isFavorite]);

  useEffect(() => {
    setExpanded(isExpanded);
  }, [isExpanded]);

  // ============================================
  // Handlers
  // ============================================

  const handleClick = useCallback(() => {
    if (disabled || !selectable) return;
    const newSelected = !selected;
    setSelected(newSelected);
    if (onSelect) onSelect({ id, label, value, status, score, selected: newSelected });
  }, [disabled, selectable, selected, id, label, value, status, score, onSelect]);

  const handleRemove = useCallback(() => {
    if (disabled || !removable) return;
    if (onRemove) onRemove({ id, label, value, status, score });
  }, [disabled, removable, id, label, value, status, score, onRemove]);

  const handleFavorite = useCallback(() => {
    if (disabled || !favoritable) return;
    const newFavorite = !favorite;
    setFavorite(newFavorite);
    if (onFavorite) onFavorite({ id, label, value, status, score, favorite: newFavorite });
  }, [disabled, favoritable, favorite, id, label, value, status, score, onFavorite]);

  const handleExpand = useCallback(() => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    if (onExpand) onExpand({ id, label, value, status, score, expanded: newExpanded });
  }, [expanded, id, label, value, status, score, onExpand]);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
    setMenuOpen(true);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuOpen(false);
  };

  const handleEdit = useCallback(() => {
    handleMenuClose();
    if (onEdit) onEdit({ id, label, value, status, score });
  }, [id, label, value, status, score, onEdit]);

  const handleFocus = useCallback(() => {
    if (onFocus) onFocus({ id, label, value, status, score });
  }, [id, label, value, status, score, onFocus]);

  const handleBlur = useCallback(() => {
    if (onBlur) onBlur({ id, label, value, status, score });
  }, [id, label, value, status, score, onBlur]);

  // ============================================
  // Keyboard Navigation
  // ============================================

  const handleKeyDown = useCallback((event) => {
    const key = event.key;

    // Enter / Space - Select
    if ((key === 'Enter' || key === ' ') && selectable) {
      event.preventDefault();
      handleClick();
      return;
    }

    // Delete / Backspace - Remove
    if ((key === 'Delete' || key === 'Backspace') && removable) {
      event.preventDefault();
      handleRemove();
      return;
    }

    // Escape - Blur
    if (key === 'Escape') {
      event.preventDefault();
      chipRef.current?.blur();
      return;
    }

    // Custom key handling
    if (onKeyDown) {
      onKeyDown(event);
    }
  }, [selectable, removable, handleClick, handleRemove, onKeyDown]);

  // ============================================
  // Render Helpers
  // ============================================

  const getChipColor = () => {
    if (status === 'matched') return 'success';
    if (status === 'missing') return 'error';
    if (status === 'partial') return 'warning';
    if (color !== 'default' && color !== 'primary') return color;
    return 'primary';
  };

  const getChipVariant = () => {
    if (status === 'matched' || status === 'missing') return 'filled';
    return variant;
  };

  const getChipIcon = () => {
    if (icon) return icon;
    if (avatar) return avatar;
    if (status === 'matched') return <CheckCircleIcon />;
    if (status === 'missing') return <CancelIcon />;
    if (status === 'partial') return <WarningIcon />;
    return null;
  };

  const categoryInfo = SKILL_CATEGORIES[category] || SKILL_CATEGORIES.programming;

  // ============================================
  // Tooltip Content
  // ============================================

  const tooltipContent = tooltip || (
    <Box sx={{ maxWidth: 300, p: 0.5 }}>
      <Typography variant="subtitle2" fontWeight={700}>
        {label}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
          {description}
        </Typography>
      )}
      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {status && (
          <Chip
            label={getStatusLabel(status)}
            size="small"
            color={getChipColor()}
            variant="outlined"
            sx={{ height: 20, fontSize: '0.65rem' }}
          />
        )}
        {score !== null && (
          <Chip
            label={`Score: ${score}%`}
            size="small"
            variant="outlined"
            sx={{ height: 20, fontSize: '0.65rem' }}
          />
        )}
        {category && (
          <Chip
            label={categoryInfo.label}
            size="small"
            variant="outlined"
            sx={{ height: 20, fontSize: '0.65rem' }}
          />
        )}
      </Box>
      {subSkills.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Sub-skills: {subSkills.join(', ')}
          </Typography>
        </Box>
      )}
      <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          ⌨️ Enter: Select • Delete: Remove • Escape: Exit
        </Typography>
      </Box>
    </Box>
  );

  // ============================================
  // Chip Label
  // ============================================

  const chipLabel = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {status && (
        <Box sx={{ display: 'inline-flex', mr: 0.5 }}>
          {getStatusIcon(status)}
        </Box>
      )}
      <Typography
        variant="body2"
        sx={{
          fontWeight: selected ? 700 : 500,
          fontSize: size === 'small' ? '0.75rem' : size === 'large' ? '1rem' : '0.875rem'
        }}
      >
        {label}
      </Typography>
      {score !== null && (
        <Typography
          variant="caption"
          sx={{
            ml: 0.5,
            fontSize: '0.65rem',
            opacity: 0.7,
            fontWeight: 600,
            color: getScoreColor(score)
          }}
        >
          {score}%
        </Typography>
      )}
    </Box>
  );

  // ============================================
  // Main Render
  // ============================================

  return (
    <>
      <Tooltip
        title={tooltipContent}
        arrow
        placement="top"
        enterDelay={400}
        leaveDelay={200}
        open={showTooltip && !menuOpen}
        onOpen={() => setShowTooltip(true)}
        onClose={() => setShowTooltip(false)}
        disableFocusListener
        disableTouchListener
      >
        <Box
          ref={chipRef}
          component="div"
          tabIndex={disabled ? -1 : 0}
          role="button"
          aria-label={ariaLabel || `${label} skill chip${status === 'matched' ? ' (matched)' : ''}${status === 'missing' ? ' (missing)' : ''}`}
          aria-describedby={ariaDescribedBy}
          aria-selected={selected}
          aria-disabled={disabled}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          sx={{
            display: 'inline-block',
            margin: '2px',
            outline: 'none',
            cursor: disabled ? 'default' : 'pointer',
            position: 'relative',
            transition: 'all 0.2s ease',
            '&:focus': { outline: 'none' },
            '&:focus-visible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2,
              borderRadius: 1
            },
            ...sx
          }}
          className={className}
          {...props}
        >
          <Chip
            label={chipLabel}
            icon={getChipIcon()}
            color={getChipColor()}
            variant={getChipVariant()}
            size={size}
            avatar={avatar ? <Avatar src={avatar} /> : undefined}
            onDelete={removable ? handleRemove : undefined}
            deleteIcon={removable ? <CloseIcon fontSize="small" /> : undefined}
            sx={{
              cursor: disabled ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
              borderColor: isFocused ? theme.palette.primary.main : undefined,
              boxShadow: isFocused ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.3)}` : undefined,
              transform: isFocused || hover ? 'scale(1.02)' : 'scale(1)',
              backgroundColor: selected ? alpha(theme.palette.primary.main, 0.1) : undefined,
              '& .MuiChip-label': {
                padding: size === 'small' ? '0 8px' : '0 12px'
              },
              '&:hover': {
                boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.2)}`
              },
              ...style
            }}
          />

          {/* Favorite Star */}
          {favoritable && (
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); handleFavorite(); }}
              sx={{
                position: 'absolute',
                top: -6,
                right: -6,
                padding: '2px',
                backgroundColor: theme.palette.background.paper,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.warning.main, 0.1)
                },
                transform: favorite ? 'scale(1.1)' : 'scale(0.9)',
                transition: 'all 0.2s ease'
              }}
            >
              {favorite ? (
                <FavoriteIcon sx={{ fontSize: 14, color: theme.palette.warning.main }} />
              ) : (
                <FavoriteBorderIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
              )}
            </IconButton>
          )}

          {/* Menu Button */}
          {(editable || removable) && (
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); handleMenuOpen(e); }}
              sx={{
                position: 'absolute',
                bottom: -6,
                right: 8,
                padding: '2px',
                backgroundColor: theme.palette.background.paper,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                opacity: hover ? 1 : 0,
                transition: 'opacity 0.2s ease'
              }}
            >
              <MoreVertIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>
      </Tooltip>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 180,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }
        }}
      >
        {editable && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Skill</ListItemText>
          </MenuItem>
        )}
        {favoritable && (
          <MenuItem onClick={handleFavorite}>
            <ListItemIcon>
              {favorite ? <FavoriteIcon fontSize="small" color="warning" /> : <FavoriteBorderIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText>{favorite ? 'Remove from Favorites' : 'Add to Favorites'}</ListItemText>
          </MenuItem>
        )}
        {selectable && (
          <MenuItem onClick={handleClick}>
            <ListItemIcon>
              {selected ? <CheckCircleIcon fontSize="small" color="primary" /> : <CheckCircleIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText>{selected ? 'Deselect' : 'Select'}</ListItemText>
          </MenuItem>
        )}
        {removable && (
          <MenuItem onClick={handleRemove} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Remove Skill</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Expanded Details */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box
          sx={{
            mt: 1,
            p: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
          }}
        >
          <Grid container spacing={2}>
            {/* Basic Info */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>
                Basic Info
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="body2">
                  <strong>Name:</strong> {label}
                </Typography>
                <Typography variant="body2">
                  <strong>Category:</strong> {categoryInfo.label}
                </Typography>
                <Typography variant="body2">
                  <strong>Status:</strong> {getStatusLabel(status)}
                </Typography>
                {score !== null && (
                  <Typography variant="body2">
                    <strong>Score:</strong> {score}% {getScoreEmoji(score)}
                  </Typography>
                )}
              </Box>
            </Grid>

            {/* Additional Info */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>
                Additional Info
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {description && (
                  <Typography variant="body2">
                    <strong>Description:</strong> {description}
                  </Typography>
                )}
                {subSkills.length > 0 && (
                  <Typography variant="body2">
                    <strong>Sub-skills:</strong> {subSkills.join(', ')}
                  </Typography>
                )}
                {relatedSkills.length > 0 && (
                  <Typography variant="body2">
                    <strong>Related:</strong> {relatedSkills.join(', ')}
                  </Typography>
                )}
              </Box>
            </Grid>

            {/* Actions */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleClick}
                  startIcon={selected ? <CheckCircleIcon /> : null}
                >
                  {selected ? 'Selected' : 'Select'}
                </Button>
                {favoritable && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleFavorite}
                    startIcon={favorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  >
                    {favorite ? 'Favorited' : 'Favorite'}
                  </Button>
                )}
                {editable && (
                  <Button size="small" variant="outlined" onClick={handleEdit}>
                    Edit
                  </Button>
                )}
                {removable && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={handleRemove}
                    startIcon={<DeleteIcon />}
                  >
                    Remove
                  </Button>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleExpand}
                  endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                >
                  {expanded ? 'Collapse' : 'Expand'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </>
  );
};

// ============================================
// Export
// ============================================

export default SkillChipAdvanced;