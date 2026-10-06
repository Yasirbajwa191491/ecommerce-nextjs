import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

const SESSION_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

export function normalizeBrowserSessionToken(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const token = value.trim();
  return SESSION_TOKEN_PATTERN.test(token) ? token.toLowerCase() : undefined;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Read only from an authenticated Vapi webhook, never from browser claims. */
export function browserSessionTokenFromWebhook(
  call: unknown,
  assistant?: unknown
): string | undefined {
  const callRecord = record(call);
  // The Web SDK's second start() argument is assistantOverrides, not call.metadata.
  const sources = [
    record(callRecord?.assistantOverrides)?.metadata,
    record(assistant)?.metadata,
    record(callRecord?.assistant)?.metadata,
    callRecord?.metadata,
  ];
  for (const source of sources) {
    const token = normalizeBrowserSessionToken(record(source)?.browserSessionToken);
    if (token) return token;
  }
  return undefined;
}

/** A stored token alone may have come from the retired public first-claim API. */
export function ownsVoiceConversation(
  conversation: Pick<Doc<"vapiConversations">, "browserSessionToken" | "browserSessionVerifiedAt"> | null,
  token: unknown
): boolean {
  const normalized = normalizeBrowserSessionToken(token);
  return Boolean(
    normalized &&
      conversation?.browserSessionVerifiedAt !== undefined &&
      normalizeBrowserSessionToken(conversation?.browserSessionToken) === normalized
  );
}

export async function conversationForBrowser(
  ctx: QueryCtx | MutationCtx,
  vapiCallId: string | undefined,
  browserSessionToken: string
): Promise<Doc<"vapiConversations"> | null> {
  const token = normalizeBrowserSessionToken(browserSessionToken);
  if (!token) return null;

  const callId = vapiCallId?.trim();
  if (callId) {
    const conversation = await ctx.db
      .query("vapiConversations")
      .withIndex("by_vapi_call_id", (q) => q.eq("vapiCallId", callId))
      .unique();
    return ownsVoiceConversation(conversation, token) ? conversation : null;
  }

  const conversations = await ctx.db
    .query("vapiConversations")
    .withIndex("by_browser_session", (q) => q.eq("browserSessionToken", token))
    .order("desc")
    .take(5);
  return conversations.find((conversation) => ownsVoiceConversation(conversation, token)) ?? null;
}
