import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ScoreHistoryDashboard from './ScoreHistoryDashboard';

const mockData = {
  timeline: [
    { analysis_id: 1, score: 45, target_role: 'Frontend Developer', created_at: '2026-07-01T10:00:00Z', skills_count: 5, matched_count: 3, missing_count: 4, file_name: 'resume_v1.pdf' },
    { analysis_id: 2, score: 62, target_role: 'Frontend Developer', created_at: '2026-07-15T10:00:00Z', skills_count: 7, matched_count: 5, missing_count: 2, file_name: 'resume_v2.pdf' },
    { analysis_id: 3, score: 75, target_role: 'Full Stack Developer', created_at: '2026-08-01T10:00:00Z', skills_count: 9, matched_count: 7, missing_count: 1, file_name: 'resume_v3.pdf' },
  ],
  trend_stats: { current_score: 75, highest_score: 75, lowest_score: 45, average_score: 60.7, median_score: 62, total_analyses: 3, score_range: 30, std_deviation: 15.0 },
  improvement_metrics: { total_improvement: 30, average_improvement_per_analysis: 15, improvement_rate_percent: 66.7, analyses_with_improvement: 2, analyses_with_decline: 0, analyses_unchanged: 0, best_single_jump: 17, improvement_streak: 2, longest_streak: 2 },
  skill_progression: { total_unique_skills: 9, consistently_matched: ['html', 'css'], newly_acquired: ['react', 'typescript'], lost_skills: [], skill_frequency: { html: 3, css: 3, react: 2 }, skill_trend: [] },
  monthly_data: [{ month: '2026-07', analysis_count: 2, average_score: 53.5, highest_score: 62, lowest_score: 45, score_delta: 53.5 }, { month: '2026-08', analysis_count: 1, average_score: 75, highest_score: 75, lowest_score: 75, score_delta: 21.5 }],
  role_performance: [{ role: 'Frontend Developer', analysis_count: 2, average_score: 53.5, highest_score: 62, lowest_score: 45, most_common_matched: ['html'], most_common_missing: ['react'] }],
  moving_average: [45, 53.5, 60.7],
  summary: "You've improved by 30 points across 3 analyses.",
};

describe('ScoreHistoryDashboard', () => {
  it('renders the title', () => {
    render(<ScoreHistoryDashboard data={mockData} />);
    expect(screen.getByText('Score History & Trends')).toBeDefined();
  });

  it('displays key stats', () => {
    render(<ScoreHistoryDashboard data={mockData} />);
    expect(screen.getByText('75')).toBeDefined();
    expect(screen.getByText('60.7')).toBeDefined();
  });

  it('shows improvement metrics', () => {
    render(<ScoreHistoryDashboard data={mockData} />);
    expect(screen.getByText('+30')).toBeDefined();
  });

  it('renders tabs', () => {
    render(<ScoreHistoryDashboard data={mockData} />);
    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('Skills')).toBeDefined();
    expect(screen.getByText('Roles')).toBeDefined();
  });

  it('switches to skills tab', () => {
    render(<ScoreHistoryDashboard data={mockData} />);
    fireEvent.click(screen.getByText('Skills'));
    expect(screen.getByText('Skill Progression')).toBeDefined();
    expect(screen.getByText('react')).toBeDefined();
  });

  it('switches to roles tab', () => {
    render(<ScoreHistoryDashboard data={mockData} />);
    fireEvent.click(screen.getByText('Roles'));
    expect(screen.getByText('Performance by Role')).toBeDefined();
    expect(screen.getByText('Frontend Developer')).toBeDefined();
  });

  it('shows empty state', () => {
    const emptyData = { ...mockData, timeline: [], moving_average: [] };
    render(<ScoreHistoryDashboard data={emptyData} />);
    expect(screen.getByText('No analysis history yet.')).toBeDefined();
  });

  it('displays monthly data', () => {
    render(<ScoreHistoryDashboard data={mockData} />);
    expect(screen.getByText('2026-07')).toBeDefined();
    expect(screen.getByText('2026-08')).toBeDefined();
  });

  it('displays recent analyses', () => {
    render(<ScoreHistoryDashboard data={mockData} />);
    expect(screen.getByText('resume_v3.pdf')).toBeDefined();
  });

  it('shows newly acquired skills', () => {
    render(<ScoreHistoryDashboard data={mockData} />);
    fireEvent.click(screen.getByText('Skills'));
    expect(screen.getByText('Newly Acquired')).toBeDefined();
    expect(screen.getByText('typescript')).toBeDefined();
  });
});
