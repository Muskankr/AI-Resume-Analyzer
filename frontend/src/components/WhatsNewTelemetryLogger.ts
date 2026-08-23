/**
 * Whats New Analytics Telemetry Extensions
 */

export interface WhatsNewTelemetryEvent {
  eventName: 'WHATS_NEW_MODAL_SHOWN' | 'WHATS_NEW_MODAL_DISMISSED' | 'WHATS_NEW_LINK_CLICKED';
  version: string;
  timestamp: string;
}

export class WhatsNewTelemetryLogger {
  public static logTelemetry(eventName: WhatsNewTelemetryEvent['eventName'], version: string): WhatsNewTelemetryEvent {
    return {
      eventName,
      version,
      timestamp: new Date().toISOString()
    };
  }
}
