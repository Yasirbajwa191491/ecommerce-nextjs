import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./lib/requireAdmin";
import { paginateArray } from "./lib/pagination";
import { insertAdminActivityLog } from "./lib/adminActivityLogs";
import {
  emailCampaignSegmentValidator,
  emailCampaignStatusValidator,
  emailContentExtrasValidator,
} from "./lib/emailMarketingValidators";
import { enqueueCampaignRecipients, resolveCampaignRecipients } from "./lib/campaignQueue";

function filterCampaignsBySearch<
  T extends { name: string; subject: string },
>(items: T[], search?: string) {
  if (!search?.trim()) return items;
  const term = search.trim().toLowerCase();
  return items.filter(
    (c) =>
      c.name.toLowerCase().includes(term) ||
      c.subject.toLowerCase().includes(term)
  );
}

export const countByStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const campaigns = await ctx.db.query("emailCampaigns").collect();
    return {
      draft: campaigns.filter((c) => c.status === "draft").length,
      scheduled: campaigns.filter((c) => c.status === "scheduled").length,
      sending: campaigns.filter((c) => c.status === "sending").length,
      sent: campaigns.filter((c) => c.status === "sent").length,
      failed: campaigns.filter((c) => c.status === "failed").length,
      total: campaigns.length,
    };
  },
});

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    status: v.optional(emailCampaignStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let campaigns = await ctx.db.query("emailCampaigns").collect();

    if (args.status) {
      campaigns = campaigns.filter((c) => c.status === args.status);
    }

    campaigns = filterCampaignsBySearch(campaigns, args.search);
    campaigns.sort((a, b) => (b.sentAt ?? b.createdAt) - (a.sentAt ?? a.createdAt));

    const { page, isDone, continueCursor } = paginateArray(
      campaigns,
      args.paginationOpts
    );

    return { page, isDone, continueCursor };
  },
});

export const getById = query({
  args: { id: v.id("emailCampaigns") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.id);
  },
});

export const getDetail = query({
  args: { id: v.id("emailCampaigns") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const campaign = await ctx.db.get(args.id);
    if (!campaign) return null;

    let template = null;
    if (campaign.templateId) {
      template = await ctx.db.get(campaign.templateId);
    }

    const products = campaign.productIds
      ? await Promise.all(campaign.productIds.map((id) => ctx.db.get(id)))
      : [];

    return {
      campaign,
      template,
      products: products.filter((p) => p !== null),
    };
  },
});

const campaignContentArgs = {
  headline: emailContentExtrasValidator.headline,
  previewText: emailContentExtrasValidator.previewText,
  ctaText: emailContentExtrasValidator.ctaText,
  productPromoText: emailContentExtrasValidator.productPromoText,
  suggestedSegmentKeys: v.optional(v.string()),
};

