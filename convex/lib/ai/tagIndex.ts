import type { MutationCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { slugifyTag } from "./tagUtils";

export async function clearTagIndexForReview(
  ctx: MutationCtx,
  reviewId: Id<"productReviews">
): Promise<void> {
  const existing = await ctx.db
    .query("reviewTagIndex")
    .filter((q) => q.eq(q.field("reviewId"), reviewId))
    .collect();

  for (const row of existing) {
    await ctx.db.delete(row._id);
  }
}

export async function syncTagIndexForReview(
  ctx: MutationCtx,
  args: {
    reviewId: Id<"productReviews">;
    productId: Id<"products">;
    isApproved: boolean;
    tags: string[];
  }
): Promise<void> {
  await clearTagIndexForReview(ctx, args.reviewId);

  for (const tagLabel of args.tags) {
    await ctx.db.insert("reviewTagIndex", {
      productId: args.productId,
      reviewId: args.reviewId,
      tagSlug: slugifyTag(tagLabel),
      tagLabel,
      isApproved: args.isApproved,
    });
  }
}

export async function syncTagIndexApproval(
  ctx: MutationCtx,
  reviewId: Id<"productReviews">,
  isApproved: boolean
): Promise<void> {
  const rows = await ctx.db
    .query("reviewTagIndex")
    .filter((q) => q.eq(q.field("reviewId"), reviewId))
    .collect();

  for (const row of rows) {
    await ctx.db.patch(row._id, { isApproved });
  }
}
