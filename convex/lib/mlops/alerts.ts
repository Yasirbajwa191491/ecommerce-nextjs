export type AlertSeverity = "normal" | "warning" | "critical" | "insufficient_data";
export type AlertAction =
  | "open"
  | "duplicate"
  | "cooldown"
  | "awaiting_confirmation"
  | "none"
  | "resolve";

export function alertFingerprint(
  family: string,
  feature: string,
  metric: string,
  severity: AlertSeverity
): string {
  return `${family}:${feature}:${metric}:${severity}`;
}

export function alertDecision(input: {
  family: string;
  feature: string;
  metric: string;
  severity: AlertSeverity;
  openFingerprints: string[];
  acknowledgedFingerprints: string[];
  consecutiveHits: number;
  requiredHits?: number;
}): { action: AlertAction; fingerprint: string } {
  const required = input.requiredHits ?? 2;
  const fingerprint = alertFingerprint(input.family, input.feature, input.metric, input.severity);
  if (input.severity === "normal") return { action: "resolve", fingerprint };
  if (input.severity === "insufficient_data") return { action: "none", fingerprint };
  if (input.consecutiveHits < required) return { action: "awaiting_confirmation", fingerprint };
  if (input.openFingerprints.includes(fingerprint)) return { action: "duplicate", fingerprint };
  if (input.acknowledgedFingerprints.includes(fingerprint)) return { action: "cooldown", fingerprint };
  return { action: "open", fingerprint };
}
