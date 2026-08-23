import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WhatsNewModal } from './WhatsNewModal';
import { WhatsNewVersionState, LATEST_RELEASE_HIGHLIGHTS } from './WhatsNewModel';

describe('WhatsNewModal & WhatsNewVersionState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('WhatsNewVersionState', () => {
    it('should return shouldShowModal = true when version is not in localStorage', () => {
      expect(WhatsNewVersionState.shouldShowModal()).toBe(true);
    });

    it('should return shouldShowModal = false after marking current version as seen', () => {
      WhatsNewVersionState.markCurrentVersionSeen('2.5.0');
      expect(WhatsNewVersionState.shouldShowModal('2.5.0')).toBe(false);
      expect(localStorage.getItem('whats_new_last_seen_version')).toBe('2.5.0');
    });
  });

  describe('WhatsNewModal Component', () => {
    it('should not render when isOpen is false', () => {
      render(<WhatsNewModal isOpen={false} onClose={() => {}} />);
      expect(screen.queryByText(/What's New in AI Resume Analyzer/i)).toBeNull();
    });

    it('should render release highlights when isOpen is true', () => {
      render(<WhatsNewModal isOpen={true} onClose={() => {}} />);
      expect(screen.getByText(/What's New in AI Resume Analyzer/i)).toBeDefined();
      expect(screen.getByText(LATEST_RELEASE_HIGHLIGHTS.badge)).toBeDefined();
      expect(screen.getByText(/Got It, Let's Go!/i)).toBeDefined();
    });

    it('should dismiss modal and mark version seen when clicking Got It button', () => {
      const handleClose = vi.fn();
      render(<WhatsNewModal isOpen={true} onClose={handleClose} />);

      const button = screen.getByText(/Got It, Let's Go!/i);
      fireEvent.click(button);

      expect(handleClose).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('whats_new_last_seen_version')).toBe(LATEST_RELEASE_HIGHLIGHTS.version);
    });

    it('should dismiss modal when pressing Escape key', () => {
      const handleClose = vi.fn();
      render(<WhatsNewModal isOpen={true} onClose={handleClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(handleClose).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('whats_new_last_seen_version')).toBe(LATEST_RELEASE_HIGHLIGHTS.version);
    });
  });
});
