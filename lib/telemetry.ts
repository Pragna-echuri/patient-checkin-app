import { v4 as uuidv4 } from "uuid";

// ─── Structured Security Audit Logger ───────────────────────
// Every API request generates a unique traceId that tracks the
// payload through all safety layers for enterprise audibility.

export function generateTraceId(): string {
  return `trace-${uuidv4()}`;
}

interface TelemetryEvent {
  traceId: string;
  timestamp: string;
  event: string;
  context: Record<string, unknown>;
}

/**
 * Emit a structured JSON log event.
 * In production, this would pipe to a SIEM (Splunk, Datadog, etc.)
 */
export function logEvent(
  traceId: string,
  event: string,
  context: Record<string, unknown> = {}
): void {
  const entry: TelemetryEvent = {
    traceId,
    timestamp: new Date().toISOString(),
    event,
    context,
  };

  // Structured JSON output — easily parseable by log aggregators
  console.log(`[TELEMETRY] ${JSON.stringify(entry)}`);
}
