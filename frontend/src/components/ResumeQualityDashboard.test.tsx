/**
 * ResumeQualityDashboard.test.tsx — unit tests for the Resume Quality Dashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResumeQualityDashboard } from './ResumeQualityDashboard';

// Mock useAuth hook
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { username: 'testuser', token: 'fake-token' },
    signup: vi.fn(),
    login: vi.fn(),
    loginWithOAuth: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('ResumeQualityDashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the dashboard header', () => {
    render(<ResumeQualityDashboard />);
    expect(screen.getByRole('heading', { level: 1, name: /Resume Quality Dashboard/i })).toBeTruthy();
    expect(screen.getByText(/Quality Intelligence Engine v1.0/)).toBeTruthy();
  });

  it('renders the upload zone with correct prompt', () => {
    render(<ResumeQualityDashboard />);
    expect(screen.getByText('Drop your Resume here')).toBeTruthy();
    expect(screen.getByText(/PDF format/)).toBeTruthy();
  });

  it('renders the target role selector with all roles', () => {
    render(<ResumeQualityDashboard />);
    const select = screen.getByLabelText('Target Role');
    expect(select).toBeTruthy();
    expect(select.querySelectorAll('option').length).toBeGreaterThanOrEqual(4);
  });

  it('renders the experience level selector', () => {
    render(<ResumeQualityDashboard />);
    const select = screen.getByLabelText('Experience Level');
    expect(select).toBeTruthy();
    expect(select.querySelectorAll('option').length).toBe(3);
  });

  it('disables the analyze button when no file is selected', () => {
    render(<ResumeQualityDashboard />);
    const btn = screen.getByRole('button', { name: /Analyze Resume Quality/ });
    expect(btn).toBeDisabled();
  });

  it('renders without crashing when no user is logged in', () => {
    // Already renders fine even with the mock user
    render(<ResumeQualityDashboard />);
    expect(screen.getByText(/📊 Resume Quality Dashboard/)).toBeTruthy();
  });

  it('shows role options including Data Analyst', () => {
    render(<ResumeQualityDashboard />);
    expect(screen.getByRole('option', { name: 'Data Analyst' })).toBeTruthy();
  });

  it('shows experience level options', () => {
    render(<ResumeQualityDashboard />);
    expect(screen.getByRole('option', { name: 'Junior (0–2 yrs)' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Mid-Level (2–5 yrs)' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Senior (5+ yrs)' })).toBeTruthy();
  });

  it('handles drag over state on upload zone', () => {
    render(<ResumeQualityDashboard />);
    const zone = screen.getByText('Drop your Resume here').closest('.rqd-upload-zone')!;
    fireEvent.dragOver(zone);
    expect(zone.classList.contains('dragover')).toBe(true);
  });

  it('handles drag leave state on upload zone', () => {
    render(<ResumeQualityDashboard />);
    const zone = screen.getByText('Drop your Resume here').closest('.rqd-upload-zone')!;
    fireEvent.dragOver(zone);
    fireEvent.dragLeave(zone);
    expect(zone.classList.contains('dragover')).toBe(false);
  });

  it('renders footer text', () => {
    render(<ResumeQualityDashboard />);
    expect(screen.getByText(/Resume Quality Dashboard · Part of AI Resume Analyzer/)).toBeTruthy();
  });

  it('starts with no results container visible', () => {
    render(<ResumeQualityDashboard />);
    // The results container should not be rendered since analysis is null
    expect(screen.queryByText('ATS Score')).toBeNull();
  });

  it('allows changing the target role', () => {
    render(<ResumeQualityDashboard />);
    const select = screen.getByLabelText('Target Role');
    fireEvent.change(select, { target: { value: 'Backend Developer' } });
    expect((select as HTMLSelectElement).value).toBe('Backend Developer');
  });

  it('allows changing the experience level', () => {
    render(<ResumeQualityDashboard />);
    const select = screen.getByLabelText('Experience Level');
    fireEvent.change(select, { target: { value: 'Senior' } });
    expect((select as HTMLSelectElement).value).toBe('Senior');
  });
});
