"use node";

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { callImageEmbedApi } from "./lib/ai/imageEmbeddingClient";
import { extractVisualSearchAttributes } from "./lib/ai/geminiVisionAttributes";
import {
  isProviderHealthy,
  recordProviderFailure,
  recordProviderSuccess,
} from "./lib/ai/providerHealth";
import { parseSearchQuery } from "./lib/search/queryParser";
import { productImageValidator } from "./schema";

const searchResultItemValidator = v.object({
  _id: v.id("products"),
  name: v.string(),
  company: v.string(),
  imageUrl: v.string(),
  images: v.array(productImageValidator),
  price: v.number(),
  discountPercent: v.number(),
  currency: v.string(),
  categoryId: v.id("productCategories"),
  categoryName: v.string(),
  stars: v.number(),
  reviews: v.number(),
  featured: v.boolean(),
  finalPrice: v.number(),
  stock: v.number(),
  shipping: v.boolean(),
  description: v.string(),
});

const visualSearchResultValidator = v.object({
  products: v.array(searchResultItemValidator),
  totalCount: v.number(),
  nextCursor: v.optional(v.number()),
  provider: v.optional(v.string()),
  fallbackUsed: v.optional(v.string()),
  resultProductIds: v.array(v.id("products")),
  message: v.optional(v.string()),
});

type VisualSearchResult = {
  products: Array<{
    _id: Id<"products">;
    name: string;
    company: string;
    imageUrl: string;
    images: Array<{ url: string; alt?: string }>;
    price: number;
    discountPercent: number;
    currency: string;
    categoryId: Id<"productCategories">;
    categoryName: string;
    stars: number;
    reviews: number;
    featured: boolean;
    finalPrice: number;
    stock: number;
    shipping: boolean;
    description: string;
  }>;
  totalCount: number;
  nextCursor?: number;
  provider?: string;
  fallbackUsed?: string;
  resultProductIds: Id<"products">[];
  message?: string;
};

type SearchResultItem = {
  _id: Id<"products">;
  finalPrice: number;
  price: number;
  stars: number;
  company: string;
  categoryId: Id<"productCategories">;
  categoryName: string;
};

function simpleImageHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `vs_${Math.abs(hash).toString(36)}`;
}

type FilterArgs = {
  categorySlug?: string;
  brandSlugs?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
};

async function applyCatalogFilters(
  ctx: ActionCtx,
  productIds: Id<"products">[],
  filters: FilterArgs
): Promise<Id<"products">[]> {
  if (productIds.length === 0) return [];

  const enriched = (await ctx.runQuery(
    internal.productSearchQueries.enrichProductsByIds,
    { productIds }
  )) as SearchResultItem[];

  let filtered = enriched;

  if (filters.categorySlug) {
    const categories = await ctx.runQuery(
      internal.productSearchQueries.getActiveCategories,
      {}
    );
    const cat = categories.find((c) => c.slug === filters.categorySlug);
    if (cat) {
      filtered = filtered.filter(
        (p) => p.categoryName.toLowerCase() === cat.name.toLowerCase()
      );
    }
  }

  if (filters.brandSlugs && filters.brandSlugs.length > 0) {
    const brandSet = new Set(filters.brandSlugs.map((b) => b.toLowerCase()));
    filtered = filtered.filter((p) =>
      brandSet.has(p.company.toLowerCase().replace(/\s+/g, "-"))
    );
  }

  if (filters.minPrice != null || filters.maxPrice != null) {
    filtered = filtered.filter((p) => {
      if (filters.maxPrice != null && p.finalPrice > filters.maxPrice) {
        return false;
      }
      if (filters.minPrice != null && p.finalPrice < filters.minPrice) {
        return false;
      }
      return true;
    });
  }

  if (filters.minRating != null) {
    filtered = filtered.filter((p) => p.stars >= filters.minRating!);
  }

  return filtered.map((p) => p._id);
}

