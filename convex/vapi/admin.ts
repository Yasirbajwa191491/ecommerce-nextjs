import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "../_generated/server";
import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { v } from "convex/values";
import { requireAdmin } from "../lib/requireAdmin";
import { readTableCounts } from "../lib/maintainedAggregates";

function getConvexSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim();
  if (explicit) return explicit;
  const cloud = process.env.CONVEX_CLOUD_URL?.trim();
  if (cloud) return cloud.replace(/\.convex\.cloud\/?$/i, ".convex.site");
  return "https://your-project.convex.site";
}

export const getAnalytics = query({
  args: {},
  returns: v.object({
    totalConversations: v.number(),
    conversationsToday: v.number(),
    productSearches: v.number(),
    orderTrackingRequests: v.number(),
    leadsCaptured: v.number(),
    humanEscalations: v.number(),
    openTickets: v.number(),
    newLeads: v.number(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [conversations, totals, leads, tickets, today] = await Promise.all([
      readTableCounts(ctx, "vapiConversations"),
      readTableCounts(ctx, "vapiAnalyticsDaily"),
      readTableCounts(ctx, "vapiLeads"),
      readTableCounts(ctx, "vapiSupportTickets"),
      ctx.db.query("vapiAnalyticsDaily").withIndex("by_dateKey", (q) =>
        q.eq("dateKey", new Date().toISOString().slice(0, 10))
      ).unique(),
    ]);

    return {
      totalConversations: conversations.all ?? 0,
      conversationsToday: today?.conversations ?? 0,
      productSearches: totals.sum_productSearches ?? 0,
      orderTrackingRequests: totals.sum_orderTrackingRequests ?? 0,
      leadsCaptured: totals.sum_leadsCaptured ?? 0,
      humanEscalations: totals.sum_humanEscalations ?? 0,
      openTickets: (tickets.open ?? 0) + (tickets.in_progress ?? 0),
      newLeads: leads.new ?? 0,
    };
  },
});

export const getSetupInfo = query({
  args: {},
  returns: v.object({
    webhookUrl: v.string(),
    assistantConfigured: v.boolean(),
    envChecklist: v.array(
      v.object({
        key: v.string(),
        description: v.string(),
        location: v.string(),
      })
    ),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const siteUrl = getConvexSiteUrl();
    return {
      webhookUrl: `${siteUrl.replace(/\/$/, "")}/vapi/webhook`,
      assistantConfigured: Boolean(process.env.VAPI_API_KEY?.trim()),
      envChecklist: [
        {
          key: "NEXT_PUBLIC_VAPI_PUBLIC_KEY",
          description: "Vapi public API key for the web widget",
          location: ".env.local / Vercel",
        },
        {
          key: "NEXT_PUBLIC_VAPI_ASSISTANT_ID",
          description: "Vapi assistant ID for Store Shopping Assistant",
          location: ".env.local / Vercel",
        },
        {
          key: "VAPI_API_KEY",
          description: "Vapi private API key for assistant provisioning",
          location: "Convex env (npx convex env set)",
        },
        {
          key: "VAPI_WEBHOOK_SECRET",
          description: "Shared secret for webhook verification",
          location: "Convex env + Vapi dashboard",
        },
        {
          key: "VAPI_PHONE_NUMBER_ID",
          description: "Optional — for future outbound review calls",
          location: "Convex env",
        },
      ],
    };
  },
});

const conversationSummaryValidator = v.object({
  _id: v.id("vapiConversations"),
  vapiCallId: v.string(),
  channel: v.union(v.literal("voice"), v.literal("chat")),
  startedAt: v.number(),
  endedAt: v.union(v.number(), v.null()),
  customerEmail: v.union(v.string(), v.null()),
  customerPhone: v.union(v.string(), v.null()),
  summary: v.union(v.string(), v.null()),
  status: v.union(v.literal("active"), v.literal("ended")),
  durationMs: v.union(v.number(), v.null()),
  messageCount: v.number(),
  userMessages: v.number(),
  assistantMessages: v.number(),
  toolCalls: v.number(),
  preview: v.string(),
});

const conversationLogValidator = v.object({
  _id: v.id("vapiConversationLogs"),
  role: v.union(
    v.literal("user"),
    v.literal("assistant"),
    v.literal("tool"),
    v.literal("system")
  ),
  content: v.string(),
  toolName: v.union(v.string(), v.null()),
  toolInput: v.union(v.string(), v.null()),
  toolOutput: v.union(v.string(), v.null()),
  createdAt: v.number(),
});

async function summarizeConversation(
  ctx: QueryCtx,
  conversation: Doc<"vapiConversations">
) {
  const logs = await ctx.db
    .query("vapiConversationLogs")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
    .order("desc")
    .take(1);

  const lastMessage = logs[0];
  const preview =
    lastMessage?.content ??
    conversation.summary ??
    (conversation.channel === "voice" ? "Voice session" : "Chat session");

  const endedAt = conversation.endedAt ?? null;

  return {
    _id: conversation._id,
    vapiCallId: conversation.vapiCallId,
    channel: conversation.channel,
    startedAt: conversation.startedAt,
    endedAt,
    customerEmail: conversation.customerEmail ?? null,
    customerPhone: conversation.customerPhone ?? null,
    summary: conversation.summary ?? null,
    status: endedAt ? ("ended" as const) : ("active" as const),
    durationMs: endedAt ? endedAt - conversation.startedAt : null,
    messageCount: conversation.messageCount ?? 0,
    userMessages: conversation.userMessages ?? 0,
    assistantMessages: conversation.assistantMessages ?? 0,
    toolCalls: conversation.toolCalls ?? 0,
    preview,
  };
}

export const listConversationsPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    channel: v.optional(v.union(v.literal("voice"), v.literal("chat"))),
    status: v.optional(v.union(v.literal("active"), v.literal("ended"))),
  },
  returns: v.object({
    page: v.array(conversationSummaryValidator),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const result = await ctx.db.query("vapiConversations").withIndex("by_started_at")
      .order("desc").paginate({ ...args.paginationOpts, numItems: Math.min(Math.max(args.paginationOpts.numItems, 1), 50) });
    let conversations = result.page;

    if (args.channel) {
      conversations = conversations.filter((c) => c.channel === args.channel);
    }

    if (args.status) {
      conversations = conversations.filter((c) =>
        args.status === "ended" ? Boolean(c.endedAt) : !c.endedAt
      );
    }

    if (args.search?.trim()) {
      const term = args.search.trim().toLowerCase();
      conversations = conversations.filter(
        (c) =>
          c.vapiCallId.toLowerCase().includes(term) ||
          c.summary?.toLowerCase().includes(term) ||
          c.customerEmail?.toLowerCase().includes(term) ||
          c.customerPhone?.toLowerCase().includes(term)
      );
    }

    const summaries = await Promise.all(
      conversations.map((conversation) => summarizeConversation(ctx, conversation))
    );

    return { ...result, page: summaries };
  },
});

export const getConversationDetail = query({
  args: { conversationId: v.id("vapiConversations") },
  returns: v.union(
    v.object({
      conversation: conversationSummaryValidator,
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    return {
      conversation: await summarizeConversation(ctx, conversation),
    };
  },
});

export const getConversationLogsPaginated = query({
  args: { conversationId: v.id("vapiConversations"), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(conversationLogValidator), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const result = await ctx.db.query("vapiConversationLogs")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("asc").paginate({ ...args.paginationOpts, numItems: Math.min(Math.max(args.paginationOpts.numItems, 1), 50) });
    return {
      ...result,
      page: result.page.map((log) => ({
        _id: log._id,
        role: log.role,
        content: log.content,
        toolName: log.toolName ?? null,
        toolInput: log.toolInput ?? null,
        toolOutput: log.toolOutput ?? null,
        createdAt: log.createdAt,
      })),
    };
  },
});

export const listLeadsPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(
      v.union(v.literal("new"), v.literal("contacted"), v.literal("converted"))
    ),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const source = args.status
      ? ctx.db.query("vapiLeads").withIndex("by_status", (q) => q.eq("status", args.status!))
      : ctx.db.query("vapiLeads").withIndex("by_created_at");
    const result = await source.order("desc").paginate({ ...args.paginationOpts, numItems: Math.min(Math.max(args.paginationOpts.numItems, 1), 50) });
    let leads = result.page;

    if (args.search?.trim()) {
      const term = args.search.trim().toLowerCase();
      leads = leads.filter(
        (lead) =>
          lead.name.toLowerCase().includes(term) ||
          lead.email.toLowerCase().includes(term) ||
          lead.message.toLowerCase().includes(term)
      );
    }

    return { ...result, page: leads };
  },
});

