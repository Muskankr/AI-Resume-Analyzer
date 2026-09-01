/**
 * AccessibilitySettings Component
 * Full accessibility settings page with all options.
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Container,
  Grid,
  Divider,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Slider,
  Alert,
  AlertTitle,
  Card,
  CardContent,
  Chip,
  Stack,
  useTheme,
  alpha
} from '@mui/material';
import {
  Accessibility as AccessibilityIcon,
  TextFormat as TextFormatIcon,
  Contrast as ContrastIcon,
  Speed as SpeedIcon,
  FormatSize as FormatSizeIcon,
  CheckCircle as CheckCircleIcon,
  Restore as RestoreIcon,
  Info as InfoIcon,
  Keyboard as KeyboardIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useAccessibility } from '../context/AccessibilityContext';
import { FONTS, getDyslexiaFonts } from '../utils/fonts';
import DyslexiaFontToggle from './DyslexiaFontToggle';

const AccessibilitySettings = ({ onClose }) => {
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

  const [fontSize, setFontSize] = useState(100);
  const [letterSpacing, setLetterSpacing] = useState(0);

  const handleReset = () => {
    resetSettings();
    setFontSize(100);
    setLetterSpacing(0);
  };

  const handleFontChange = (event) => {
    setFont(event.target.value);
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
            <AccessibilityIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
            <Box>
              <Typography variant="h4" fontWeight={700}>
                Accessibility Settings
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Customize your reading and viewing experience
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RestoreIcon />}
            onClick={handleReset}
          >
            Reset All
          </Button>
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Grid container spacing={4}>
          {/* Font Settings */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              <TextFormatIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Font Settings
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Choose a font that makes reading more comfortable for you.
            </Typography>
          </Grid>

          {/* Font Toggle */}
          <Grid item xs={12} md={6}>
            <DyslexiaFontToggle
              variant="card"
              showPreview={true}
              showSettings={true}
            />
          </Grid>

          {/* Font Info */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  About Dyslexia-Friendly Fonts
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Dyslexia-friendly fonts are specifically designed to improve readability for people with dyslexia.
                  Key features include:
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">• Heavier bottoms on letters</Typography>
                  <Typography variant="body2">• Wider letter spacing</Typography>
                  <Typography variant="body2">• Distinct character shapes</Typography>
                  <Typography variant="body2">• Improved readability</Typography>
                </Stack>
                <Box mt={2}>
                  <Chip
                    label={`Current: ${isDyslexiaFont ? currentFont.name : 'Standard Font'}`}
                    color={isDyslexiaFont ? 'primary' : 'default'}
                    icon={isDyslexiaFont ? <CheckCircleIcon /> : null}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Visual Settings */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              <VisibilityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Visual Settings
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Adjust visual elements to improve readability and reduce eye strain.
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={highContrast}
                    onChange={() => toggleHighContrast(!highContrast)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">High Contrast Mode</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Increases color contrast for better visibility
                    </Typography>
                  </Box>
                }
              />
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={largeText}
                    onChange={() => toggleLargeText(!largeText)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Large Text</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Increases font size by 20% across the app
                    </Typography>
                  </Box>
                }
              />
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={reducedMotion}
                    onChange={() => toggleReducedMotion(!reducedMotion)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Reduced Motion</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Minimizes animations and transitions for users sensitive to motion
                    </Typography>
                  </Box>
                }
              />
            </Paper>
          </Grid>

          {/* Keyboard Shortcuts */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              <KeyboardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Keyboard Shortcuts
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Quick keyboard shortcuts for accessibility features.
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="textSecondary">
                    Toggle Dyslexia Font
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd>
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="textSecondary">
                    Toggle High Contrast
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd>
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="textSecondary">
                    Reset Settings
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Status Summary */}
          <Grid item xs={12}>
            <Alert
              severity={isDyslexiaFont ? 'success' : 'info'}
              icon={isDyslexiaFont ? <CheckCircleIcon /> : <InfoIcon />}
              sx={{ mt: 2 }}
            >
              <AlertTitle>
                {isDyslexiaFont ? 'Dyslexia-Friendly Font Active' : 'Standard Font Mode'}
              </AlertTitle>
              {isDyslexiaFont ? (
                <Typography variant="body2">
                  You are currently using <strong>{currentFont.name}</strong> with{' '}
                  {highContrast ? 'High Contrast' : 'standard contrast'} and{' '}
                  {largeText ? 'Large Text' : 'normal text size'}.
                  {reducedMotion && ' Reduced Motion is enabled.'}
                </Typography>
              ) : (
                <Typography variant="body2">
                  Enable dyslexia-friendly fonts for a more comfortable reading experience.
                  {highContrast && ' High Contrast is enabled.'}
                  {largeText && ' Large Text is enabled.'}
                  {reducedMotion && ' Reduced Motion is enabled.'}
                </Typography>
              )}
            </Alert>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default AccessibilitySettings;