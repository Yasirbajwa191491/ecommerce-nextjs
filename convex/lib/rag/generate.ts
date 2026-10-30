import {
  executeWithProviderChain,
  isProviderConfigured,
  parseProviderChain,
} from "../ai/providerChain";
import { getPrimaryProviderName } from "../ai/getProvider";
import type { AiProviderName } from "../ai/types";
import { EMBEDDING_DIMENSIONS } from "../ai/constants";

function orderedProviders(): AiProviderName[] {
  let primary: AiProviderName | null = null;
  try {
    primary = getPrimaryProviderName();
  } catch {
    primary = null;
  }
  const chain = parseProviderChain().filter((name) => isProviderConfigured(name));
  const ordered = primary ? [primary, ...chain.filter((name) => name !== primary)] : chain;
  return ordered.filter(
    (name, index, all) => isProviderConfigured(name) && all.indexOf(name) === index
  );
}

export function ragProviderConfigured(): boolean {
  return orderedProviders().length > 0;
}

export async function generateRagAnswer(
  system: string,
  user: string
): Promise<{ text: string; provider: string } | null> {
  const chain = orderedProviders();
  if (chain.length === 0) return null;
  try {
    const { result, provider } = await executeWithProviderChain(chain, async (item) => {
      if (!item.completeText) {
        throw new Error("Provider cannot complete shopping answers");
      }
      return await item.completeText(system, user);
    });
    return { text: result, provider: provider.name };
  } catch {
    return null;
  }
}

export async function embedRagTexts(texts: string[]): Promise<{
  vectors: number[][];
  version: string;
}> {
  const chain = orderedProviders();
  if (chain.length === 0) {
    throw new Error("No embedding provider is configured");
  }
  const { result, provider } = await executeWithProviderChain(chain, async (item) => {
    const vectors: number[][] = [];
    for (const text of texts) {
      const vector = await item.embed(text);
      if (vector.length !== EMBEDDING_DIMENSIONS) {
        throw new Error("Embedding dimension mismatch");
      }
      vectors.push(vector);
    }
    return vectors;
  });
  return { vectors: result, version: provider.name === "remote" ? `${provider.name}:${provider.model}:${EMBEDDING_DIMENSIONS}` : `${provider.name}:${EMBEDDING_DIMENSIONS}` };
}

export async function probeRagEmbeddingVersion(): Promise<string> {
  const probed = await embedRagTexts(["."]);
  const vector = probed.vectors[0];
  if (!vector || vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error("Embedding dimension mismatch");
  }
  return probed.version;
}
