import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";

/** Schedules indexing after the mutation commits. Product save does not wait on embeddings. */
export async function scheduleRagProductReindex(
  ctx: MutationCtx,
  productId: Id<"products">
): Promise<void> {
  await ctx.scheduler.runAfter(0, internal.ragIndexing.reindexProduct, { productId });
}

export async function scheduleRagPolicyReindex(ctx: MutationCtx): Promise<void> {
  await ctx.scheduler.runAfter(0, internal.ragIndexing.reindexPolicies, {});
}
