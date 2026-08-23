/**
 * Unit Tests for Whats New Telemetry Logger
 */

import { describe, it, expect } from 'vitest';
import { WhatsNewTelemetryLogger } from './WhatsNewTelemetryLogger';

describe('WhatsNewTelemetryLogger Tests', () => {
  it('should generate telemetry log event correctly', () => {
    const event = WhatsNewTelemetryLogger.logTelemetry('WHATS_NEW_MODAL_SHOWN', '2.5.0');
    expect(event.eventName).toBe('WHATS_NEW_MODAL_SHOWN');
    expect(event.version).toBe('2.5.0');
  });
});
