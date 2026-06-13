import type { MutationCtx } from "../_generated/server";

export async function incrementDailyAnalytics(
  ctx: MutationCtx,
  field:
    | "conversations"
    | "productSearches"
    | "orderTrackingRequests"
    | "leadsCaptured"
    | "humanEscalations",
  amount = 1
) {
  const dateKey = new Date().toISOString().slice(0, 10);
  const existing = await ctx.db
    .query("vapiAnalyticsDaily")
    .withIndex("by_dateKey", (q) => q.eq("dateKey", dateKey))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      [field]: existing[field] + amount,
    });
    return;
  }

  await ctx.db.insert("vapiAnalyticsDaily", {
    dateKey,
    conversations: field === "conversations" ? amount : 0,
    productSearches: field === "productSearches" ? amount : 0,
    orderTrackingRequests: field === "orderTrackingRequests" ? amount : 0,
    leadsCaptured: field === "leadsCaptured" ? amount : 0,
    humanEscalations: field === "humanEscalations" ? amount : 0,
  });
}
