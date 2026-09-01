/**
 * Browser Compatibility Table Component
 * Displays browser compatibility matrix with status indicators.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Box,
  Tooltip,
  IconButton,
  Collapse,
  LinearProgress,
  Alert,
  AlertTitle
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import HelpIcon from '@mui/icons-material/Help';
import InfoIcon from '@mui/icons-material/Info';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';

const BrowserCompatibilityTable = ({ data, loading = false, onDownload, onPrint }) => {
  const [expandedBrowser, setExpandedBrowser] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'fully_supported':
        return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
      case 'partially_supported':
        return <WarningIcon sx={{ color: '#ff9800' }} />;
      case 'not_supported':
        return <ErrorIcon sx={{ color: '#f44336' }} />;
      default:
        return <HelpIcon sx={{ color: '#9e9e9e' }} />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'fully_supported':
        return { label: 'Full Support', color: 'success' };
      case 'partially_supported':
        return { label: 'Partial Support', color: 'warning' };
      case 'not_supported':
        return { label: 'Not Supported', color: 'error' };
      default:
        return { label: 'Unknown', color: 'default' };
    }
  };

  const getFeatureIcon = (supported) => {
    return supported ? '✅' : '❌';
  };

  const sortedData = useMemo(() => {
    if (!data) return [];
    const sorted = [...data];
    sorted.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [data, sortConfig]);

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>Loading browser compatibility data...</Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Paper>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Alert severity="info">
        <AlertTitle>No Data</AlertTitle>
        No browser compatibility data available.
      </Alert>
    );
  }

  const totalSupported = data.filter(b => b.status === 'fully_supported').length;
  const totalPartial = data.filter(b => b.status === 'partially_supported').length;
  const totalBrowsers = data.length;

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          🌐 Browser Compatibility Matrix
        </Typography>
        <Box>
          <IconButton onClick={onDownload} title="Download">
            <DownloadIcon />
          </IconButton>
          <IconButton onClick={onPrint} title="Print">
            <PrintIcon />
          </IconButton>
        </Box>
      </Box>

      <Box display="flex" gap={2} mb={3}>
        <Chip 
          label={`✅ Fully Supported: ${totalSupported}`} 
          color="success" 
          variant="outlined"
        />
        <Chip 
          label={`⚠️ Partial Support: ${totalPartial}`} 
          color="warning" 
          variant="outlined"
        />
        <Chip 
          label={`📊 Total Browsers: ${totalBrowsers}`} 
          variant="outlined"
        />
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell onClick={() => handleSort('name')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Browser {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
              </TableCell>
              <TableCell onClick={() => handleSort('version')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Version {sortConfig.key === 'version' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
              </TableCell>
              <TableCell onClick={() => handleSort('status')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
              </TableCell>
              <TableCell onClick={() => handleSort('test_coverage')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Coverage {sortConfig.key === 'test_coverage' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
              </TableCell>
              <TableCell>Features</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.map((browser) => {
              const statusInfo = getStatusLabel(browser.status);
              const isExpanded = expandedBrowser === browser.id;

              return (
                <React.Fragment key={browser.id}>
                  <TableRow hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getStatusIcon(browser.status)}
                        <Typography fontWeight={browser.status === 'fully_supported' ? 'bold' : 'normal'}>
                          {browser.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{browser.version}</TableCell>
                    <TableCell>
                      <Chip 
                        label={statusInfo.label} 
                        color={statusInfo.color} 
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress 
                          variant="determinate" 
                          value={browser.test_coverage} 
                          sx={{ width: 60, height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption">{browser.test_coverage}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {browser.features && Object.entries(browser.features).slice(0, 3).map(([key, value]) => (
                        <Tooltip key={key} title={key.replace('_', ' ').toUpperCase()}>
                          <span style={{ marginRight: 4, fontSize: 14 }}>
                            {getFeatureIcon(value)}
                          </span>
                        </Tooltip>
                      ))}
                      {browser.features && Object.keys(browser.features).length > 3 && (
                        <Tooltip title={`+${Object.keys(browser.features).length - 3} more features`}>
                          <span style={{ fontSize: 12, color: '#999' }}>...</span>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        onClick={() => setExpandedBrowser(isExpanded ? null : browser.id)}
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={6} style={{ padding: 0 }}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box p={2} bgcolor="#f9f9f9">
                          <Typography variant="subtitle2" gutterBottom>Browser Details</Typography>
                          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                            <Box>
                              <Typography variant="caption" color="textSecondary">Min Version</Typography>
                              <Typography>{browser.min_version || 'N/A'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="textSecondary">Recommended Version</Typography>
                              <Typography>{browser.recommended_version || 'N/A'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="textSecondary">Notes</Typography>
                              <Typography variant="body2">{browser.notes || 'No notes'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="textSecondary">Last Tested</Typography>
                              <Typography>{browser.last_tested ? new Date(browser.last_tested).toLocaleDateString() : 'N/A'}</Typography>
                            </Box>
                          </Box>
                          {browser.known_issues && browser.known_issues.length > 0 && (
                            <Box mt={2}>
                              <Typography variant="caption" color="textSecondary">Known Issues</Typography>
                              <ul style={{ margin: 4, paddingLeft: 20 }}>
                                {browser.known_issues.map((issue, idx) => (
                                  <li key={idx}><Typography variant="body2">{issue}</Typography></li>
                                ))}
                              </ul>
                            </Box>
                          )}
                          {browser.features && Object.entries(browser.features).length > 0 && (
                            <Box mt={2}>
                              <Typography variant="caption" color="textSecondary">Feature Support</Typography>
                              <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                                {Object.entries(browser.features).map(([key, value]) => (
                                  <Chip
                                    key={key}
                                    label={`${key.replace('_', ' ').toUpperCase()}: ${value ? '✅' : '❌'}`}
                                    size="small"
                                    color={value ? 'success' : 'error'}
                                    variant="outlined"
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default BrowserCompatibilityTable;