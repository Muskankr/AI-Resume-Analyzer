/**
 * SkillAnalysisPage Component
 * Full page with skill chips and keyboard navigation.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  Grid,
  Divider,
  Alert,
  AlertTitle,
  Button,
  Chip
} from '@mui/material';
import SkillChipGroup from '../components/SkillChipGroup';
import SkillChipNavigatorProvider from '../components/SkillChipNavigator';

const SkillAnalysisPage = () => {
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [removedSkills, setRemovedSkills] = useState([]);

  // Sample data
  const matchedSkills = [
    { id: 1, label: 'Python', score: 92, category: 'Programming' },
    { id: 2, label: 'React', score: 88, category: 'Frontend' },
    { id: 3, label: 'AWS', score: 85, category: 'Cloud' },
    { id: 4, label: 'Docker', score: 80, category: 'DevOps' },
    { id: 5, label: 'PostgreSQL', score: 78, category: 'Database' },
    { id: 6, label: 'Git', score: 90, category: 'Version Control' }
  ];

  const missingSkills = [
    { id: 7, label: 'Kubernetes', score: 45, category: 'DevOps' },
    { id: 8, label: 'Machine Learning', score: 35, category: 'AI' },
    { id: 9, label: 'GraphQL', score: 40, category: 'API' },
    { id: 10, label: 'TypeScript', score: 50, category: 'Frontend' }
  ];

  const allSkills = [...matchedSkills, ...missingSkills];

  // Filter out removed skills
  const visibleMatched = matchedSkills.filter(s => !removedSkills.includes(s.id));
  const visibleMissing = missingSkills.filter(s => !removedSkills.includes(s.id));

  // Handlers
  const handleSkillSelect = (skill) => {
    setSelectedSkill(skill);
    console.log('Selected skill:', skill);
  };

  const handleSkillRemove = (skill) => {
    setRemovedSkills(prev => [...prev, skill.id]);
    console.log('Removed skill:', skill);
  };

  const handleSkillAdd = (skill) => {
    setRemovedSkills(prev => prev.filter(id => id !== skill.id));
    console.log('Added skill:', skill);
  };

  return (
    <SkillChipNavigatorProvider>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          🎯 Skill Analysis
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Use arrow keys to navigate between skill chips. Press Enter to select, Delete to remove.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Grid container spacing={3}>
          {/* Matched Skills */}
          <Grid item xs={12} md={6}>
            <SkillChipGroup
              title="✅ Matched Skills"
              skills={allSkills}
              matched={visibleMatched}
              missing={[]}
              groupType="matched"
              onSkillSelect={handleSkillSelect}
              onSkillRemove={handleSkillRemove}
              onSkillAdd={handleSkillAdd}
              showScores={true}
              allowRemoval={true}
              allowSelection={true}
              emptyMessage="No matched skills found"
              color="success"
            />
          </Grid>

          {/* Missing Skills */}
          <Grid item xs={12} md={6}>
            <SkillChipGroup
              title="❌ Missing Skills"
              skills={allSkills}
              matched={[]}
              missing={visibleMissing}
              groupType="missing"
              onSkillSelect={handleSkillSelect}
              onSkillRemove={handleSkillRemove}
              onSkillAdd={handleSkillAdd}
              showScores={true}
              allowRemoval={true}
              allowSelection={true}
              emptyMessage="No missing skills found"
              color="error"
            />
          </Grid>

          {/* Selected Skill Details */}
          {selectedSkill && (
            <Grid item xs={12}>
              <Alert severity="info" onClose={() => setSelectedSkill(null)}>
                <AlertTitle>Selected Skill</AlertTitle>
                <strong>{selectedSkill.label}</strong>
                {selectedSkill.score && <span> (Score: {selectedSkill.score}%)</span>}
                {selectedSkill.category && <span> - Category: {selectedSkill.category}</span>}
                <span style={{ marginLeft: 8 }}>
                  {selectedSkill.isMatched ? '✅ Matched' : selectedSkill.isMissing ? '❌ Missing' : ''}
                </span>
              </Alert>
            </Grid>
          )}

          {/* Removed Skills */}
          {removedSkills.length > 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="subtitle2" gutterBottom>
                  🗑️ Removed Skills
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {removedSkills.map(id => {
                    const skill = allSkills.find(s => s.id === id);
                    return skill ? (
                      <Chip
                        key={id}
                        label={skill.label}
                        size="small"
                        variant="outlined"
                        onDelete={() => handleSkillAdd(skill)}
                      />
                    ) : null;
                  })}
                </Box>
              </Paper>
            </Grid>
          )}

          {/* Keyboard Shortcuts */}
          <Grid item xs={12}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: '#f8f9fa',
                borderStyle: 'dashed'
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                ⌨️ Keyboard Shortcuts
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={2}>
                <Chip label="← → / ↑ ↓" size="small" variant="outlined" />
                <Chip label="Enter: Select" size="small" variant="outlined" />
                <Chip label="Delete: Remove" size="small" variant="outlined" />
                <Chip label="Escape: Exit" size="small" variant="outlined" />
                <Chip label="Home: First" size="small" variant="outlined" />
                <Chip label="End: Last" size="small" variant="outlined" />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </SkillChipNavigatorProvider>
  );
};

export default SkillAnalysisPage;