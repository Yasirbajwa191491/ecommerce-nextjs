export function serializeAgentPayload(value: unknown, limit = 64_000): string {
  const json = JSON.stringify(value);
  if (new TextEncoder().encode(json).byteLength > limit) throw new Error("Agent payload exceeds storage limit");
  return json;
}
