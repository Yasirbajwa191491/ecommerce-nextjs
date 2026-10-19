const SECRET_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  { pattern: /\bsk-[A-Za-z0-9_\-]{8,}\b/g, replacement: "[redacted]" },
  { pattern: /\bsk-live-[A-Za-z0-9_\-]{4,}\b/g, replacement: "[redacted]" },
  { pattern: /\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*\S+/gi, replacement: "[redacted]" },
  { pattern: /\bBearer\s+[A-Za-z0-9._\-]{8,}/gi, replacement: "Bearer [redacted]" },
];

const INJECTION_PATTERN =
  /ignore (all |any |previous |prior )?instructions|system prompt|reveal (the |your )?prompt|send (the |an |a )?email|change (the )?price|skip approval|execute tool|run shell|process\.exit|<\s*script/i;

export function redactSecrets(value: string): { text: string; redacted: boolean } {
  let text = value;
  let redacted = false;
  for (const rule of SECRET_PATTERNS) {
    const next = text.replace(rule.pattern, rule.replacement);
    if (next !== text) redacted = true;
    text = next;
  }
  return { text, redacted };
}

export function injectionDetected(value: string): boolean {
  return INJECTION_PATTERN.test(value);
}

export function boundText(value: string, maxChars: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}…`;
}

export function sanitizeUntrustedText(
  value: string,
  maxChars = 2_000
): { text: string; injectionDetected: boolean; secretsRedacted: boolean } {
  const secrets = redactSecrets(value);
  const detected = injectionDetected(secrets.text);
  const stripped = detected
    ? secrets.text.replace(INJECTION_PATTERN, "[untrusted instruction removed]")
    : secrets.text;
  return {
    text: boundText(stripped, maxChars),
    injectionDetected: detected,
    secretsRedacted: secrets.redacted,
  };
}

export function sanitizeUnknown(value: unknown, maxBytes: number): unknown {
  const walk = (input: unknown, depth: number): unknown => {
    if (depth > 6) return "[depth limited]";
    if (typeof input === "string") return sanitizeUntrustedText(input, 1_000).text;
    if (typeof input === "number" || typeof input === "boolean" || input === null) return input;
    if (Array.isArray(input)) return input.slice(0, 20).map((item) => walk(item, depth + 1));
    if (input && typeof input === "object") {
      const entries = Object.entries(input as Record<string, unknown>).slice(0, 40);
      return Object.fromEntries(entries.map(([key, item]) => [key, walk(item, depth + 1)]));
    }
    return undefined;
  };
  const cleaned = walk(value, 0);
  const encoded = JSON.stringify(cleaned) ?? "";
  if (encoded.length <= maxBytes) return cleaned;
  return {
    truncated: true,
    preview: encoded.slice(0, Math.min(maxBytes, 500)),
  };
}

export function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Tool failed";
  return sanitizeUntrustedText(message, 240).text;
}

export function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    return Object.keys(source)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortValue(source[key]);
        return acc;
      }, {});
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function stableHash(value: unknown): string {
  const json = canonicalJson(value);
  let hash = 2166136261;
  for (let index = 0; index < json.length; index += 1) {
    hash ^= json.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function byteLength(value: unknown): number {
  return JSON.stringify(value)?.length ?? 0;
}
