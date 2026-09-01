// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ExperienceLevelSelector } from './ExperienceLevelSelector';
import type { ExperienceLevel } from '../utils/experienceParser';

describe('ExperienceLevelSelector Component', () => {
  it('renders experience level buttons', () => {
    const onSelectLevel = vi.fn();
    render(
      <ExperienceLevelSelector
        selectedLevel="Mid"
        onSelectLevel={onSelectLevel}
        autoDetectedSuggestion={null}
      />
    );

    expect(screen.getByText('Target Experience Level')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Junior' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mid' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Senior' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lead' })).toBeInTheDocument();
  });

  it('triggers onSelectLevel callback when a level button is clicked', () => {
    const onSelectLevel = vi.fn();
    render(
      <ExperienceLevelSelector
        selectedLevel="Mid"
        onSelectLevel={onSelectLevel}
        autoDetectedSuggestion={null}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Senior' }));
    expect(onSelectLevel).toHaveBeenCalledWith('Senior');
  });

  it('displays suggestion banner when a new suggestion is available', () => {
    const onSelectLevel = vi.fn();
    const mockSuggestion = {
      estimatedYears: 5.5,
      suggestedLevel: 'Senior' as ExperienceLevel,
    };

    render(
      <ExperienceLevelSelector
        selectedLevel="Mid"
        onSelectLevel={onSelectLevel}
        autoDetectedSuggestion={mockSuggestion}
      />
    );

    expect(screen.getByText('We detected history metrics!')).toBeInTheDocument();
    expect(screen.getByText(/reveals approximately/i)).toBeInTheDocument();
    expect(screen.getByText('5.5 years')).toBeInTheDocument();
    expect(screen.getAllByText('Senior').length).toBe(2);

    const acceptButton = screen.getByRole('button', { name: 'Accept Suggestion' });
    expect(acceptButton).toBeInTheDocument();

    fireEvent.click(acceptButton);
    expect(onSelectLevel).toHaveBeenCalledWith('Senior');
  });

  it('does not display suggestion banner if suggestion matches current selection', () => {
    const onSelectLevel = vi.fn();
    const mockSuggestion = {
      estimatedYears: 5.5,
      suggestedLevel: 'Senior' as ExperienceLevel,
    };

    render(
      <ExperienceLevelSelector
        selectedLevel="Senior"
        onSelectLevel={onSelectLevel}
        autoDetectedSuggestion={mockSuggestion}
      />
    );

    expect(screen.queryByText('We detected history metrics!')).not.toBeInTheDocument();
  });

  it('hides suggestion banner after manual interaction', () => {
    const onSelectLevel = vi.fn();
    const mockSuggestion = {
      estimatedYears: 5.5,
      suggestedLevel: 'Senior' as ExperienceLevel,
    };

    const { rerender } = render(
      <ExperienceLevelSelector
        selectedLevel="Mid"
        onSelectLevel={onSelectLevel}
        autoDetectedSuggestion={mockSuggestion}
      />
    );

    expect(screen.getByText('We detected history metrics!')).toBeInTheDocument();

    // Click Junior manually
    fireEvent.click(screen.getByRole('button', { name: 'Junior' }));
    expect(onSelectLevel).toHaveBeenCalledWith('Junior');

    // Rerender with new selection
    rerender(
      <ExperienceLevelSelector
        selectedLevel="Junior"
        onSelectLevel={onSelectLevel}
        autoDetectedSuggestion={mockSuggestion}
      />
    );

    expect(screen.queryByText('We detected history metrics!')).not.toBeInTheDocument();
  });
});
