import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "../_generated/server";
import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { v } from "convex/values";
import { requireAdmin } from "../lib/requireAdmin";
import { paginateArray } from "../lib/pagination";

function getConvexSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim();
  if (explicit) return explicit;
  const cloud = process.env.CONVEX_CLOUD_URL?.trim();
  if (cloud) return cloud.replace(/\.convex\.cloud\/?$/i, ".convex.site");
  return "https://your-project.convex.site";
}

function startOfTodayMs() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
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

    const conversations = await ctx.db.query("vapiConversations").collect();
    const todayStart = startOfTodayMs();
    const conversationsToday = conversations.filter(
      (c) => c.startedAt >= todayStart
    ).length;

    const analyticsRows = await ctx.db.query("vapiAnalyticsDaily").collect();
    const totals = analyticsRows.reduce(
      (acc, row) => ({
        productSearches: acc.productSearches + row.productSearches,
        orderTrackingRequests:
          acc.orderTrackingRequests + row.orderTrackingRequests,
        leadsCaptured: acc.leadsCaptured + row.leadsCaptured,
        humanEscalations: acc.humanEscalations + row.humanEscalations,
      }),
      {
        productSearches: 0,
        orderTrackingRequests: 0,
        leadsCaptured: 0,
        humanEscalations: 0,
      }
    );

    const leads = await ctx.db.query("vapiLeads").collect();
    const tickets = await ctx.db.query("vapiSupportTickets").collect();

    return {
      totalConversations: conversations.length,
      conversationsToday,
      productSearches: totals.productSearches,
      orderTrackingRequests: totals.orderTrackingRequests,
      leadsCaptured: totals.leadsCaptured,
      humanEscalations: totals.humanEscalations,
      openTickets: tickets.filter((t) => t.status !== "resolved").length,
      newLeads: leads.filter((l) => l.status === "new").length,
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
    .collect();

  const userMessages = logs.filter((log) => log.role === "user").length;
  const assistantMessages = logs.filter((log) => log.role === "assistant").length;
  const toolCalls = logs.filter((log) => log.role === "tool").length;
  const sorted = [...logs].sort((a, b) => b.createdAt - a.createdAt);
  const lastMessage = sorted.find((log) => log.role !== "system");
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
    messageCount: logs.length,
    userMessages,
    assistantMessages,
    toolCalls,
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

    let conversations = await ctx.db.query("vapiConversations").collect();
    conversations.sort((a, b) => b.startedAt - a.startedAt);

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

    const { page, isDone, continueCursor } = paginateArray(
      conversations,
      args.paginationOpts
    );

    const summaries = await Promise.all(
      page.map((conversation) => summarizeConversation(ctx, conversation))
    );

    return { page: summaries, isDone, continueCursor };
  },
});

export const getConversationDetail = query({
  args: { conversationId: v.id("vapiConversations") },
  returns: v.union(
    v.object({
      conversation: conversationSummaryValidator,
      logs: v.array(conversationLogValidator),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    const logs = await ctx.db
      .query("vapiConversationLogs")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
    logs.sort((a, b) => a.createdAt - b.createdAt);

    return {
      conversation: await summarizeConversation(ctx, conversation),
      logs: logs.map((log) => ({
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
    let leads = await ctx.db.query("vapiLeads").collect();
    leads.sort((a, b) => b.createdAt - a.createdAt);

    if (args.status) {
      leads = leads.filter((lead) => lead.status === args.status);
    }

    if (args.search?.trim()) {
      const term = args.search.trim().toLowerCase();
      leads = leads.filter(
        (lead) =>
          lead.name.toLowerCase().includes(term) ||
          lead.email.toLowerCase().includes(term) ||
          lead.message.toLowerCase().includes(term)
      );
    }

    const { page, isDone, continueCursor } = paginateArray(
      leads,
      args.paginationOpts
    );
    return { page, isDone, continueCursor };
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
    let tickets = await ctx.db.query("vapiSupportTickets").collect();
    tickets.sort((a, b) => b.createdAt - a.createdAt);

    if (args.status) {
      tickets = tickets.filter((ticket) => ticket.status === args.status);
    }

    if (args.search?.trim()) {
      const term = args.search.trim().toLowerCase();
      tickets = tickets.filter(
        (ticket) =>
          ticket.name.toLowerCase().includes(term) ||
          ticket.email.toLowerCase().includes(term) ||
          ticket.subject.toLowerCase().includes(term)
      );
    }

    const { page, isDone, continueCursor } = paginateArray(
      tickets,
      args.paginationOpts
    );
    return { page, isDone, continueCursor };
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
    const rows = await ctx.db.query("vapiAnalyticsDaily").collect();
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