export const create = mutation({
  args: {
    name: v.string(),
    subject: v.string(),
    templateId: v.optional(v.id("emailTemplates")),
    contentJson: v.optional(v.string()),
    contentHtml: v.optional(v.string()),
    productIds: v.optional(v.array(v.id("products"))),
    segmentType: emailCampaignSegmentValidator,
    segmentCriteria: v.optional(v.string()),
    selectedSubscriberIds: v.optional(v.array(v.id("subscribers"))),
    ...campaignContentArgs,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const name = args.name.trim();
    const subject = args.subject.trim();

    if (!name) throw new ConvexError("Campaign name is required.");
    if (!subject) throw new ConvexError("Email subject is required.");

    let contentJson = args.contentJson;
    let contentHtml = args.contentHtml;
    let headline = args.headline?.trim() || undefined;
    let previewText = args.previewText?.trim() || undefined;
    let ctaText = args.ctaText?.trim() || undefined;
    let productPromoText = args.productPromoText?.trim() || undefined;

    if (args.templateId) {
      const template = await ctx.db.get(args.templateId);
      if (!template) throw new ConvexError("Template not found.");
      if (!contentJson) contentJson = template.contentJson;
      if (!contentHtml) contentHtml = template.contentHtml;
      if (!headline) headline = template.headline;
      if (!previewText) previewText = template.previewText;
      if (!ctaText) ctaText = template.ctaText;
      if (!productPromoText) productPromoText = template.productPromoText;
    }

    if (!contentHtml?.trim()) {
      throw new ConvexError("Email content is required.");
    }

    const productIds = args.productIds ?? [];
    const now = Date.now();

    const id = await ctx.db.insert("emailCampaigns", {
      name,
      subject,
      headline,
      previewText,
      ctaText,
      productPromoText,
      suggestedSegmentKeys: args.suggestedSegmentKeys,
      templateId: args.templateId,
      contentJson,
      contentHtml,
      productIds,
      segmentType: args.segmentType,
      segmentCriteria: args.segmentCriteria,
      selectedSubscriberIds: args.selectedSubscriberIds,
      status: "draft",
      recipientCount: 0,
      productCount: productIds.length,
      emailsSent: 0,
      emailsDelivered: 0,
      emailsFailed: 0,
      emailsOpened: 0,
      emailsClicked: 0,
      uniqueOpens: 0,
      uniqueClicks: 0,
      attributedRevenue: 0,
      createdByUserId: admin._id,
      createdByName: admin.name ?? admin.email,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("emailCampaigns"),
    name: v.string(),
    subject: v.string(),
    templateId: v.optional(v.id("emailTemplates")),
    contentJson: v.optional(v.string()),
    contentHtml: v.optional(v.string()),
    productIds: v.optional(v.array(v.id("products"))),
    segmentType: emailCampaignSegmentValidator,
    segmentCriteria: v.optional(v.string()),
    selectedSubscriberIds: v.optional(v.array(v.id("subscribers"))),
    ...campaignContentArgs,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("Campaign not found.");
    if (existing.status !== "draft") {
      throw new ConvexError("Only draft campaigns can be edited.");
    }

    const name = args.name.trim();
    const subject = args.subject.trim();
    if (!name) throw new ConvexError("Campaign name is required.");
    if (!subject) throw new ConvexError("Email subject is required.");
    if (!args.contentHtml?.trim()) {
      throw new ConvexError("Email content is required.");
    }

    const productIds = args.productIds ?? [];

    await ctx.db.patch(args.id, {
      name,
      subject,
      headline: args.headline?.trim() || undefined,
      previewText: args.previewText?.trim() || undefined,
      ctaText: args.ctaText?.trim() || undefined,
      productPromoText: args.productPromoText?.trim() || undefined,
      suggestedSegmentKeys: args.suggestedSegmentKeys,
      templateId: args.templateId,
      contentJson: args.contentJson,
      contentHtml: args.contentHtml,
      productIds,
      segmentType: args.segmentType,
      segmentCriteria: args.segmentCriteria,
      selectedSubscriberIds: args.selectedSubscriberIds,
      productCount: productIds.length,
      updatedAt: Date.now(),
    });
  },
});

export const duplicate = mutation({
  args: { id: v.id("emailCampaigns") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("Campaign not found.");

    const now = Date.now();
    const id = await ctx.db.insert("emailCampaigns", {
      name: `${existing.name} (Copy)`,
      subject: existing.subject,
      headline: existing.headline,
      previewText: existing.previewText,
      ctaText: existing.ctaText,
      productPromoText: existing.productPromoText,
      suggestedSegmentKeys: existing.suggestedSegmentKeys,
      templateId: existing.templateId,
      contentJson: existing.contentJson,
      contentHtml: existing.contentHtml,
      productIds: existing.productIds,
      segmentType: existing.segmentType,
      segmentCriteria: existing.segmentCriteria,
      selectedSubscriberIds: existing.selectedSubscriberIds,
      status: "draft",
      recipientCount: 0,
      productCount: existing.productCount,
      emailsSent: 0,
      emailsDelivered: 0,
      emailsFailed: 0,
      emailsOpened: 0,
      emailsClicked: 0,
      uniqueOpens: 0,
      uniqueClicks: 0,
      attributedRevenue: 0,
      createdByUserId: admin._id,
      createdByName: admin.name ?? admin.email,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("emailCampaigns") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("Campaign not found.");

    if (existing.status === "sending") {
      throw new ConvexError("Cannot delete a campaign that is currently sending.");
    }

    const recipients = await ctx.db
      .query("emailCampaignRecipients")
      .withIndex("by_campaign_id", (q) => q.eq("campaignId", args.id))
      .collect();

    for (const recipient of recipients) {
      await ctx.db.delete(recipient._id);
    }

    await ctx.db.delete(args.id);

    await insertAdminActivityLog(ctx, {
      type: "email_campaign_deleted",
      title: "Email campaign deleted",
      description: `Deleted campaign "${existing.name}".`,
      actorType: "admin",
      actorUserId: admin._id,
      actorName: admin.name ?? admin.email,
      relatedCampaignId: args.id,
      createdAt: Date.now(),
    });
  },
});

export const startCampaignSend = mutation({
  args: { id: v.id("emailCampaigns") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const campaign = await ctx.db.get(args.id);
    if (!campaign) throw new ConvexError("Campaign not found.");

    if (campaign.status !== "draft") {
      throw new ConvexError("Only draft campaigns can be sent.");
    }

    if (campaign.sendLockAt && Date.now() - campaign.sendLockAt < 60_000) {
      throw new ConvexError("Campaign send is already in progress.");
    }

    const subscribers = await resolveCampaignRecipients(ctx, campaign);
    if (subscribers.length === 0) {
      throw new ConvexError("No active subscribers match this campaign.");
    }

    const now = Date.now();
    const idempotencyKey = `${args.id}-${now}`;

    await ctx.db.patch(args.id, {
      status: "sending",
      sendLockAt: now,
      idempotencyKey,
      sentAt: now,
      sentByUserId: admin._id,
      sentByName: admin.name ?? admin.email,
      updatedAt: now,
    });

    const enqueued = await enqueueCampaignRecipients(ctx, args.id, subscribers);

    await ctx.db.patch(args.id, {
      recipientCount: enqueued,
    });

    await insertAdminActivityLog(ctx, {
      type: "email_campaign_sent",
      title: "Email campaign started",
      description: `Started sending "${campaign.name}" to ${enqueued} recipients.`,
      actorType: "admin",
      actorUserId: admin._id,
      actorName: admin.name ?? admin.email,
      relatedCampaignId: args.id,
      createdAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.email.processCampaignBatch, {
      campaignId: args.id,
    });

    return { recipientCount: enqueued };
  },
});

export const resendFailed = mutation({
  args: { id: v.id("emailCampaigns") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const campaign = await ctx.db.get(args.id);
    if (!campaign) throw new ConvexError("Campaign not found.");

    if (campaign.status !== "sent" && campaign.status !== "failed") {
      throw new ConvexError("Only completed campaigns can be resent to failed recipients.");
    }

    const failedRecipients = await ctx.db
      .query("emailCampaignRecipients")
      .withIndex("by_campaign_id_status", (q) =>
        q.eq("campaignId", args.id).eq("status", "failed")
      )
      .collect();

    if (failedRecipients.length === 0) {
      throw new ConvexError("No failed recipients to resend.");
    }

    const now = Date.now();
    for (const recipient of failedRecipients) {
      await ctx.db.patch(recipient._id, {
        status: "pending",
        retryCount: 0,
        lastError: undefined,
        failedAt: undefined,
      });
    }

    await ctx.db.patch(args.id, {
      status: "sending",
      sendLockAt: now,
      updatedAt: now,
      sentByUserId: admin._id,
      sentByName: admin.name ?? admin.email,
    });

    await ctx.scheduler.runAfter(0, internal.email.processCampaignBatch, {
      campaignId: args.id,
    });

    return { recipientCount: failedRecipients.length };
  },
});

export const getCampaignForSend = internalQuery({
  args: { campaignId: v.id("emailCampaigns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.campaignId);
  },
});

export const getPendingRecipients = internalQuery({
  args: {
    campaignId: v.id("emailCampaigns"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const recipients = await ctx.db
      .query("emailCampaignRecipients")
      .withIndex("by_campaign_id_status", (q) =>
        q.eq("campaignId", args.campaignId).eq("status", "pending")
      )
      .take(args.limit);

    const enriched = await Promise.all(
      recipients.map(async (recipient) => {
        const subscriber = await ctx.db.get(recipient.subscriberId);
        return { recipient, subscriber };
      })
    );

    return enriched.filter((r) => r.subscriber?.active);
  },
});

export const markRecipientSent = internalMutation({
  args: {
    recipientId: v.id("emailCampaignRecipients"),
    resendMessageId: v.optional(v.string()),
    sentAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.recipientId, {
      status: "sent",
      sentAt: args.sentAt,
      resendMessageId: args.resendMessageId,
      deliveredAt: args.sentAt,
    });
  },
});

export const markRecipientFailed = internalMutation({
  args: {
    recipientId: v.id("emailCampaignRecipients"),
    error: v.string(),
    failedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient) return;

    const retryCount = recipient.retryCount + 1;
    const status = retryCount >= 3 ? ("failed" as const) : ("pending" as const);

    await ctx.db.patch(args.recipientId, {
      status,
      retryCount,
      lastError: args.error,
      failedAt: status === "failed" ? args.failedAt : undefined,
    });
  },
});

export const updateCampaignStats = internalMutation({
  args: {
    campaignId: v.id("emailCampaigns"),
    sentDelta: v.number(),
    failedDelta: v.number(),
    deliveredDelta: v.number(),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) return;

    await ctx.db.patch(args.campaignId, {
      emailsSent: campaign.emailsSent + args.sentDelta,
      emailsFailed: campaign.emailsFailed + args.failedDelta,
      emailsDelivered: campaign.emailsDelivered + args.deliveredDelta,
      updatedAt: Date.now(),
    });
  },
});

export const finalizeCampaign = internalMutation({
  args: { campaignId: v.id("emailCampaigns") },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.status !== "sending") return;

    const pending = await ctx.db
      .query("emailCampaignRecipients")
      .withIndex("by_campaign_id_status", (q) =>
        q.eq("campaignId", args.campaignId).eq("status", "pending")
      )
      .take(1);

    if (pending.length > 0) return;

    const failed = await ctx.db
      .query("emailCampaignRecipients")
      .withIndex("by_campaign_id_status", (q) =>
        q.eq("campaignId", args.campaignId).eq("status", "failed")
      )
      .take(1);

    const now = Date.now();
    await ctx.db.patch(args.campaignId, {
      status: failed.length > 0 && campaign.emailsSent === 0 ? "failed" : "sent",
      completedAt: now,
      sendLockAt: undefined,
      updatedAt: now,
    });
  },
});