export const searchByImage = action({
  args: {
    storageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
    textQuery: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
    sessionId: v.optional(v.string()),
    categorySlug: v.optional(v.string()),
    brandSlugs: v.optional(v.array(v.string())),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    minRating: v.optional(v.number()),
  },
  returns: visualSearchResultValidator,
  handler: async (ctx, args): Promise<VisualSearchResult> => {
    const limit = Math.min(Math.max(args.limit ?? 12, 1), 50);
    const cursor = args.cursor ?? 0;

    let imageUrl = args.imageUrl?.trim();
    let imageBase64: string | undefined;
    let mimeType = "image/jpeg";

    if (args.storageId) {
      const url = await ctx.storage.getUrl(args.storageId);
      if (!url) {
        return {
          products: [],
          totalCount: 0,
          resultProductIds: [],
          message:
            "We couldn't process that image. Try keyword or semantic search instead.",
        };
      }
      imageUrl = url;
    }

    if (!imageUrl) {
      return {
        products: [],
        totalCount: 0,
        resultProductIds: [],
        message: "Please upload an image to search visually.",
      };
    }

    try {
      const response = await fetch(imageUrl);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > 0 && buffer.byteLength <= 5 * 1024 * 1024) {
          mimeType =
            response.headers.get("content-type")?.split(";")[0] ?? mimeType;
          imageBase64 = Buffer.from(buffer).toString("base64");
        }
      }
    } catch {
      // URL embed fallback
    }

    const imageHash = simpleImageHash(imageBase64 ?? imageUrl);
    let provider: string | undefined;
    let fallbackUsed: string | undefined;
    let rankedIds: Id<"products">[] = [];

    const cached = await ctx.runQuery(
      internal.imageEmbeddingQueries.getCachedVisualSearchEmbedding,
      { imageHash }
    );

    let embedding: number[] | null = cached?.embedding ?? null;
    let embedProvider = cached?.provider as "siglip" | "clip" | undefined;

    if (!embedding) {
      for (const p of ["siglip", "clip"] as const) {
        if (!(await isProviderHealthy(ctx, p))) continue;
        try {
          const result = await callImageEmbedApi({
            imageUrl: imageBase64 ? undefined : imageUrl,
            imageBase64,
            mimeType,
            preferredProvider: p,
          });
          embedding = result.embedding;
          embedProvider = result.provider;
          provider = result.provider;
          await recordProviderSuccess(ctx, result.provider);
          await ctx.runMutation(
            internal.imageEmbeddingMutations.setCachedVisualSearchEmbedding,
            {
              imageHash,
              embedding: result.embedding,
              provider: result.provider,
              dimensions: result.dimensions,
            }
          );
          break;
        } catch {
          await recordProviderFailure(ctx, p);
          if (p === "siglip") fallbackUsed = "clip";
        }
      }
    } else {
      provider = embedProvider;
    }

    if (embedding && embedProvider) {
      const indexName =
        embedProvider === "siglip"
          ? "by_image_embedding"
          : "by_image_embedding_clip";

      try {
        const vectorResults = await ctx.vectorSearch("products", indexName, {
          vector: embedding,
          limit: 50,
        });
        rankedIds = vectorResults.map((hit) => hit._id as Id<"products">);
      } catch {
        rankedIds = [];
      }
    }

    if (rankedIds.length === 0 && imageBase64) {
      if (await isProviderHealthy(ctx, "gemini")) {
        try {
          const attributes = await extractVisualSearchAttributes({
            imageBase64,
            mimeType,
          });
          if (attributes) {
            provider = "gemini";
            fallbackUsed = fallbackUsed ?? "gemini_vision";
            await recordProviderSuccess(ctx, "gemini");

            const combinedQuery = [attributes, args.textQuery?.trim()]
              .filter(Boolean)
              .join(" ");

            const hybridResult = await ctx.runAction(api.productSearch.searchHybrid, {
              query: combinedQuery,
              limit: 50,
              source: "catalog",
              sessionId: args.sessionId,
            });
            rankedIds = hybridResult.resultProductIds;
          }
        } catch {
          await recordProviderFailure(ctx, "gemini");
        }
      }
    }

    if (rankedIds.length === 0) {
      await ctx.runMutation(internal.imageEmbeddingMutations.logVisualSearchEvent, {
        sessionId: args.sessionId,
        provider: provider ?? "none",
        resultCount: 0,
        fallbackUsed,
        source: "visual",
      });

      return {
        products: [],
        totalCount: 0,
        resultProductIds: [],
        provider,
        fallbackUsed,
        message:
          "Visual search isn't available right now. Try keyword or semantic search instead.",
      };
    }

    rankedIds = await applyCatalogFilters(ctx, rankedIds, {
      categorySlug: args.categorySlug,
      brandSlugs: args.brandSlugs,
      minPrice: args.minPrice,
      maxPrice: args.maxPrice,
      minRating: args.minRating,
    });

    if (args.textQuery?.trim()) {
      const categories = await ctx.runQuery(
        internal.productSearchQueries.getActiveCategories,
        {}
      );
      const parsed = parseSearchQuery(args.textQuery.trim(), categories);
      const enriched = (await ctx.runQuery(
        internal.productSearchQueries.enrichProductsByIds,
        { productIds: rankedIds }
      )) as SearchResultItem[];
      const filtered = enriched.filter((p) => {
        const finalPrice = p.finalPrice;
        if (parsed.maxPrice != null && finalPrice > parsed.maxPrice) return false;
        if (parsed.minPrice != null && finalPrice < parsed.minPrice) return false;
        if (parsed.minStars != null && p.stars < parsed.minStars) return false;
        return true;
      });
      const filteredSet = new Set(filtered.map((p) => p._id));
      rankedIds = rankedIds.filter((id) => filteredSet.has(id));
    }

    const totalCount = rankedIds.length;
    const pageIds = rankedIds.slice(cursor, cursor + limit);
    const nextCursor =
      cursor + limit < totalCount ? cursor + limit : undefined;

    const products = await ctx.runQuery(
      internal.productSearchQueries.enrichProductsByIds,
      { productIds: pageIds }
    );

    await ctx.runMutation(internal.imageEmbeddingMutations.logVisualSearchEvent, {
      sessionId: args.sessionId,
      provider: provider ?? embedProvider ?? "unknown",
      resultCount: totalCount,
      fallbackUsed,
      source: "visual",
    });

    if (args.storageId) {
      try {
        await ctx.storage.delete(args.storageId);
      } catch {
        // best effort
      }
    }

    return {
      products,
      totalCount,
      nextCursor,
      provider: provider ?? embedProvider,
      fallbackUsed,
      resultProductIds: rankedIds,
    };
  },
});
