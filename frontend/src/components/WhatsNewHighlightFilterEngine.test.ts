/**
 * Unit Tests for Whats New Highlight Filter Engine
 */

import { describe, it, expect } from 'vitest';
import { WhatsNewHighlightFilterEngine } from './WhatsNewHighlightFilterEngine';

describe('WhatsNewHighlightFilterEngine Tests', () => {
  it('should filter features by search query', () => {
    const results = WhatsNewHighlightFilterEngine.filterFeatures('Roast');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toContain('Roast');
  });
});
