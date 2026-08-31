import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ContentRewriterPanel from './ContentRewriterPanel';

/* ─── Mock data ─────────────────────────────────────────────────────── */

const mockResult = {
  total_lines_analyzed: 15,
  bullet_lines_found: 6,
  issues_found: 4,
  overall_quality_score: 65,
  suggestions: [
    {
      original_text: '- Responsible for managing the team',
      suggested_text: '- managed the team',
      issue_type: 'weak_verb' as const,
      priority: 'high' as const,
      impact_score: 7,
      explanation: "Replace 'responsible for' with 'managed'.",
      line_number: 3,
    },
    {
      original_text: '- Worked on the frontend application',
      suggested_text: '- developed the frontend application',
      issue_type: 'weak_verb' as const,
      priority: 'high' as const,
      impact_score: 7,
      explanation: "'Worked on' is vague.",
      line_number: 5,
    },
    {
      original_text: '- Various tasks completed daily',
      suggested_text: "[Replace 'various tasks' with specific details]",
      issue_type: 'filler' as const,
      priority: 'medium' as const,
      impact_score: 6,
      explanation: "'Various tasks' is vague.",
      line_number: 7,
    },
    {
      original_text: '- Built the dashboard and served users',
      suggested_text: '[Add a metric: numbers, %, $, or time saved]',
      issue_type: 'no_quantification' as const,
      priority: 'high' as const,
      impact_score: 8,
      explanation: 'This achievement bullet has no quantified metric.',
      line_number: 9,
    },
  ],
  summary: 'Moderate content quality — several areas need attention.',
  category_counts: {
    weak_verb: 2,
    filler: 1,
    no_quantification: 1,
  },
  top_priority_actions: [
    {
      original_text: '- Built the dashboard and served users',
      suggested_text: '[Add a metric]',
      issue_type: 'no_quantification' as const,
      priority: 'high' as const,
      impact_score: 8,
      explanation: 'Add metrics.',
      line_number: 9,
    },
  ],
};

/* ─── Tests ─────────────────────────────────────────────────────────── */

describe('ContentRewriterPanel', () => {
  it('renders the title and summary', () => {
    render(<ContentRewriterPanel result={mockResult} />);
    expect(screen.getByText('Content Quality Rewriter')).toBeDefined();
    expect(screen.getByText(/Moderate content quality/)).toBeDefined();
  });

  it('displays the quality score', () => {
    render(<ContentRewriterPanel result={mockResult} />);
    expect(screen.getByText('65')).toBeDefined();
  });

  it('displays metrics', () => {
    render(<ContentRewriterPanel result={mockResult} />);
    expect(screen.getByText('15')).toBeDefined();
    expect(screen.getByText('6')).toBeDefined();
    expect(screen.getByText('4')).toBeDefined();
  });

  it('renders category breakdown', () => {
    render(<ContentRewriterPanel result={mockResult} />);
    expect(screen.getByText(/Weak Verb/)).toBeDefined();
    expect(screen.getByText(/Filler Phrase/)).toBeDefined();
    expect(screen.getByText(/Missing Metric/)).toBeDefined();
  });

  it('renders top priority actions', () => {
    render(<ContentRewriterPanel result={mockResult} />);
    expect(screen.getByText('🔥 Top Priority Fixes')).toBeDefined();
  });

  it('renders filter buttons', () => {
    render(<ContentRewriterPanel result={mockResult} />);
    expect(screen.getByText(/All \(4\)/)).toBeDefined();
    expect(screen.getByText(/Weak Verb \(2\)/)).toBeDefined();
  });

  it('filters suggestions by category', () => {
    render(<ContentRewriterPanel result={mockResult} />);
    const fillerBtn = screen.getByText(/Filler Phrase \(1\)/);
    fireEvent.click(fillerBtn);
    // Should show only filler suggestions
    expect(screen.getByText(/Various tasks completed daily/)).toBeDefined();
  });

  it('renders suggestion cards with before/after diff', () => {
    render(<ContentRewriterPanel result={mockResult} />);
    expect(screen.getByText(/Responsible for managing/)).toBeDefined();
    expect(screen.getByText(/Worked on the frontend/)).toBeDefined();
  });

  it('shows empty state when no issues', () => {
    const emptyResult = {
      ...mockResult,
      issues_found: 0,
      overall_quality_score: 95,
      suggestions: [],
      top_priority_actions: [],
      category_counts: {},
      summary: 'Excellent content quality!',
    };
    render(<ContentRewriterPanel result={emptyResult} />);
    expect(screen.getByText('95')).toBeDefined();
    expect(screen.getByText('All (0)')).toBeDefined();
  });
});
