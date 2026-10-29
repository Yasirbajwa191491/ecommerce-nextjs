import { paginationOptsValidator } from "convex/server";
import { internalMutation, mutation, query } from "../server";
import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { requireAdmin } from "../lib/requireAdmin";
import {
  adjustTableCount,
  readTableCounts,
  replaceTableCounts,
} from "../lib/maintainedAggregates";

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

    const todayKey = new Date().toISOString().slice(0, 10);
    const [conversations, leads, tickets, today, dailyRows] = await Promise.all([
      readTableCounts(ctx, "vapiConversations"),
      readTableCounts(ctx, "vapiLeads"),
      readTableCounts(ctx, "vapiSupportTickets"),
      ctx.db.query("vapiAnalyticsDaily").withIndex("by_dateKey", (q) =>
        q.eq("dateKey", todayKey)
      ).unique(),
      ctx.db.query("vapiAnalyticsDaily").withIndex("by_dateKey").order("desc").take(4000),
    ]);
    const totals = dailyRows.reduce(
      (acc, row) => ({
        productSearches: acc.productSearches + row.productSearches,
        orderTrackingRequests: acc.orderTrackingRequests + row.orderTrackingRequests,
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

    return {
      totalConversations: conversations.all ?? 0,
      conversationsToday: today?.conversations ?? 0,
      productSearches: totals.productSearches,
      orderTrackingRequests: totals.orderTrackingRequests,
      leadsCaptured: totals.leadsCaptured,
      humanEscalations: totals.humanEscalations,
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
    if (lead.status !== args.status) {
      await adjustTableCount(ctx, "vapiLeads", {
        [lead.status]: -1,
        [args.status]: 1,
      });
    }
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
    if (ticket.status !== args.status) {
      await adjustTableCount(ctx, "vapiSupportTickets", {
        [ticket.status]: -1,
        [args.status]: 1,
      });
    }
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

const VAPI_COUNT_BACKFILL_KEY = "vapiTableCountBackfill";
const VAPI_COUNT_BATCH = 100;

type VapiCountPhase = "conversations" | "leads" | "tickets" | "done";
type LeadCounts = { new: number; contacted: number; converted: number };
type TicketCounts = { open: number; in_progress: number; resolved: number };

type VapiCountProgress = {
  phase: VapiCountPhase;
  cursor: string | null;
  cutoff: number;
  conversationsAll: number;
  baselineConversationsAll: number;
  leads: LeadCounts;
  baselineLeads: LeadCounts;
  tickets: TicketCounts;
  baselineTickets: TicketCounts;
};

function emptyLeadCounts(): LeadCounts {
  return { new: 0, contacted: 0, converted: 0 };
}

function emptyTicketCounts(): TicketCounts {
  return { open: 0, in_progress: 0, resolved: 0 };
}

function emptyVapiCountProgress(): VapiCountProgress {
  return {
    phase: "conversations",
    cursor: null,
    cutoff: 0,
    conversationsAll: 0,
    baselineConversationsAll: 0,
    leads: emptyLeadCounts(),
    baselineLeads: emptyLeadCounts(),
    tickets: emptyTicketCounts(),
    baselineTickets: emptyTicketCounts(),
  };
}

function leadCountsFrom(counts: Record<string, number> | undefined): LeadCounts {
  return {
    new: counts?.new ?? 0,
    contacted: counts?.contacted ?? 0,
    converted: counts?.converted ?? 0,
  };
}

function ticketCountsFrom(counts: Record<string, number> | undefined): TicketCounts {
  return {
    open: counts?.open ?? 0,
    in_progress: counts?.in_progress ?? 0,
    resolved: counts?.resolved ?? 0,
  };
}

function readVapiCountProgress(raw: string | undefined): VapiCountProgress {
  const fallback = emptyVapiCountProgress();
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return fallback;
    const record = parsed as Partial<VapiCountProgress>;
    const phase = record.phase;
    if (phase !== "conversations" && phase !== "leads" && phase !== "tickets" && phase !== "done") {
      return fallback;
    }
    return {
      phase,
      cursor: typeof record.cursor === "string" ? record.cursor : null,
      cutoff: typeof record.cutoff === "number" ? record.cutoff : 0,
      conversationsAll:
        typeof record.conversationsAll === "number" ? record.conversationsAll : 0,
      baselineConversationsAll:
        typeof record.baselineConversationsAll === "number"
          ? record.baselineConversationsAll
          : 0,
      leads: leadCountsFrom(record.leads),
      baselineLeads: leadCountsFrom(record.baselineLeads),
      tickets: ticketCountsFrom(record.tickets),
      baselineTickets: ticketCountsFrom(record.baselineTickets),
    };
  } catch {
    return fallback;
  }
}

/** Recount voice conversations, leads, and tickets into maintained aggregates. */
export const backfillVapiTableCounts = internalMutation({
  args: { resume: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("maintainedAggregates")
      .withIndex("by_key", (q) => q.eq("key", VAPI_COUNT_BACKFILL_KEY))
      .unique();
    if (existing?.ready) return null;
    if (
      !args.resume &&
      existing &&
      Date.now() - existing.updatedAt < 120_000
    ) {
      return null;
    }

    const progress = readVapiCountProgress(existing?.countsJson);
    if (!existing) {
      const [conversations, leads, tickets] = await Promise.all([
        readTableCounts(ctx, "vapiConversations"),
        readTableCounts(ctx, "vapiLeads"),
        readTableCounts(ctx, "vapiSupportTickets"),
      ]);
      progress.cutoff = Date.now();
      progress.baselineConversationsAll = conversations.all ?? 0;
      progress.baselineLeads = leadCountsFrom(leads);
      progress.baselineTickets = ticketCountsFrom(tickets);
    }
    if (progress.phase === "done") {
      if (existing) {
        await ctx.db.patch(existing._id, { ready: true, updatedAt: Date.now() });
      }
      return null;
    }

    const paginationOpts = { numItems: VAPI_COUNT_BATCH, cursor: progress.cursor };
    let isDone = false;
    let continueCursor: string | null = null;

    if (progress.phase === "conversations") {
      const page = await ctx.db
        .query("vapiConversations")
        .withIndex("by_started_at", (q) => q.lt("startedAt", progress.cutoff))
        .paginate(paginationOpts);
      progress.conversationsAll += page.page.length;
      isDone = page.isDone;
      continueCursor = page.continueCursor;
    } else if (progress.phase === "leads") {
      const page = await ctx.db
        .query("vapiLeads")
        .withIndex("by_created_at", (q) => q.lt("createdAt", progress.cutoff))
        .paginate(paginationOpts);
      for (const lead of page.page) {
        progress.leads[lead.status] += 1;
      }
      isDone = page.isDone;
      continueCursor = page.continueCursor;
    } else {
      const page = await ctx.db
        .query("vapiSupportTickets")
        .withIndex("by_created_at", (q) => q.lt("createdAt", progress.cutoff))
        .paginate(paginationOpts);
      for (const ticket of page.page) {
        progress.tickets[ticket.status] += 1;
      }
      isDone = page.isDone;
      continueCursor = page.continueCursor;
    }

    if (isDone) {
      progress.phase =
        progress.phase === "conversations"
          ? "leads"
          : progress.phase === "leads"
            ? "tickets"
            : "done";
      progress.cursor = null;
    } else {
      progress.cursor = continueCursor;
    }

    if (progress.phase === "done") {
      const [conversations, leads, tickets] = await Promise.all([
        readTableCounts(ctx, "vapiConversations"),
        readTableCounts(ctx, "vapiLeads"),
        readTableCounts(ctx, "vapiSupportTickets"),
      ]);
      const liveLeads = leadCountsFrom(leads);
      const liveTickets = ticketCountsFrom(tickets);
      await replaceTableCounts(ctx, "vapiConversations", {
        all: Math.max(
          0,
          progress.conversationsAll +
            (conversations.all ?? 0) -
            progress.baselineConversationsAll
        ),
      });
      await replaceTableCounts(ctx, "vapiLeads", {
        new: Math.max(0, progress.leads.new + liveLeads.new - progress.baselineLeads.new),
        contacted: Math.max(
          0,
          progress.leads.contacted + liveLeads.contacted - progress.baselineLeads.contacted
        ),
        converted: Math.max(
          0,
          progress.leads.converted + liveLeads.converted - progress.baselineLeads.converted
        ),
      });
      await replaceTableCounts(ctx, "vapiSupportTickets", {
        open: Math.max(
          0,
          progress.tickets.open + liveTickets.open - progress.baselineTickets.open
        ),
        in_progress: Math.max(
          0,
          progress.tickets.in_progress +
            liveTickets.in_progress -
            progress.baselineTickets.in_progress
        ),
        resolved: Math.max(
          0,
          progress.tickets.resolved + liveTickets.resolved - progress.baselineTickets.resolved
        ),
      });
    }

    const countsJson = JSON.stringify(progress);
    if (!existing) {
      await ctx.db.insert("maintainedAggregates", {
        key: VAPI_COUNT_BACKFILL_KEY,
        countsJson,
        ready: progress.phase === "done",
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(existing._id, {
        countsJson,
        ready: progress.phase === "done",
        updatedAt: Date.now(),
      });
    }

    if (progress.phase !== "done") {
      await ctx.scheduler.runAfter(0, internal.vapi.admin.backfillVapiTableCounts, {
        resume: true,
      });
    }
    return null;
  },
});
