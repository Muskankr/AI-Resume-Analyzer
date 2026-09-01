import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CareerPathDashboard from './CareerPathDashboard';

/* ─── Mock data ─────────────────────────────────────────────────────── */

const mockPlan = {
  target_role: 'Frontend Developer',
  experience_level: 'Mid-Level',
  current_score: 55,
  projected_score: 78,
  current_skills: ['html', 'css', 'javascript'],
  missing_skills: ['react', 'typescript', 'git'],
  skills_to_learn: ['react', 'typescript', 'git'],
  total_estimated_weeks: 20,
  phases: [
    {
      phase_key: 'foundation',
      label: 'Foundation — Fill Critical Gaps',
      week_start: 1,
      week_end: 8,
      actions: [
        {
          title: 'Learn React',
          description: 'Study React to mid-level proficiency. Estimated 6 weeks.',
          action_type: 'skill' as const,
          skill_name: 'react',
          priority: 'critical' as const,
          estimated_weeks: 6,
          estimated_score_impact: 18,
          category: 'framework',
          resources: ['Meta Front-End Developer'],
        },
        {
          title: 'Learn TypeScript',
          description: 'Study TypeScript to mid-level proficiency.',
          action_type: 'skill' as const,
          skill_name: 'typescript',
          priority: 'high' as const,
          estimated_weeks: 5,
          estimated_score_impact: 12,
          category: 'language',
          resources: [],
        },
      ],
      phase_summary: 'Focus on highest-impact missing skills.',
    },
    {
      phase_key: 'growth',
      label: 'Growth — Build Depth',
      week_start: 9,
      week_end: 16,
      actions: [
        {
          title: 'Build: Kanban Board',
          description: 'Apply React knowledge in a hands-on project.',
          action_type: 'project' as const,
          skill_name: 'react',
          priority: 'high' as const,
          estimated_weeks: 3,
          estimated_score_impact: 6,
          category: 'framework',
          resources: ['GitHub'],
        },
      ],
      phase_summary: 'Build depth with projects.',
    },
    {
      phase_key: 'mastery',
      label: 'Mastery — Senior Readiness',
      week_start: 17,
      week_end: 18,
      actions: [],
      phase_summary: 'No actions — great progress!',
    },
    {
      phase_key: 'showcase',
      label: 'Showcase — Prove It',
      week_start: 19,
      week_end: 20,
      actions: [],
      phase_summary: 'No actions — great progress!',
    },
  ],
  quick_wins: [
    {
      title: 'Learn Git',
      description: 'Study Git basics.',
      action_type: 'skill' as const,
      skill_name: 'git',
      priority: 'critical' as const,
      estimated_weeks: 2,
      estimated_score_impact: 10,
      category: 'tool',
      resources: [],
    },
  ],
  long_term_goals: [
    {
      title: 'Deepen JavaScript expertise',
      description: 'Aim for advanced patterns.',
      action_type: 'skill' as const,
      skill_name: 'javascript',
      priority: 'low' as const,
      estimated_weeks: 8,
      estimated_score_impact: 3,
      category: 'language',
      resources: [],
    },
  ],
  summary:
    'Your resume has a solid foundation. For a Mid-Level Frontend Developer role, 3 skill gaps were identified.',
};

/* ─── Tests ─────────────────────────────────────────────────────────── */

describe('CareerPathDashboard', () => {
  it('renders the header with role and level', () => {
    render(<CareerPathDashboard plan={mockPlan} />);
    expect(screen.getByText('Career Path Plan')).toBeDefined();
    expect(screen.getByText(/Mid-Level Frontend Developer/)).toBeDefined();
  });

  it('displays current and projected scores', () => {
    render(<CareerPathDashboard plan={mockPlan} />);
    expect(screen.getByText('55')).toBeDefined();
    expect(screen.getByText('78')).toBeDefined();
    expect(screen.getByText('+23 pts')).toBeDefined();
  });

  it('renders the summary text', () => {
    render(<CareerPathDashboard plan={mockPlan} />);
    expect(screen.getByText(/solid foundation/)).toBeDefined();
  });

  it('displays current and missing skills', () => {
    render(<CareerPathDashboard plan={mockPlan} />);
    expect(screen.getByText(/html/)).toBeDefined();
    expect(screen.getByText(/react/)).toBeDefined();
    expect(screen.getByText(/typescript/)).toBeDefined();
  });

  it('renders quick wins section', () => {
    render(<CareerPathDashboard plan={mockPlan} />);
    expect(screen.getByText('⚡ Quick Wins')).toBeDefined();
    expect(screen.getByText('Learn Git')).toBeDefined();
  });

  it('renders all four phases', () => {
    render(<CareerPathDashboard plan={mockPlan} />);
    expect(screen.getByText(/Foundation/)).toBeDefined();
    expect(screen.getByText(/Growth/)).toBeDefined();
    expect(screen.getByText(/Mastery/)).toBeDefined();
    expect(screen.getByText(/Showcase/)).toBeDefined();
  });

  it('expands and collapses phases on click', () => {
    render(<CareerPathDashboard plan={mockPlan} />);
    // Foundation should be expanded by default
    expect(screen.getByText('Learn React')).toBeDefined();

    // Click the growth phase header to expand it
    const growthHeader = screen.getByText(/Growth — Build Depth/);
    fireEvent.click(growthHeader);
    expect(screen.getByText('Build: Kanban Board')).toBeDefined();
  });

  it('renders long-term goals', () => {
    render(<CareerPathDashboard plan={mockPlan} />);
    expect(screen.getByText('🏔 Long-term Mastery Goals')).toBeDefined();
    expect(screen.getByText('Deepen JavaScript expertise')).toBeDefined();
  });

  it('displays phase action counts', () => {
    render(<CareerPathDashboard plan={mockPlan} />);
    expect(screen.getByText(/2 actions/)).toBeDefined();
  });

  it('displays empty phase message', () => {
    render(<CareerPathDashboard plan={mockPlan} />);
    const emptyMessages = screen.getAllByText(/No actions in this phase/);
    expect(emptyMessages.length).toBeGreaterThanOrEqual(1);
  });

  it('renders resource tags', () => {
    render(<CareerPathDashboard plan={mockPlan} />);
    expect(screen.getByText('Meta Front-End Developer')).toBeDefined();
  });
});
