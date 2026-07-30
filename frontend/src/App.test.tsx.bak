import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Footer } from './Footer';
import { AtsScore } from './AtsScore';
import { StepProgress } from './components/StepProgress';
import { SkillChip } from './components/SkillChip';
import EmptyState from './components/EmptyState';

describe('Frontend Component Tests', () => {
  it('renders Footer component correctly', () => {
    render(<Footer />);
    expect(screen.getByText(/AI Resume Analyzer/i)).toBeInTheDocument();
    expect(screen.getByText(/Navigation/i)).toBeInTheDocument();
    expect(screen.getByText(/Repository Details/i)).toBeInTheDocument();
  });

  it('renders AtsScore component with high score styling', () => {
    render(<AtsScore score={85} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText(/Excellent Match/i)).toBeInTheDocument();
  });

  it('renders StepProgress component with current step', () => {
    render(<StepProgress currentStep={2} isAnalyzing={false} isComplete={false} />);
    expect(screen.getByText(/Select Career Track/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload Resume/i)).toBeInTheDocument();
  });

  it('renders SkillChip component correctly', () => {
    render(<SkillChip name="Python" type="matched" />);
    expect(screen.getByText('Python')).toBeInTheDocument();
  });

  it('renders EmptyState component with action button', () => {
    render(<EmptyState onReset={() => {}} />);
    expect(screen.getByText(/No Resume Analyzed Yet/i)).toBeInTheDocument();
  });
});
