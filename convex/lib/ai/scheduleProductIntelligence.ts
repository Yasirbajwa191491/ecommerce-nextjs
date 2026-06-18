import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import {
  buildReviewHighlights,
  computeProductContentHash,
} from "./productIntelligenceHelpers";

type ProductContentFields = Pick<
  Doc<"products">,
  "name" | "company" | "description" | "categoryId" | "price"
>;

export async function scheduleProductIntelligenceIfNeeded(
  ctx: MutationCtx,
  productId: Id<"products">,
  content: ProductContentFields,
  options?: { force?: boolean }
) {
  if (options?.force) {
    await ctx.scheduler.runAfter(0, internal.productAiActions.processProductIntelligence, {
      productId,
      force: true,
    });
    return;
  }

  const product = await ctx.db.get(productId);
  if (!product) return;

  const insights = await ctx.db
    .query("productReviewInsights")
    .withIndex("by_product", (q) => q.eq("productId", productId))
    .unique();

  const reviewHighlights = buildReviewHighlights(
    insights?.summary,
    insights?.topics ?? []
  );

  const contentHash = computeProductContentHash(content, reviewHighlights);

  if (
    product.embeddingContentHash &&
    product.embeddingContentHash === contentHash
  ) {
    return;
  }

  await ctx.scheduler.runAfter(0, internal.productAiActions.processProductIntelligence, {
    productId,
    force: false,
  });
}
