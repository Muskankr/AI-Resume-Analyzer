import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AchievementQuantifierPanel from './AchievementQuantifierPanel';

const mockResult = {
  total_bullets: 4,
  quantified_bullets: 1,
  unquantified_bullets: 3,
  quantification_rate: 25.0,
  overall_impact_score: 45,
  bullet_analyses: [
    {
      original_text: '- Responsible for managing the team',
      line_number: 1,
      detected_verb: 'responsible for',
      detected_category: null,
      is_quantified: false,
      suggestions: [
        { template: 'Led a team of [X] engineers', example: 'Led a team of 8 engineers across 3 projects', category: 'team_size', confidence: 0.8 },
      ],
      priority: 'high',
      estimated_impact: 8,
    },
    {
      original_text: '- Increased revenue by 25%',
      line_number: 2,
      detected_verb: 'increased',
      detected_category: 'revenue',
      is_quantified: true,
      suggestions: [],
      priority: 'low',
      estimated_impact: 2,
    },
    {
      original_text: '- Built a dashboard for analytics',
      line_number: 3,
      detected_verb: 'built',
      detected_category: 'systems',
      is_quantified: false,
      suggestions: [
        { template: 'Built dashboard serving [X]K users', example: 'Built dashboard serving 50K users daily', category: 'systems', confidence: 0.7 },
      ],
      priority: 'high',
      estimated_impact: 7,
    },
    {
      original_text: '- Led the migration to microservices',
      line_number: 4,
      detected_verb: 'led',
      detected_category: 'team_size',
      is_quantified: false,
      suggestions: [],
      priority: 'high',
      estimated_impact: 7,
    },
  ],
  top_quick_wins: [
    {
      original_text: '- Responsible for managing the team',
      line_number: 1,
      detected_verb: 'responsible for',
      detected_category: null,
      is_quantified: false,
      suggestions: [
        { template: 'Led a team of [X] engineers', example: 'Led a team of 8 engineers', category: 'team_size', confidence: 0.8 },
      ],
      priority: 'high',
      estimated_impact: 8,
    },
  ],
  category_coverage: { revenue: 1, systems: 1, team_size: 1 },
  summary: 'Only 25% of bullets are quantified. Add metrics to improve impact.',
};

describe('AchievementQuantifierPanel', () => {
  it('renders the title', () => {
    render(<AchievementQuantifierPanel result={mockResult} />);
    expect(screen.getByText('Achievement Quantifier')).toBeDefined();
  });

  it('displays the quantification rate', () => {
    render(<AchievementQuantifierPanel result={mockResult} />);
    expect(screen.getByText('25%')).toBeDefined();
  });

  it('shows metrics', () => {
    render(<AchievementQuantifierPanel result={mockResult} />);
    expect(screen.getByText('4')).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
  });

  it('renders quick wins section', () => {
    render(<AchievementQuantifierPanel result={mockResult} />);
    expect(screen.getByText(/Top Quick Wins/)).toBeDefined();
  });

  it('shows filter buttons', () => {
    render(<AchievementQuantifierPanel result={mockResult} />);
    expect(screen.getByText(/All \(4\)/)).toBeDefined();
    expect(screen.getByText(/Need Metrics \(3\)/)).toBeDefined();
    expect(screen.getByText(/Quantified \(1\)/)).toBeDefined();
  });

  it('filters to unquantified', () => {
    render(<AchievementQuantifierPanel result={mockResult} />);
    fireEvent.click(screen.getByText(/Need Metrics/));
    expect(screen.getByText(/Responsible for managing/)).toBeDefined();
    expect(screen.queryByText(/Increased revenue by 25%/)).toBeNull();
  });

  it('expands bullet to show suggestions', () => {
    render(<AchievementQuantifierPanel result={mockResult} />);
    const bullet = screen.getByText(/Responsible for managing/);
    fireEvent.click(bullet);
    expect(screen.getByText(/Suggested Metrics/)).toBeDefined();
    expect(screen.getByText(/Led a team of \[X\] engineers/)).toBeDefined();
  });

  it('shows category chips', () => {
    render(<AchievementQuantifierPanel result={mockResult} />);
    expect(screen.getByText(/Revenue/)).toBeDefined();
    expect(screen.getByText(/Systems/)).toBeDefined();
  });
});
