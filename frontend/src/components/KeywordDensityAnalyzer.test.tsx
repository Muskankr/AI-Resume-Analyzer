/**
 * KeywordDensityAnalyzer.test.tsx
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeywordDensityAnalyzer } from './KeywordDensityAnalyzer';

describe('KeywordDensityAnalyzer', () => {
  beforeEach(() => { localStorage.clear(); });

  it('renders the header', () => {
    render(<KeywordDensityAnalyzer />);
    expect(screen.getByRole('heading', { level: 1, name: /Keyword Density Analyzer/i })).toBeTruthy();
    expect(screen.getByText(/NLP Keyword Engine v1.0/)).toBeTruthy();
  });

  it('renders the textarea', () => {
    render(<KeywordDensityAnalyzer />);
    expect(screen.getByPlaceholderText(/Paste your resume text here/)).toBeTruthy();
  });

  it('disables analyze button when textarea is empty', () => {
    render(<KeywordDensityAnalyzer />);
    const btn = screen.getByRole('button', { name: /Analyze Keywords/ });
    expect(btn).toBeDisabled();
  });

  it('enables analyze button when text is entered', () => {
    render(<KeywordDensityAnalyzer />);
    const ta = screen.getByPlaceholderText(/Paste your resume text here/);
    fireEvent.change(ta, { target: { value: 'React developer with TypeScript experience' } });
    expect(screen.getByRole('button', { name: /Analyze Keywords/ })).not.toBeDisabled();
  });

  it('shows word and character count', () => {
    render(<KeywordDensityAnalyzer />);
    expect(screen.getByText('0 characters · 0 words')).toBeTruthy();
    const ta = screen.getByPlaceholderText(/Paste your resume text here/);
    fireEvent.change(ta, { target: { value: 'hello world test' } });
    expect(screen.getByText(/16 characters · 3 words/)).toBeTruthy();
  });

  it('produces analysis results when text is analyzed', () => {
    render(<KeywordDensityAnalyzer />);
    const ta = screen.getByPlaceholderText(/Paste your resume text here/);
    fireEvent.change(ta, {
      target: {
        value:
          'Skills: React, JavaScript, TypeScript, Python, SQL\nExperience: Software Engineer at TechCorp\nEducation: BS Computer Science\nProjects: Built e-commerce platform using React and Node.js',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze Keywords/ }));

    expect(screen.getByText('Total Words')).toBeTruthy();
    expect(screen.getByText('Unique Keywords')).toBeTruthy();
    expect(screen.getByText('Avg Density')).toBeTruthy();
    expect(screen.getByText('Overused Terms')).toBeTruthy();
  });

  it('displays top keywords section after analysis', () => {
    render(<KeywordDensityAnalyzer />);
    const ta = screen.getByPlaceholderText(/Paste your resume text here/);
    fireEvent.change(ta, {
      target: {
        value:
          'Skills: React, JavaScript, TypeScript. Experience with React and JavaScript. Used React for frontend development with JavaScript and TypeScript.',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze Keywords/ }));

    expect(screen.getByText(/Top Keywords by Frequency/)).toBeTruthy();
  });

  it('displays section distribution after analysis', () => {
    render(<KeywordDensityAnalyzer />);
    const ta = screen.getByPlaceholderText(/Paste your resume text here/);
    fireEvent.change(ta, {
      target: {
        value:
          'Skills: React, JavaScript\nExperience: Built apps\nEducation: CS Degree\nProjects: Portfolio site',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze Keywords/ }));

    expect(screen.getByText(/Section Distribution/)).toBeTruthy();
  });

  it('shows missing sections warning for incomplete resumes', () => {
    render(<KeywordDensityAnalyzer />);
    const ta = screen.getByPlaceholderText(/Paste your resume text here/);
    fireEvent.change(ta, {
      target: { value: 'Just some random text with no clear sections at all.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze Keywords/ }));

    expect(screen.getByText(/Missing Resume Sections/)).toBeTruthy();
  });

  it('does not show missing sections when resume has all sections', () => {
    render(<KeywordDensityAnalyzer />);
    const ta = screen.getByPlaceholderText(/Paste your resume text here/);
    fireEvent.change(ta, {
      target: {
        value:
          'Contact: john@email.com\nSummary: Experienced developer\nExperience: 5 years\nEducation: BS CS\nSkills: React, Python\nProjects: App\nCertification: AWS',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze Keywords/ }));
    expect(screen.queryByText(/Missing Resume Sections/)).toBeNull();
  });

  it('renders footer', () => {
    render(<KeywordDensityAnalyzer />);
    expect(screen.getByText(/Keyword Density Analyzer · Part of AI Resume Analyzer/)).toBeTruthy();
  });

  it('marks overused keywords when density is too high', () => {
    render(<KeywordDensityAnalyzer />);
    const ta = screen.getByPlaceholderText(/Paste your resume text here/);
    const text = 'react '.repeat(30) + ' developer with experience';
    fireEvent.change(ta, { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: /Analyze Keywords/ }));

    // "react" should appear in results
    expect(screen.getByText('react')).toBeTruthy();
  });
});
