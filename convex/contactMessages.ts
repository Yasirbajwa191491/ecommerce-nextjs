import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./lib/requireAdmin";
import { paginateArray } from "./lib/pagination";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return EMAIL_PATTERN.test(email) && email.length <= 254;
}

export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const email = normalizeEmail(args.email);
    const message = args.message.trim();

    if (name.length < 2 || name.length > 120) {
      throw new ConvexError("Please enter a valid name.");
    }
    if (!isValidEmail(email)) {
      throw new ConvexError("Please enter a valid email address.");
    }
    if (message.length < 10 || message.length > 2000) {
      throw new ConvexError("Message must be between 10 and 2000 characters.");
    }

    await ctx.db.insert("contactMessages", {
      name,
      email,
      message,
      submittedAt: Date.now(),
      read: false,
      source: "contact_page",
    });

    return { success: true as const };
  },
});

export const count = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const messages = await ctx.db.query("contactMessages").collect();
    return {
      total: messages.length,
      unread: messages.filter((message) => !message.read).length,
    };
  },
});

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let messages = await ctx.db.query("contactMessages").collect();
    messages.sort((a, b) => b.submittedAt - a.submittedAt);

    if (args.search?.trim()) {
      const term = args.search.trim().toLowerCase();
      messages = messages.filter(
        (message) =>
          message.name.toLowerCase().includes(term) ||
          message.email.toLowerCase().includes(term) ||
          message.message.toLowerCase().includes(term)
      );
    }

    return paginateArray(messages, args.paginationOpts);
  },
});

export const markRead = mutation({
  args: { id: v.id("contactMessages") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const message = await ctx.db.get(args.id);
    if (!message) {
      throw new ConvexError("Message not found");
    }
    await ctx.db.patch(args.id, { read: true });
  },
});

export const remove = mutation({
  args: { id: v.id("contactMessages") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const message = await ctx.db.get(args.id);
    if (!message) {
      throw new ConvexError("Message not found");
    }
    await ctx.db.delete(args.id);
  },
});
