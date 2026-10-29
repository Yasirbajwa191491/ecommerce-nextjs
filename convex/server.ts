import { mutation as rawMutation, internalMutation as rawInternalMutation } from "./_generated/server";
import { customCtx, customMutation } from "convex-helpers/server/customFunctions";
import { Triggers } from "convex-helpers/server/triggers";
import type { DataModel } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { updateContribution } from "./lib/securityAnalytics";
export * from "./_generated/server";
const triggers = new Triggers<DataModel>();
for (const table of ["products", "productCategories", "orders", "subscribers", "emailCampaigns", "emailTemplates", "emailCampaignRecipients"] as const) {
  triggers.register(table, async (ctx, change) => { await updateContribution(ctx, table, change.id, change.newDoc); });
}
triggers.register("orders", async (ctx, change) => {
  if (change.newDoc && (change.oldDoc?.paymentStatus !== change.newDoc.paymentStatus || change.oldDoc?.status !== change.newDoc.status)) {
    await ctx.scheduler.runAfter(0, internal.recommendationAttribution.reconcileOrder, { orderId: change.id });
  }
});
export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));
export const internalMutation = customMutation(rawInternalMutation, customCtx(triggers.wrapDB));
