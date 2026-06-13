export function getVapiPublicKey(): string | undefined {
  return process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim() || undefined;
}

export function getVapiAssistantId(): string | undefined {
  return process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID?.trim() || undefined;
}

export function isVapiConfigured(): boolean {
  return Boolean(getVapiPublicKey() && getVapiAssistantId());
}

export type VapiAssistantState =
  | "idle"
  | "listening"
  | "speaking"
  | "processing";

export type VapiTranscriptEntry = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: number;
};
