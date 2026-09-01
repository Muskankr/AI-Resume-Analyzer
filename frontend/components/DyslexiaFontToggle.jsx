/**
 * DyslexiaFontToggle Component
 * Full-featured font toggle with preview and settings.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Tooltip,
  IconButton,
  Slider,
  Divider,
  Chip,
  Collapse,
  Alert,
  AlertTitle,
  Grid,
  Card,
  CardContent,
  useTheme,
  alpha,
  Fade,
  Grow,
  Zoom
} from '@mui/material';
import {
  TextFormat as TextFormatIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  Restore as RestoreIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  FontDownload as FontDownloadIcon,
  FormatSize as FormatSizeIcon,
  Contrast as ContrastIcon,
  Speed as SpeedIcon,
  Accessibility as AccessibilityIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccessibility } from '../context/AccessibilityContext';
import { FONTS, getDyslexiaFonts } from '../utils/fonts';

const DyslexiaFontToggle = ({
  variant = 'detailed', // 'compact', 'detailed', 'minimal', 'card'
  showPreview = true,
  showSettings = true,
  className = '',
  style = {}
}) => {
  const theme = useTheme();
  const {
    fontKey,
    setFont,
    currentFont,
    isDyslexiaFont,
    highContrast,
    reducedMotion,
    largeText,
    toggleHighContrast,
    toggleReducedMotion,
    toggleLargeText,
    resetSettings,
    dyslexiaFonts
  } = useAccessibility();

  const [expanded, setExpanded] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [showPreviewText, setShowPreviewText] = useState(true);

  // Preview text samples
  const previewTexts = [
    "The quick brown fox jumps over the lazy dog.",
    "Accessibility matters for everyone.",
    "Reading should be comfortable for all users.",
    "Dyslexia-friendly fonts make a difference.",
    "This is how text will look with your selected font."
  ];

  const [previewText, setPreviewText] = useState(previewTexts[0]);

  // Handle font change
  const handleFontChange = (event) => {
    setFont(event.target.value);
  };

  // Handle reset
  const handleReset = () => {
    resetSettings();
    setFontSize(100);
    setLetterSpacing(0);
  };

  // Toggle preview text
  const cyclePreviewText = () => {
    const currentIndex = previewTexts.indexOf(previewText);
    const nextIndex = (currentIndex + 1) % previewTexts.length;
    setPreviewText(previewTexts[nextIndex]);
  };

  // Get font preview style
  const getFontStyle = (fontKey) => {
    const font = FONTS[fontKey];
    return {
      fontFamily: font.family,
      fontSize: `${fontSize}%`,
      letterSpacing: `${letterSpacing}px`,
      transition: 'all 0.3s ease'
    };
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
          border: `1px solid ${isDyslexiaFont ? theme.palette.primary.main : theme.palette.divider}`,
          backgroundColor: isDyslexiaFont ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
          transition: 'all 0.3s ease',
          ...style
        }}
        className={className}
      >
        <Tooltip title="Dyslexia-Friendly Font">
          <TextFormatIcon
            sx={{
              color: isDyslexiaFont ? theme.palette.primary.main : theme.palette.text.secondary,
              transition: 'color 0.3s ease'
            }}
          />
        </Tooltip>

        <FormControlLabel
          control={
            <Switch
              checked={isDyslexiaFont}
              onChange={() => setFont(isDyslexiaFont ? 'standard' : 'opendyslexic')}
              color="primary"
              size="small"
            />
          }
          label={
            <Typography variant="body2" noWrap>
              {isDyslexiaFont ? currentFont.name : 'Off'}
            </Typography>
          }
          sx={{ mr: 0 }}
        />

        {isDyslexiaFont && (
          <Tooltip title="Change font">
            <Select
              value={fontKey}
              onChange={handleFontChange}
              size="small"
              variant="outlined"
              sx={{
                minWidth: 120,
                '& .MuiSelect-select': {
                  py: 0.5,
                  fontSize: '0.75rem'
                }
              }}
            >
              {dyslexiaFonts.map((font) => (
                <MenuItem key={font.name} value={font.name.toLowerCase()}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <span style={{ fontFamily: font.family }}>
                      {font.name}
                    </span>
                    {font.name.toLowerCase() === fontKey && (
                      <CheckIcon sx={{ fontSize: 14, color: theme.palette.primary.main }} />
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </Tooltip>
        )}

        <Tooltip title="Font Settings">
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
          gap: 1,
          ...style
        }}
        className={className}
      >
        <Tooltip title={isDyslexiaFont ? 'Dyslexia font ON' : 'Dyslexia font OFF'}>
          <IconButton
            onClick={() => setFont(isDyslexiaFont ? 'standard' : 'opendyslexic')}
            color={isDyslexiaFont ? 'primary' : 'default'}
            size="small"
          >
            <TextFormatIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="caption" color="textSecondary">
          {isDyslexiaFont ? 'A+' : 'A'}
        </Typography>
      </Box>
    );
  }

  // Render card variant
  if (variant === 'card') {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: `1px solid ${isDyslexiaFont ? theme.palette.primary.main : theme.palette.divider}`,
          boxShadow: isDyslexiaFont ? `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}` : 'none',
          transition: 'all 0.3s ease',
          ...style
        }}
        className={className}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <AccessibilityIcon color={isDyslexiaFont ? 'primary' : 'action'} />
              <Typography variant="h6" fontWeight={600}>
                Accessibility
              </Typography>
              {isDyslexiaFont && (
                <Chip
                  label="Active"
                  size="small"
                  color="primary"
                  icon={<CheckCircleIcon />}
                />
              )}
            </Box>
            <Tooltip title="Reset all">
              <IconButton size="small" onClick={handleReset}>
                <RestoreIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box display="flex" flexDirection="column" gap={2}>
            {/* Font toggle */}
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  Dyslexia-Friendly Font
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {isDyslexiaFont ? `Using ${currentFont.name}` : 'Disabled'}
                </Typography>
              </Box>
              <Switch
                checked={isDyslexiaFont}
                onChange={() => setFont(isDyslexiaFont ? 'standard' : 'opendyslexic')}
                color="primary"
              />
            </Box>

            {/* Font selector */}
            {isDyslexiaFont && (
              <Fade in={isDyslexiaFont}>
                <Box>
                  <FormControl fullWidth size="small">
                    <InputLabel>Select Font</InputLabel>
                    <Select
                      value={fontKey}
                      onChange={handleFontChange}
                      label="Select Font"
                    >
                      {dyslexiaFonts.map((font) => (
                        <MenuItem key={font.name} value={font.name.toLowerCase()}>
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <span style={{ fontFamily: font.family }}>
                              {font.name}
                            </span>
                            {font.name.toLowerCase() === fontKey && (
                              <CheckIcon sx={{ fontSize: 16, color: theme.palette.primary.main, ml: 'auto' }} />
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Fade>
            )}

            {/* Additional settings */}
            <Box display="flex" flexDirection="column" gap={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={highContrast}
                    onChange={() => toggleHighContrast(!highContrast)}
                    size="small"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">High Contrast</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Better visibility
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={largeText}
                    onChange={() => toggleLargeText(!largeText)}
                    size="small"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Large Text</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Increased font size
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={reducedMotion}
                    onChange={() => toggleReducedMotion(!reducedMotion)}
                    size="small"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Reduced Motion</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Minimize animations
                    </Typography>
                  </Box>
                }
              />
            </Box>

            {/* Preview */}
            {showPreview && isDyslexiaFont && (
              <Zoom in={isDyslexiaFont}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    border: `1px solid ${theme.palette.divider}`,
                    fontFamily: currentFont.family,
                    fontSize: `${fontSize}%`,
                    letterSpacing: `${letterSpacing}px`,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <Typography variant="caption" color="textSecondary" gutterBottom>
                    Preview
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: currentFont.family,
                      fontSize: `${fontSize}%`,
                      letterSpacing: `${letterSpacing}px`,
                      lineHeight: 1.8
                    }}
                  >
                    {previewText}
                  </Typography>
                </Box>
              </Zoom>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Render detailed variant (default)
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: `1px solid ${isDyslexiaFont ? theme.palette.primary.main : theme.palette.divider}`,
        backgroundColor: isDyslexiaFont ? alpha(theme.palette.primary.main, 0.04) : 'background.paper',
        transition: 'all 0.3s ease',
        ...style
      }}
      className={className}
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <AccessibilityIcon sx={{ color: isDyslexiaFont ? theme.palette.primary.main : theme.palette.text.secondary }} />
          <Typography variant="h6" fontWeight={600}>
            Accessibility Settings
          </Typography>
          {isDyslexiaFont && (
            <Chip
              label={currentFont.name}
              size="small"
              color="primary"
              variant="filled"
            />
          )}
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Reset all settings">
            <IconButton size="small" onClick={handleReset}>
              <RestoreIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={isDyslexiaFont ? 'Disable' : 'Enable'}>
            <IconButton
              size="small"
              onClick={() => setFont(isDyslexiaFont ? 'standard' : 'opendyslexic')}
              color={isDyslexiaFont ? 'primary' : 'default'}
            >
              {isDyslexiaFont ? <VisibilityIcon /> : <VisibilityOffIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Main content */}
      <Grid container spacing={3}>
        {/* Left column - Controls */}
        <Grid item xs={12} md={6}>
          <Box display="flex" flexDirection="column" gap={2}>
            {/* Font toggle */}
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  Dyslexia-Friendly Font
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {isDyslexiaFont ? `Active: ${currentFont.name}` : 'Click to enable'}
                </Typography>
              </Box>
              <Switch
                checked={isDyslexiaFont}
                onChange={() => setFont(isDyslexiaFont ? 'standard' : 'opendyslexic')}
                color="primary"
              />
            </Box>

            {/* Font selector */}
            {isDyslexiaFont && (
              <Fade in={isDyslexiaFont}>
                <Box>
                  <FormControl fullWidth size="small">
                    <InputLabel>Select Dyslexia Font</InputLabel>
                    <Select
                      value={fontKey}
                      onChange={handleFontChange}
                      label="Select Dyslexia Font"
                    >
                      {dyslexiaFonts.map((font) => (
                        <MenuItem key={font.name} value={font.name.toLowerCase()}>
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <span style={{ fontFamily: font.family }}>
                              {font.name}
                            </span>
                            {font.name.toLowerCase() === fontKey && (
                              <CheckIcon sx={{ fontSize: 16, color: theme.palette.primary.main, ml: 'auto' }} />
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Fade>
            )}

            {/* Additional settings */}
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Additional Settings
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={highContrast}
                      onChange={() => toggleHighContrast(!highContrast)}
                      size="small"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">High Contrast</Typography>
                      <Typography variant="caption" color="textSecondary">
                        Enhanced visibility
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={largeText}
                      onChange={() => toggleLargeText(!largeText)}
                      size="small"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">Large Text</Typography>
                      <Typography variant="caption" color="textSecondary">
                        +20% font size
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={reducedMotion}
                      onChange={() => toggleReducedMotion(!reducedMotion)}
                      size="small"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">Reduced Motion</Typography>
                      <Typography variant="caption" color="textSecondary">
                        Minimize animations
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Box>

            {/* Quick info */}
            <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
              <AlertTitle>About Dyslexia-Friendly Fonts</AlertTitle>
              <Typography variant="body2">
                Dyslexia-friendly fonts are designed with features that make reading easier for people with dyslexia,
                including heavier bottoms on letters, wider letter spacing, and distinct character shapes.
              </Typography>
            </Alert>
          </Box>
        </Grid>

        {/* Right column - Preview */}
        {showPreview && (
          <Grid item xs={12} md={6}>
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2">
                  Preview
                </Typography>
                <Button size="small" onClick={cyclePreviewText}>
                  Change Text
                </Button>
              </Box>
              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                  border: `1px solid ${theme.palette.divider}`,
                  fontFamily: isDyslexiaFont ? currentFont.family : 'inherit',
                  fontSize: `${fontSize}%`,
                  letterSpacing: `${letterSpacing}px`,
                  transition: 'all 0.3s ease',
                  minHeight: 120,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    fontFamily: isDyslexiaFont ? currentFont.family : 'inherit',
                    fontSize: `${fontSize}%`,
                    letterSpacing: `${letterSpacing}px`,
                    lineHeight: 1.8,
                    width: '100%'
                  }}
                >
                  {previewText}
                </Typography>
              </Box>

              {/* Font settings slider */}
              {isDyslexiaFont && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="textSecondary" gutterBottom>
                    Font Size
                  </Typography>
                  <Slider
                    value={fontSize}
                    onChange={(e, val) => setFontSize(val)}
                    min={80}
                    max={150}
                    step={5}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}%`}
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="caption" color="textSecondary" gutterBottom>
                    Letter Spacing
                  </Typography>
                  <Slider
                    value={letterSpacing}
                    onChange={(e, val) => setLetterSpacing(val)}
                    min={0}
                    max={5}
                    step={0.5}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}px`}
                  />
                </Box>
              )}
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Font info */}
      {isDyslexiaFont && (
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Typography variant="caption" color="textSecondary">
              Active Font: <strong>{currentFont.name}</strong>
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Category: <strong>{currentFont.category === 'dyslexia' ? 'Dyslexia-Friendly' : 'Standard'}</strong>
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Font Family: <strong style={{ fontFamily: currentFont.family }}>{currentFont.family}</strong>
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default DyslexiaFontToggle;