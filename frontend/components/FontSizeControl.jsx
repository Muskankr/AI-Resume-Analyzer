/**
 * FontSizeControl Component
 * Interactive font size control with presets and slider
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Divider,
  Collapse,
  Alert,
  AlertTitle,
  useTheme,
  alpha,
  Fade,
  Zoom,
  Grid
} from '@mui/material';
import {
  FormatSize as FormatSizeIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Restore as RestoreIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TextDecrease as TextDecreaseIcon,
  TextIncrease as TextIncreaseIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useFontSize, FONT_SIZES, FONT_SIZE_LEVELS } from '../context/FontSizeContext';

const FontSizeControl = ({
  variant = 'detailed', // 'compact', 'detailed', 'minimal', 'slider'
  showLabel = true,
  showPresets = true,
  className = '',
  style = {}
}) => {
  const theme = useTheme();
  const {
    fontSize,
    currentFontSize,
    changeFontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    availableSizes,
    isDefault,
    isMax,
    isMin
  } = useFontSize();

  const [expanded, setExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Preview text
  const previewText = "The quick brown fox jumps over the lazy dog. This text demonstrates the current font size setting.";

  // Handle slider change
  const handleSliderChange = (event, value) => {
    const sizeKey = FONT_SIZE_LEVELS[value]?.id || 'md';
    changeFontSize(sizeKey);
  };

  // Get current slider index
  const currentIndex = FONT_SIZE_LEVELS.findIndex(l => l.id === fontSize);
  const sliderValue = currentIndex >= 0 ? currentIndex : 2;

  // Get size label
  const getSizeLabel = (sizeKey) => {
    return FONT_SIZES[sizeKey]?.label || sizeKey;
  };

  const getSizeEmoji = (sizeKey) => {
    return FONT_SIZES[sizeKey]?.emoji || '📗';
  };

  // Get description
  const getDescription = (sizeKey) => {
    return FONT_SIZES[sizeKey]?.description || '';
  };

  // Get percentage
  const getPercentage = (sizeKey) => {
    const size = FONT_SIZES[sizeKey];
    return size ? Math.round(size.value * 100) : 100;
  };

  // Render compact variant
  if (variant === 'compact') {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderRadius: 2,
          border: `1px solid ${!isDefault ? theme.palette.primary.main : theme.palette.divider}`,
          backgroundColor: !isDefault ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
          transition: 'all 0.3s ease',
          ...style
        }}
        className={className}
      >
        <Tooltip title="Font Size">
          <FormatSizeIcon
            sx={{
              color: !isDefault ? theme.palette.primary.main : theme.palette.text.secondary,
              transition: 'color 0.3s ease'
            }}
          />
        </Tooltip>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={decreaseFontSize}
            disabled={isMin}
            sx={{
              opacity: isMin ? 0.3 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>

          <Chip
            label={`${getPercentage(fontSize)}%`}
            size="small"
            color={!isDefault ? 'primary' : 'default'}
            variant={!isDefault ? 'filled' : 'outlined'}
          />

          <IconButton
            size="small"
            onClick={increaseFontSize}
            disabled={isMax}
            sx={{
              opacity: isMax ? 0.3 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>

        <Tooltip title="Reset to default">
          <IconButton
            size="small"
            onClick={resetFontSize}
            disabled={isDefault}
            sx={{
              opacity: isDefault ? 0.3 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            <RestoreIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Font Size Settings">
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{
              ml: 'auto',
              transition: 'transform 0.3s ease',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0)'
            }}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Paper>
    );
  }

  // Render minimal variant
  if (variant === 'minimal') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          ...style
        }}
        className={className}
      >
        <Tooltip title="Decrease font size">
          <IconButton
            size="small"
            onClick={decreaseFontSize}
            disabled={isMin}
          >
            <TextDecreaseIcon />
          </IconButton>
        </Tooltip>
        <Typography
          variant="caption"
          sx={{
            minWidth: 32,
            textAlign: 'center',
            fontWeight: !isDefault ? 700 : 400,
            color: !isDefault ? theme.palette.primary.main : 'text.secondary'
          }}
        >
          {getPercentage(fontSize)}%
        </Typography>
        <Tooltip title="Increase font size">
          <IconButton
            size="small"
            onClick={increaseFontSize}
            disabled={isMax}
          >
            <TextIncreaseIcon />
          </IconButton>
        </Tooltip>
        {!isDefault && (
          <Tooltip title="Reset to default">
            <IconButton size="small" onClick={resetFontSize}>
              <RestoreIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }

  // Render slider variant
  if (variant === 'slider') {
    return (
      <Box sx={{ ...style }} className={className}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="body2" color="textSecondary">
            Font Size
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {getPercentage(fontSize)}%
          </Typography>
        </Box>
        <Slider
          value={sliderValue}
          onChange={handleSliderChange}
          min={0}
          max={FONT_SIZE_LEVELS.length - 1}
          step={1}
          marks={FONT_SIZE_LEVELS.map((level, index) => ({
            value: index,
            label: level.emoji
          }))}
          valueLabelDisplay="off"
          sx={{
            '& .MuiSlider-markLabel': {
              fontSize: '0.75rem'
            }
          }}
        />
        <Box display="flex" justifyContent="space-between" mt={0.5}>
          <Typography variant="caption" color="textSecondary">
            Smaller
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Larger
          </Typography>
        </Box>
      </Box>
    );
  }

  // Render detailed variant (default)
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: `1px solid ${!isDefault ? theme.palette.primary.main : theme.palette.divider}`,
        backgroundColor: !isDefault ? alpha(theme.palette.primary.main, 0.04) : 'background.paper',
        transition: 'all 0.3s ease',
        ...style
      }}
      className={className}
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <FormatSizeIcon sx={{ color: !isDefault ? theme.palette.primary.main : theme.palette.text.secondary }} />
          <Typography variant="h6" fontWeight={600}>
            Font Size Control
          </Typography>
          {!isDefault && (
            <Chip
              label={`${getPercentage(fontSize)}%`}
              size="small"
              color="primary"
              variant="filled"
            />
          )}
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Reset to default">
            <IconButton
              size="small"
              onClick={resetFontSize}
              disabled={isDefault}
              sx={{ opacity: isDefault ? 0.3 : 1 }}
            >
              <RestoreIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Toggle preview">
            <IconButton size="small" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? <InfoIcon fontSize="small" /> : <CloseIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        {/* Left column - Controls */}
        <Grid item xs={12} md={6}>
          {/* Current size display */}
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: !isDefault ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.grey[500], 0.1),
                border: `2px solid ${!isDefault ? theme.palette.primary.main : theme.palette.divider}`,
                transition: 'all 0.3s ease'
              }}
            >
              <Typography variant="h4" fontWeight={700} color={!isDefault ? 'primary' : 'text.secondary'}>
                {getPercentage(fontSize)}%
              </Typography>
            </Box>
            <Box>
              <Typography variant="body1" fontWeight={600}>
                {currentFontSize.label}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {currentFontSize.description}
              </Typography>
            </Box>
          </Box>

          {/* Size presets */}
          {showPresets && (
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                Quick Select
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {FONT_SIZE_LEVELS.map((level) => {
                  const isActive = fontSize === level.id;
                  return (
                    <Chip
                      key={level.id}
                      label={
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <span>{level.emoji}</span>
                          <span>{level.label}</span>
                        </Box>
                      }
                      onClick={() => changeFontSize(level.id)}
                      color={isActive ? 'primary' : 'default'}
                      variant={isActive ? 'filled' : 'outlined'}
                      size="small"
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'scale(1.05)'
                        }
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Size slider */}
          <Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="textSecondary">
                Adjust size
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <IconButton
                  size="small"
                  onClick={decreaseFontSize}
                  disabled={isMin}
                  sx={{ opacity: isMin ? 0.3 : 1 }}
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>
                <Chip
                  label={`${getPercentage(fontSize)}%`}
                  size="small"
                  color={!isDefault ? 'primary' : 'default'}
                  variant="outlined"
                />
                <IconButton
                  size="small"
                  onClick={increaseFontSize}
                  disabled={isMax}
                  sx={{ opacity: isMax ? 0.3 : 1 }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Slider
              value={sliderValue}
              onChange={handleSliderChange}
              min={0}
              max={FONT_SIZE_LEVELS.length - 1}
              step={1}
              marks={FONT_SIZE_LEVELS.map((level, index) => ({
                value: index,
                label: level.emoji
              }))}
              valueLabelDisplay="off"
              sx={{
                '& .MuiSlider-markLabel': {
                  fontSize: '0.75rem'
                }
              }}
            />
            <Box display="flex" justifyContent="space-between">
              <Typography variant="caption" color="textSecondary">
                {FONT_SIZE_LEVELS[0].label}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {FONT_SIZE_LEVELS[FONT_SIZE_LEVELS.length - 1].label}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Right column - Preview */}
        {showPreview && (
          <Grid item xs={12} md={6}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                minHeight: 180,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
                transition: 'all 0.3s ease'
              }}
            >
              <Typography variant="caption" color="textSecondary" gutterBottom>
                Preview
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontSize: `${getPercentage(fontSize)}%`,
                  lineHeight: 1.8,
                  transition: 'all 0.3s ease',
                  fontFamily: 'inherit'
                }}
              >
                {previewText}
              </Typography>
              <Box display="flex" gap={1} mt={2}>
                <Chip
                  label={`Current: ${currentFontSize.label}`}
                  size="small"
                  color={!isDefault ? 'primary' : 'default'}
                />
                <Chip
                  label={`${getPercentage(fontSize)}%`}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Quick actions */}
      <Box display="flex" gap={2} mt={3} pt={2} borderTop={`1px solid ${theme.palette.divider}`}>
        <Button
          variant="outlined"
          size="small"
          onClick={resetFontSize}
          disabled={isDefault}
          startIcon={<RestoreIcon />}
        >
          Reset to Default
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={decreaseFontSize}
          disabled={isMin}
          startIcon={<RemoveIcon />}
        >
          Smaller
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={increaseFontSize}
          disabled={isMax}
          startIcon={<AddIcon />}
        >
          Larger
        </Button>
      </Box>

      {/* Info alert */}
      <Alert
        severity="info"
        variant="outlined"
        sx={{ mt: 2 }}
        icon={<InfoIcon />}
      >
        <AlertTitle>Font Size Settings</AlertTitle>
        <Typography variant="body2">
          Changes will be saved automatically and persist across sessions.
          The font size applies to all text content in the application.
        </Typography>
      </Alert>
    </Paper>
  );
};

export default FontSizeControl;