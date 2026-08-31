/**
 * Score Breakdown Component for AI Resume Analyzer
 * Displays detailed, explainable score breakdown with visual indicators.
 * Interactive accordion-style component with plain language explanations.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button,
  Tooltip,
  IconButton,
  Divider,
  Grid,
  Paper,
  Alert,
  AlertTitle,
  Skeleton,
  Fade,
  Grow,
  Slide
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import SchoolIcon from '@mui/icons-material/School';
import WorkIcon from '@mui/icons-material/Work';
import BuildIcon from '@mui/icons-material/Build';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import DescriptionIcon from '@mui/icons-material/Description';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import SettingsIcon from '@mui/icons-material/Settings';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { motion, AnimatePresence } from 'framer-motion';

const ScoreBreakdown = ({ 
  breakdown, 
  onSuggestionClick, 
  loading = false,
  onDownload,
  onShare,
  onPrint 
}) => {
  const [expandedFactors, setExpandedFactors] = useState([]);
  const [showPlainLanguage, setShowPlainLanguage] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    if (breakdown) {
      setAnimationComplete(true);
    }
  }, [breakdown]);

  const toggleFactor = useCallback((factorName) => {
    setExpandedFactors(prev =>
      prev.includes(factorName)
        ? prev.filter(f => f !== factorName)
        : [...prev, factorName]
    );
  }, []);

  const getScoreColor = useCallback((score) => {
    if (score >= 85) return '#4caf50';
    if (score >= 70) return '#8bc34a';
    if (score >= 50) return '#ffc107';
    if (score >= 30) return '#ff9800';
    return '#f44336';
  }, []);

  const getScoreEmoji = useCallback((score) => {
    if (score >= 85) return '🌟';
    if (score >= 70) return '👍';
    if (score >= 50) return '📝';
    if (score >= 30) return '⚠️';
    return '🔧';
  }, []);

  const getScoreLabel = useCallback((score) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 30) return 'Below Average';
    return 'Needs Improvement';
  }, []);

  const getRatingIcon = useCallback((rating) => {
    const icons = {
      'Excellent': <CheckCircleIcon style={{ color: '#4caf50' }} />,
      'Good': <TrendingUpIcon style={{ color: '#8bc34a' }} />,
      'Fair': <WarningIcon style={{ color: '#ffc107' }} />,
      'Below Average': <ErrorIcon style={{ color: '#ff9800' }} />,
      'Needs Improvement': <ErrorIcon style={{ color: '#f44336' }} />
    };
    return icons[rating] || <InfoIcon />;
  }, []);

  const getCategoryIcon = useCallback((category) => {
    const icons = {
      'keyword_match': <SearchIcon />,
      'formatting': <DescriptionIcon />,
      'section_completeness': <CheckCircleIcon />,
      'experience_quality': <WorkIcon />,
      'education': <SchoolIcon />,
      'skills': <BuildIcon />,
      'achievements': <EmojiEventsIcon />,
      'length': <DescriptionIcon />,
      'language': <SpellcheckIcon />,
      'ats_compatibility': <SettingsIcon />
    };
    return icons[category] || <InfoIcon />;
  }, []);

  const factorIconMap = useMemo(() => ({
    'Keyword Match': '🔍',
    'Formatting Quality': '📄',
    'Section Completeness': '📋',
    'Experience Quality': '💼',
    'Education': '🎓',
    'Skills Relevance': '🛠️',
    'Achievements': '🏆',
    'Resume Length': '📏',
    'Language Quality': '✍️',
    'ATS Compatibility': '⚙️'
  }), []);

  const filteredFactors = useMemo(() => {
    if (!breakdown || !breakdown.factors) return [];
    
    let factors = [...breakdown.factors];
    
    if (selectedCategory !== 'all') {
      factors = factors.filter(f => f.category === selectedCategory);
    }
    
    if (sortBy === 'score') {
      factors.sort((a, b) => b.score - a.score);
    } else if (sortBy === 'weight') {
      factors.sort((a, b) => b.weight - a.weight);
    } else if (sortBy === 'name') {
      factors.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return factors;
  }, [breakdown, selectedCategory, sortBy]);

  const getCategories = useCallback(() => {
    if (!breakdown || !breakdown.factors) return [];
    const categories = [...new Set(breakdown.factors.map(f => f.category))];
    return categories.filter(c => c !== undefined);
  }, [breakdown]);

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box>
              <Skeleton variant="text" width={200} height={40} />
              <Skeleton variant="text" width={150} height={20} />
            </Box>
            <Skeleton variant="circular" width={60} height={60} />
          </Box>
          <Skeleton variant="rectangular" height={10} sx={{ mb: 3 }} />
          <Box display="flex" gap={1} mb={3}>
            <Skeleton variant="rectangular" width={100} height={36} />
            <Skeleton variant="rectangular" width={100} height={36} />
          </Box>
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!breakdown) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="textSecondary">
              📊 No Score Breakdown Available
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Please analyze your resume to see the detailed score breakdown.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const { score, factors, summary, generated_at, improvement_priorities, quick_tips } = breakdown;
  const rating = getScoreLabel(score);
  const scoreColor = getScoreColor(score);
  const scoreEmoji = getScoreEmoji(score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
        {/* Header with gradient background */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${scoreColor}22, ${scoreColor}11)`,
            p: 3,
            borderBottom: `3px solid ${scoreColor}`
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap">
            <Box>
              <Typography variant="h4" component="h2" sx={{ fontWeight: 700 }}>
                {scoreEmoji} Resume Score
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Detailed breakdown of how your score was calculated
              </Typography>
              {generated_at && (
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                  Generated: {new Date(generated_at).toLocaleString()}
                </Typography>
              )}
            </Box>
            <Box textAlign="center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Typography variant="h2" sx={{ color: scoreColor, fontWeight: 800 }}>
                  {score}%
                </Typography>
              </motion.div>
              <Box display="flex" alignItems="center" gap={1} justifyContent="center">
                {getRatingIcon(rating)}
                <Typography variant="body2" color="textSecondary" fontWeight={500}>
                  {rating}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <CardContent sx={{ pt: 3 }}>
          {/* Overall Score Bar */}
          <Box mb={3}>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" color="textSecondary">
                Overall Score
              </Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ color: scoreColor }}>
                {score}%
              </Typography>
            </Box>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 1 }}
            >
              <LinearProgress
                variant="determinate"
                value={score}
                sx={{
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: '#e0e0e0',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: scoreColor,
                    borderRadius: 6,
                    backgroundImage: `linear-gradient(90deg, ${scoreColor}88, ${scoreColor})`
                  }
                }}
              />
            </motion.div>
          </Box>

          {/* Control Buttons */}
          <Box display="flex" gap={1} mb={3} flexWrap="wrap">
            <Button
              variant={showPlainLanguage ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setShowPlainLanguage(true)}
              sx={{ borderRadius: 2 }}
            >
              💬 Plain Language
            </Button>
            <Button
              variant={!showPlainLanguage ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setShowPlainLanguage(false)}
              sx={{ borderRadius: 2 }}
            >
              📊 Technical Details
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={onDownload}
              startIcon={<DownloadIcon />}
              sx={{ borderRadius: 2 }}
            >
              Export
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={onShare}
              startIcon={<ShareIcon />}
              sx={{ borderRadius: 2 }}
            >
              Share
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={onPrint}
              startIcon={<PrintIcon />}
              sx={{ borderRadius: 2 }}
            >
              Print
            </Button>
          </Box>

          {/* Filters */}
          <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center">
            <Typography variant="caption" color="textSecondary">Filter by:</Typography>
            <Chip
              label="All"
              size="small"
              onClick={() => setSelectedCategory('all')}
              color={selectedCategory === 'all' ? 'primary' : 'default'}
              variant={selectedCategory === 'all' ? 'filled' : 'outlined'}
            />
            {getCategories().map(cat => (
              <Chip
                key={cat}
                label={cat.replace('_', ' ').title()}
                size="small"
                onClick={() => setSelectedCategory(cat)}
                color={selectedCategory === cat ? 'primary' : 'default'}
                variant={selectedCategory === cat ? 'filled' : 'outlined'}
              />
            ))}
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="caption" color="textSecondary">Sort by:</Typography>
            <Chip
              label="Score"
              size="small"
              onClick={() => setSortBy('score')}
              color={sortBy === 'score' ? 'primary' : 'default'}
              variant={sortBy === 'score' ? 'filled' : 'outlined'}
            />
            <Chip
              label="Weight"
              size="small"
              onClick={() => setSortBy('weight')}
              color={sortBy === 'weight' ? 'primary' : 'default'}
              variant={sortBy === 'weight' ? 'filled' : 'outlined'}
            />
            <Chip
              label="Name"
              size="small"
              onClick={() => setSortBy('name')}
              color={sortBy === 'name' ? 'primary' : 'default'}
              variant={sortBy === 'name' ? 'filled' : 'outlined'}
            />
          </Box>

          {/* Summary Section */}
          {showPlainLanguage && summary && (
            <Slide direction="up" in={true} mountOnEnter unmountOnExit>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: '#f5f7fa',
                  borderRadius: 2,
                  border: '1px solid #e0e0e0'
                }}
              >
                <Typography variant="body2" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                  {summary}
                </Typography>
              </Paper>
            </Slide>
          )}

          {/* Factors Breakdown */}
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
            Score Factors
            <Chip
              label={`${filteredFactors.length} factors`}
              size="small"
              sx={{ ml: 1 }}
            />
          </Typography>

          <AnimatePresence>
            {filteredFactors.map((factor, index) => {
              const isExpanded = expandedFactors.includes(factor.name);
              const factorColor = getScoreColor(factor.score);
              const factorIcon = factorIconMap[factor.name] || '📊';

              return (
                <motion.div
                  key={factor.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Accordion
                    expanded={isExpanded}
                    onChange={() => toggleFactor(factor.name)}
                    sx={{
                      mb: 1,
                      borderRadius: 2,
                      border: `1px solid ${isExpanded ? factorColor : '#e0e0e0'}`,
                      '&:before': { display: 'none' },
                      boxShadow: isExpanded ? `0 4px 12px ${factorColor}33` : 'none'
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        '& .MuiAccordionSummary-content': {
                          display: 'flex',
                          alignItems: 'center',
                          width: '100%'
                        }
                      }}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                            {factorIcon} {factor.name}
                          </Typography>
                          <Chip
                            label={`${(factor.weight * 100).toFixed(0)}%`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                          <Chip
                            label={factor.category?.replace('_', ' ').title() || 'General'}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem', opacity: 0.7 }}
                          />
                        </Box>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Tooltip title={`Score: ${factor.score}%`}>
                            <LinearProgress
                              variant="determinate"
                              value={factor.score}
                              sx={{
                                width: 120,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: '#e0e0e0',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: factorColor,
                                  borderRadius: 4
                                }
                              }}
                            />
                          </Tooltip>
                          <Typography variant="body2" fontWeight="bold" sx={{ color: factorColor, minWidth: 40 }}>
                            {factor.score}%
                          </Typography>
                          {factor.confidence > 0.8 && (
                            <Tooltip title="High confidence">
                              <CheckCircleIcon sx={{ color: '#4caf50', fontSize: '1rem' }} />
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box p={1}>
                        {/* Feedback */}
                        <Box display="flex" alignItems="flex-start" gap={1} mb={1.5}>
                          <LightbulbIcon sx={{ color: '#ffc107', fontSize: '1.2rem', mt: 0.2 }} />
                          <Typography variant="body2">
                            <strong>Feedback:</strong> {factor.feedback || 'No specific feedback available.'}
                          </Typography>
                        </Box>

                        {/* Suggestions */}
                        {factor.suggestions && factor.suggestions.length > 0 && (
                          <Box mb={1.5}>
                            <Typography variant="body2" fontWeight="bold" gutterBottom>
                              💡 Suggestions to Improve:
                            </Typography>
                            <ul style={{ marginTop: 4, paddingLeft: 20, marginBottom: 0 }}>
                              {factor.suggestions.map((suggestion, idx) => (
                                <motion.li
                                  key={idx}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                >
                                  <Typography variant="body2" color="textSecondary">
                                    {suggestion}
                                  </Typography>
                                </motion.li>
                              ))}
                            </ul>
                          </Box>
                        )}

                        {/* Metadata */}
                        <Box display="flex" gap={2} flexWrap="wrap" mt={1}>
                          <Chip
                            label={`Contribution: ${(factor.contribution * 100).toFixed(1)}%`}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                          <Tooltip title="Confidence in this score">
                            <Chip
                              label={`Confidence: ${(factor.confidence * 100).toFixed(0)}%`}
                              size="small"
                              variant="outlined"
                              color={factor.confidence > 0.7 ? 'success' : 'warning'}
                            />
                          </Tooltip>
                          {factor.max_score && factor.max_score > 100 && (
                            <Chip
                              label={`Max Score: ${factor.max_score}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredFactors.length === 0 && (
            <Box textAlign="center" py={3}>
              <Typography variant="body2" color="textSecondary">
                No factors match the current filters.
              </Typography>
            </Box>
          )}

          {/* Improvement Priorities */}
          {improvement_priorities && improvement_priorities.length > 0 && (
            <Box mt={4}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                🎯 Improvement Priorities
              </Typography>
              {improvement_priorities.map((priority, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card
                    variant="outlined"
                    sx={{
                      mb: 1,
                      p: 2,
                      borderLeft: `4px solid ${priority.impact === 'high' ? '#f44336' : '#ff9800'}`
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap">
                      <Box>
                        <Typography variant="subtitle2">
                          #{idx + 1} {priority.factor}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Current Score: {priority.current_score}%
                        </Typography>
                      </Box>
                      <Box display="flex" gap={1} alignItems="center">
                        <Chip
                          label={`Impact: ${priority.impact}`}
                          size="small"
                          color={priority.impact === 'high' ? 'error' : 'warning'}
                        />
                        <Chip
                          label={`+${priority.estimated_improvement}`}
                          size="small"
                          color="success"
                        />
                      </Box>
                    </Box>
                    <Box mt={1}>
                      {priority.suggestions && priority.suggestions.map((suggestion, sIdx) => (
                        <Typography key={sIdx} variant="body2" style={{ fontSize: '0.875rem' }}>
                          • {suggestion}
                        </Typography>
                      ))}
                    </Box>
                  </Card>
                </motion.div>
              ))}
            </Box>
          )}

          {/* Quick Tips */}
          {quick_tips && quick_tips.length > 0 && (
            <Box mt={3} p={2} sx={{ bgcolor: '#e3f2fd', borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                💡 Quick Tips
              </Typography>
              {quick_tips.map((tip, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Typography variant="body2">
                    {tip}
                  </Typography>
                </motion.div>
              ))}
            </Box>
          )}

          {/* Action Buttons */}
          <Box display="flex" gap={2} mt={4} flexWrap="wrap">
            <Button
              variant="contained"
              color="primary"
              startIcon={<DownloadIcon />}
              onClick={onDownload}
              sx={{ borderRadius: 2 }}
            >
              📥 Download Full Report
            </Button>
            <Button
              variant="outlined"
              startIcon={<ShareIcon />}
              onClick={onShare}
              sx={{ borderRadius: 2 }}
            >
              📧 Share Summary
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<CloseIcon />}
              onClick={() => {}}
              sx={{ borderRadius: 2 }}
            >
              📋 Copy to Clipboard
            </Button>
          </Box>

          {/* Footer info */}
          <Box mt={3} pt={2} borderTop="1px solid #e0e0e0">
            <Typography variant="caption" color="textSecondary" display="block">
              Analysis Version: {breakdown.analysis_version || '1.0'}
            </Typography>
            <Typography variant="caption" color="textSecondary" display="block">
              {generated_at && `Generated: ${new Date(generated_at).toLocaleString()}`}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ScoreBreakdown;