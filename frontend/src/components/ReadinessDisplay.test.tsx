// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ReadinessDisplay } from './ReadinessDisplay';
import type { ReadinessReport } from '../utils/readinessEngine';

describe('ReadinessDisplay Component', () => {
  const mockReport: ReadinessReport = {
    score: 85,
    label: 'Excellent Fit',
    formulaApplied: 'Full-Context Matrix (40% JD Fit, 35% Domain Track, 25% Timeline Seniority)',
    diagnosticFeedback: 'This holistic score evaluates your competitive standing against the specific Job Description requirements.',
  };

  it('renders readiness score, label, formula applied, and raw ATS score', () => {
    render(<ReadinessDisplay report={mockReport} atsScore={75} />);

    expect(screen.getByText('Holistic Readiness Summary')).toBeInTheDocument();
    expect(screen.getByText('Full-Context Matrix (40% JD Fit, 35% Domain Track, 25% Timeline Seniority)')).toBeInTheDocument();
    expect(screen.getByText('Excellent Fit')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Raw ATS Keyword Fit')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText(/How is this different from the ATS score/i)).toBeInTheDocument();
    expect(screen.getByText(mockReport.diagnosticFeedback)).toBeInTheDocument();
  });

  it('adjusts semantic label class styling based on the fit value', () => {
    const strongReport: ReadinessReport = {
      ...mockReport,
      score: 72,
      label: 'Strong Fit',
    };

    const { rerender } = render(<ReadinessDisplay report={strongReport} atsScore={60} />);
    expect(screen.getByText('Strong Fit')).toHaveClass('bg-blue-100');

    const developingReport: ReadinessReport = {
      ...mockReport,
      score: 42,
      label: 'Developing Fit',
    };

    rerender(<ReadinessDisplay report={developingReport} atsScore={40} />);
    expect(screen.getByText('Developing Fit')).toHaveClass('bg-amber-100');
  });
});
