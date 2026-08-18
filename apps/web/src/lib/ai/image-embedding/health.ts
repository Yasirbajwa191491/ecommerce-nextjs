import type { ImageEmbeddingProvider, ProviderHealthState } from "./types";

const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000;

const healthState = new Map<ImageEmbeddingProvider, ProviderHealthState>();

function getOrCreate(provider: ImageEmbeddingProvider): ProviderHealthState {
  const existing = healthState.get(provider);
  if (existing) return existing;
  const initial: ProviderHealthState = {
    provider,
    status: "healthy",
    consecutiveFailures: 0,
  };
  healthState.set(provider, initial);
  return initial;
}

export function recordProviderSuccess(provider: ImageEmbeddingProvider): void {
  const state = getOrCreate(provider);
  state.status = "healthy";
  state.consecutiveFailures = 0;
  state.lastSuccessAt = Date.now();
  healthState.set(provider, state);
}

export function recordProviderFailure(provider: ImageEmbeddingProvider): void {
  const state = getOrCreate(provider);
  state.consecutiveFailures += 1;
  state.lastFailureAt = Date.now();
  state.status =
    state.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD ? "down" : "degraded";
  healthState.set(provider, state);
}

export function isProviderAvailable(provider: ImageEmbeddingProvider): boolean {
  const state = getOrCreate(provider);
  if (state.status !== "down") return true;
  if (!state.lastFailureAt) return true;
  return Date.now() - state.lastFailureAt > CIRCUIT_BREAKER_COOLDOWN_MS;
}

export function getProviderHealthSnapshot(): ProviderHealthState[] {
  return (["siglip", "clip"] as const).map((p) => ({ ...getOrCreate(p) }));
}
