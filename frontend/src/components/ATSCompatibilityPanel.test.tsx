import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ATSCompatibilityPanel from './ATSCompatibilityPanel';

const mockResult = {
  overall_score: 78,
  grade: 'B+',
  checks: [
    { check_name: 'Section Headers', category: 'structure', status: 'pass' as const, score: 90, message: 'All core sections found.', suggestion: 'Looks good.' },
    { check_name: 'Contact Information', category: 'structure', status: 'pass' as const, score: 85, message: 'Email and phone found.', suggestion: 'Contact info is good.' },
    { check_name: 'Date Formats', category: 'formatting', status: 'warning' as const, score: 60, message: 'Mixed date formats.', suggestion: 'Standardise dates.' },
    { check_name: 'Character Encoding', category: 'encoding', status: 'pass' as const, score: 100, message: 'Clean text.', suggestion: 'No issues.' },
    { check_name: 'Keyword Placement', category: 'keywords', status: 'warning' as const, score: 55, message: 'Keywords not in top quarter.', suggestion: 'Move skills higher.' },
    { check_name: 'Layout Compatibility', category: 'formatting', status: 'pass' as const, score: 95, message: 'Single column detected.', suggestion: 'Good layout.' },
    { check_name: 'Resume Length', category: 'content', status: 'pass' as const, score: 85, message: 'Good length.', suggestion: 'Optimal range.' },
    { check_name: 'Education Section', category: 'structure', status: 'pass' as const, score: 80, message: 'Education found.', suggestion: 'Looks good.' },
    { check_name: 'Skills Section', category: 'structure', status: 'pass' as const, score: 90, message: 'Skills section found.', suggestion: 'Good structure.' },
    { check_name: 'Text Purity', category: 'encoding', status: 'pass' as const, score: 95, message: 'Clean extraction.', suggestion: 'No issues.' },
  ],
  category_scores: { structure: 86, formatting: 78, keywords: 55, encoding: 98, content: 85 },
  estimated_ats_pass_rate: 75,
  top_fixes: [
    { check_name: 'Keyword Placement', category: 'keywords', status: 'warning' as const, score: 55, message: 'Keywords not early enough.', suggestion: 'Move skills higher.' },
    { check_name: 'Date Formats', category: 'formatting', status: 'warning' as const, score: 60, message: 'Mixed formats.', suggestion: 'Standardise.' },
  ],
  summary: 'Good ATS compatibility with minor issues. Grade: B+ (78/100).',
};

describe('ATSCompatibilityPanel', () => {
  it('renders the title', () => {
    render(<ATSCompatibilityPanel result={mockResult} />);
    expect(screen.getByText('ATS Compatibility Check')).toBeDefined();
  });

  it('displays the overall score and grade', () => {
    render(<ATSCompatibilityPanel result={mockResult} />);
    expect(screen.getByText('78')).toBeDefined();
    expect(screen.getByText('B+')).toBeDefined();
  });

  it('shows pass rate', () => {
    render(<ATSCompatibilityPanel result={mockResult} />);
    expect(screen.getByText('75%')).toBeDefined();
  });

  it('shows category scores', () => {
    render(<ATSCompatibilityPanel result={mockResult} />);
    expect(screen.getByText('Category Scores')).toBeDefined();
    expect(screen.getByText('structure')).toBeDefined();
  });

  it('renders top fixes', () => {
    render(<ATSCompatibilityPanel result={mockResult} />);
    expect(screen.getByText('Top Fixes')).toBeDefined();
    expect(screen.getByText('Keyword Placement')).toBeDefined();
  });

  it('shows filter buttons', () => {
    render(<ATSCompatibilityPanel result={mockResult} />);
    expect(screen.getByText(/Failed \(0\)/)).toBeDefined();
    expect(screen.getByText(/Warnings \(2\)/)).toBeDefined();
    expect(screen.getByText(/Passed \(8\)/)).toBeDefined();
  });

  it('filters by warnings', () => {
    render(<ATSCompatibilityPanel result={mockResult} />);
    fireEvent.click(screen.getByText(/Warnings/));
    expect(screen.getByText('Date Formats')).toBeDefined();
    expect(screen.getByText('Keyword Placement')).toBeDefined();
  });

  it('expands a check card', () => {
    render(<ATSCompatibilityPanel result={mockResult} />);
    fireEvent.click(screen.getByText('Section Headers'));
    expect(screen.getByText('All core sections found.')).toBeDefined();
  });

  it('shows counts', () => {
    render(<ATSCompatibilityPanel result={mockResult} />);
    expect(screen.getByText(/✅ 8 passed/)).toBeDefined();
    expect(screen.getByText(/⚠️ 2 warnings/)).toBeDefined();
  });
});
