import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { ConvexError } from "convex/values";
import { generateUnsubscribeToken } from "./subscriberTokens";

const BATCH_SIZE = 20;
const MAX_RETRIES = 3;

export { BATCH_SIZE, MAX_RETRIES };

export async function resolveCampaignRecipients(
  ctx: QueryCtx | MutationCtx,
  campaign: {
    segmentType: "all" | "selected" | "new_subscribers" | "active_customers" | "custom";
    selectedSubscriberIds?: Id<"subscribers">[];
  }
) {
  if (
    campaign.segmentType === "new_subscribers" ||
    campaign.segmentType === "active_customers" ||
    campaign.segmentType === "custom"
  ) {
    throw new ConvexError("This subscriber segment is not available yet.");
  }

  if (campaign.segmentType === "selected") {
    const ids = campaign.selectedSubscriberIds ?? [];
    if (ids.length === 0) {
      throw new ConvexError("Select at least one subscriber.");
    }
    const subscribers = await Promise.all(ids.map((id) => ctx.db.get(id)));
    return subscribers.filter(
      (s): s is NonNullable<typeof s> => s !== null && s.active
    );
  }

  return await ctx.db
    .query("subscribers")
    .withIndex("by_active_subscribed", (q) => q.eq("active", true))
    .collect();
}

export async function enqueueCampaignRecipients(
  ctx: MutationCtx,
  campaignId: Id<"emailCampaigns">,
  subscribers: { _id: Id<"subscribers">; email: string; unsubscribeToken?: string }[]
) {
  const now = Date.now();
  let enqueued = 0;

  for (const subscriber of subscribers) {
    const existing = await ctx.db
      .query("emailCampaignRecipients")
      .withIndex("by_campaign_subscriber", (q) =>
        q.eq("campaignId", campaignId).eq("subscriberId", subscriber._id)
      )
      .unique();

    if (existing) continue;

    if (!subscriber.unsubscribeToken) {
      const token = generateUnsubscribeToken();
      await ctx.db.patch(subscriber._id, { unsubscribeToken: token });
      subscriber.unsubscribeToken = token;
    }

    await ctx.db.insert("emailCampaignRecipients", {
      campaignId,
      subscriberId: subscriber._id,
      email: subscriber.email,
      status: "pending",
      retryCount: 0,
      createdAt: now,
    });
    enqueued += 1;
  }

  return enqueued;
}
