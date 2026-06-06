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
  v.literal("new_subscribers"),
  v.literal("active_customers"),
  v.literal("custom")
);

export const emailRecipientStatusValidator = v.union(
  v.literal("pending"),
  v.literal("sent"),
  v.literal("delivered"),
  v.literal("failed"),
  v.literal("opened"),
  v.literal("clicked")
);
