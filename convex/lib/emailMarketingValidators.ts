import { v } from "convex/values";

export const emailTemplateStatusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("archived")
);

export const emailCampaignStatusValidator = v.union(
  v.literal("draft"),
  v.literal("scheduled"),
  v.literal("sending"),
  v.literal("sent"),
  v.literal("failed")
);

export const emailCampaignSegmentValidator = v.union(
  v.literal("all"),
  v.literal("selected"),
  v.literal("segments"),
  v.literal("new_subscribers"),
  v.literal("active_customers"),
  v.literal("custom")
);

/** Optional AI-enriched email content fields shared by templates and campaigns. */
export const emailContentExtrasValidator = {
  headline: v.optional(v.string()),
  previewText: v.optional(v.string()),
  ctaText: v.optional(v.string()),
  productPromoText: v.optional(v.string()),
};

export const emailRecipientStatusValidator = v.union(
  v.literal("pending"),
  v.literal("sent"),
  v.literal("delivered"),
  v.literal("failed"),
  v.literal("opened"),
  v.literal("clicked")
);
