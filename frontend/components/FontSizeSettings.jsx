/**
 * FontSizeSettings Component
 * Full font size settings page
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Container,
  Grid,
  Divider,
  Slider,
  Button,
  Chip,
  Alert,
  AlertTitle,
  Card,
  CardContent,
  Stack,
  useTheme,
  alpha,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  FormatSize as FormatSizeIcon,
  Restore as RestoreIcon,
  Check as CheckIcon,
  Info as InfoIcon,
  Keyboard as KeyboardIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  TextIncrease as TextIncreaseIcon,
  TextDecrease as TextDecreaseIcon
} from '@mui/icons-material';
import { useFontSize, FONT_SIZE_LEVELS } from '../context/FontSizeContext';
import FontSizeControl from './FontSizeControl';

const FontSizeSettings = () => {
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

  const [showLivePreview, setShowLivePreview] = useState(true);
  const [syncWithSystem, setSyncWithSystem] = useState(false);

  // Preview text samples
  const previewSamples = [
    "Heading 1 - Lorem ipsum dolor sit amet",
    "Heading 2 - Consectetur adipiscing elit",
    "Heading 3 - Sed do eiusmod tempor",
    "Body text - The quick brown fox jumps over the lazy dog. This demonstrates how text will appear at the current font size setting.",
    "Small text - Incididunt ut labore et dolore magna aliqua."
  ];

  const getPercentage = (sizeKey) => {
    const size = availableSizes.find(s => s.id === sizeKey);
    return size ? Math.round(size.value * 100) : 100;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <FormatSizeIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
            <Box>
              <Typography variant="h4" fontWeight={700}>
                Font Size Settings
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Adjust the base font size for better reading comfort
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RestoreIcon />}
            onClick={resetFontSize}
            disabled={isDefault}
          >
            Reset to Default
          </Button>
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Grid container spacing={4}>
          {/* Font Size Control */}
          <Grid item xs={12}>
            <FontSizeControl
              variant="detailed"
              showPresets={true}
              showLabel={true}
            />
          </Grid>

          {/* Quick Controls */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Quick Controls
                </Typography>
                <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={decreaseFontSize}
                    disabled={isMin}
                    startIcon={<RemoveIcon />}
                  >
                    Smaller
                  </Button>
                  <Chip
                    label={`${getPercentage(fontSize)}%`}
                    size="medium"
                    color="primary"
                    sx={{ minWidth: 60 }}
                  />
                  <Button
                    variant="contained"
                    size="large"
                    onClick={increaseFontSize}
                    disabled={isMax}
                    endIcon={<AddIcon />}
                  >
                    Larger
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    onClick={resetFontSize}
                    disabled={isDefault}
                    startIcon={<RestoreIcon />}
                  >
                    Reset
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Size Presets */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Size Presets
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
                        <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>
                          ({Math.round(level.value * 100)}%)
                        </span>
                      </Box>
                    }
                    onClick={() => changeFontSize(level.id)}
                    color={isActive ? 'primary' : 'default'}
                    variant={isActive ? 'filled' : 'outlined'}
                    size="medium"
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
          </Grid>

          {/* Live Preview */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle2">
                    Live Preview
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showLivePreview}
                        onChange={() => setShowLivePreview(!showLivePreview)}
                        size="small"
                      />
                    }
                    label="Show Preview"
                  />
                </Box>
                {showLivePreview && (
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      border: `1px solid ${theme.palette.divider}`,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Typography
                      variant="h4"
                      sx={{
                        fontSize: `${getPercentage(fontSize)}%`,
                        transition: 'all 0.3s ease',
                        mb: 1
                      }}
                    >
                      {previewSamples[0]}
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{
                        fontSize: `${getPercentage(fontSize) * 0.85}%`,
                        transition: 'all 0.3s ease',
                        mb: 1
                      }}
                    >
                      {previewSamples[1]}
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontSize: `${getPercentage(fontSize) * 0.7}%`,
                        transition: 'all 0.3s ease',
                        mb: 2
                      }}
                    >
                      {previewSamples[2]}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        fontSize: `${getPercentage(fontSize)}%`,
                        transition: 'all 0.3s ease',
                        lineHeight: 1.8,
                        mb: 1
                      }}
                    >
                      {previewSamples[3]}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: `${getPercentage(fontSize) * 0.8}%`,
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {previewSamples[4]}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Keyboard Shortcuts */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  <KeyboardIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 18 }} />
                  Keyboard Shortcuts
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="textSecondary">
                      Increase Font Size
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      <kbd>Ctrl</kbd> + <kbd>+</kbd>
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="textSecondary">
                      Decrease Font Size
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      <kbd>Ctrl</kbd> + <kbd>-</kbd>
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="textSecondary">
                      Reset Font Size
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      <kbd>Ctrl</kbd> + <kbd>0</kbd>
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Info Alert */}
          <Grid item xs={12}>
            <Alert
              severity="info"
              variant="outlined"
              icon={<InfoIcon />}
            >
              <AlertTitle>How It Works</AlertTitle>
              <Typography variant="body2">
                This font size control adjusts the base font size across the entire application.
                Changes are saved automatically and will persist across sessions.
                The layout remains responsive and usable at all sizes.
              </Typography>
            </Alert>
          </Grid>

          {/* Current Status */}
          <Grid item xs={12}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: !isDefault ? alpha(theme.palette.primary.main, 0.04) : 'transparent'
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Typography variant="body2" color="textSecondary">
                  Current Font Size: <strong>{currentFontSize.label}</strong>
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Scale: <strong>{getPercentage(fontSize)}%</strong>
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Status: <strong>{isDefault ? 'Default' : 'Customized'}</strong>
                </Typography>
                {!isDefault && (
                  <Chip
                    label="Custom Size Active"
                    size="small"
                    color="primary"
                    icon={<CheckIcon />}
                  />
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default FontSizeSettings;