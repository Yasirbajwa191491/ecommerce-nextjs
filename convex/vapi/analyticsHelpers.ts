import type { MutationCtx } from "../_generated/server";

export async function incrementDailyAnalytics(
  ctx: MutationCtx,
  field:
    | "conversations"
    | "productSearches"
    | "orderTrackingRequests"
    | "leadsCaptured"
    | "humanEscalations"
    | "cartAdds"
    | "checkoutStarts",
  amount = 1
) {
  const dateKey = new Date().toISOString().slice(0, 10);
  const existing = await ctx.db
    .query("vapiAnalyticsDaily")
    .withIndex("by_dateKey", (q) => q.eq("dateKey", dateKey))
    .unique();

  if (existing) {
    const current = (existing[field] as number | undefined) ?? 0;
    await ctx.db.patch(existing._id, {
      [field]: current + amount,
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
    cartAdds: field === "cartAdds" ? amount : 0,
    checkoutStarts: field === "checkoutStarts" ? amount : 0,
  });
}
