import type { ActionCtx, MutationCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";

type ProviderName = "siglip" | "clip" | "gemini" | "n8n";

export async function recordProviderSuccess(
  ctx: MutationCtx | ActionCtx,
  provider: ProviderName
): Promise<void> {
  if ("runMutation" in ctx) {
    await ctx.runMutation(internal.providerHealthMutations.recordSuccess, {
      provider,
    });
  }
}

export async function recordProviderFailure(
  ctx: MutationCtx | ActionCtx,
  provider: ProviderName
): Promise<void> {
  if ("runMutation" in ctx) {
    await ctx.runMutation(internal.providerHealthMutations.recordFailure, {
      provider,
    });
  }
}

export async function isProviderHealthy(
  ctx: ActionCtx,
  provider: ProviderName
): Promise<boolean> {
  const row = await ctx.runQuery(internal.providerHealthMutations.getProvider, {
    provider,
  });
  if (!row) return true;
  if (row.status !== "down") return true;
  if (!row.lastFailureAt) return true;
  const { PROVIDER_CIRCUIT_BREAKER_COOLDOWN_MS } = await import("./constants");
  return Date.now() - row.lastFailureAt > PROVIDER_CIRCUIT_BREAKER_COOLDOWN_MS;
}
