import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { isProductActive } from "../../lib/productActive";
import { rankProductsByTextMatch } from "../../lib/search/productTextMatch";

export function extractProductIdFromReference(reference: string): string[] {
  const trimmed = reference.trim();
  if (!trimmed) return [];

  const candidates = new Set<string>([trimmed]);
  const normalized = trimmed.replace(/[)\],.;]+$/g, "");
  candidates.add(normalized);

  const urlMatch = normalized.match(/\/product\/([a-z0-9]+)(?:[/?#]|$)/i);
  if (urlMatch?.[1]) {
    candidates.add(urlMatch[1]);
  }

  return [...candidates].filter(Boolean);
}

export async function resolveProductReference(
  ctx: QueryCtx,
  reference: string
): Promise<Id<"products"> | null> {
  const raw = reference.trim();
  if (!raw) return null;

  for (const candidate of extractProductIdFromReference(raw)) {
    try {
      const product = await ctx.db.get(candidate as Id<"products">);
      if (product && isProductActive(product) && product.stock > 0) {
        return product._id;
      }
    } catch {
      // Ignore malformed ID candidates and continue fallback matching.
    }
  }

  const products = await ctx.db.query("products").collect();
  const activeInStock = products.filter(
    (product) => isProductActive(product) && product.stock > 0
  );
  const ranked = rankProductsByTextMatch(activeInStock, raw);
  return ranked[0]?._id ?? null;
}