export const listTicketsPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(
      v.union(v.literal("open"), v.literal("in_progress"), v.literal("resolved"))
    ),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const source = args.status
      ? ctx.db.query("vapiSupportTickets").withIndex("by_status", (q) => q.eq("status", args.status!))
      : ctx.db.query("vapiSupportTickets").withIndex("by_created_at");
    const result = await source.order("desc").paginate({ ...args.paginationOpts, numItems: Math.min(Math.max(args.paginationOpts.numItems, 1), 50) });
    let tickets = result.page;

    if (args.search?.trim()) {
      const term = args.search.trim().toLowerCase();
      tickets = tickets.filter(
        (ticket) =>
          ticket.name.toLowerCase().includes(term) ||
          ticket.email.toLowerCase().includes(term) ||
          ticket.subject.toLowerCase().includes(term)
      );
    }

    return { ...result, page: tickets };
  },
});

export const updateLeadStatus = mutation({
  args: {
    leadId: v.id("vapiLeads"),
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("converted")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new Error("Lead not found");
    await ctx.db.patch(args.leadId, { status: args.status });
    return null;
  },
});

export const updateTicketStatus = mutation({
  args: {
    ticketId: v.id("vapiSupportTickets"),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("resolved")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");
    await ctx.db.patch(args.ticketId, { status: args.status });
    return null;
  },
});

export const getDailyAnalytics = query({
  args: { days: v.optional(v.number()) },
  returns: v.array(
    v.object({
      dateKey: v.string(),
      conversations: v.number(),
      productSearches: v.number(),
      orderTrackingRequests: v.number(),
      leadsCaptured: v.number(),
      humanEscalations: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(Math.max(args.days ?? 14, 1), 30);
    const rows = await ctx.db.query("vapiAnalyticsDaily").withIndex("by_dateKey").order("desc").take(limit);
    return rows
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .slice(-limit)
      .map((row) => ({
        dateKey: row.dateKey,
        conversations: row.conversations,
        productSearches: row.productSearches,
        orderTrackingRequests: row.orderTrackingRequests,
        leadsCaptured: row.leadsCaptured,
        humanEscalations: row.humanEscalations,
      }));
  },
});
