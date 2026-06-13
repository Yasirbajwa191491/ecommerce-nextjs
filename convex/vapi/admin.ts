import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "../_generated/server";
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

export const listLogsPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    toolName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let logs = await ctx.db.query("vapiConversationLogs").collect();
    logs.sort((a, b) => b.createdAt - a.createdAt);

    if (args.toolName?.trim()) {
      const tool = args.toolName.trim().toLowerCase();
      logs = logs.filter((log) => log.toolName?.toLowerCase() === tool);
    }

    if (args.search?.trim()) {
      const term = args.search.trim().toLowerCase();
      logs = logs.filter(
        (log) =>
          log.content.toLowerCase().includes(term) ||
          log.toolName?.toLowerCase().includes(term) ||
          log.toolInput?.toLowerCase().includes(term)
      );
    }

    const { page, isDone, continueCursor } = paginateArray(
      logs,
      args.paginationOpts
    );
    return { page, isDone, continueCursor };
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
