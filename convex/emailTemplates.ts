import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./lib/requireAdmin";
import { paginateArray } from "./lib/pagination";
import { insertAdminActivityLog } from "./lib/adminActivityLogs";
import { emailTemplateStatusValidator } from "./lib/emailMarketingValidators";

function filterTemplatesBySearch<
  T extends { name: string; subject: string },
>(items: T[], search?: string) {
  if (!search?.trim()) return items;
  const term = search.trim().toLowerCase();
  return items.filter(
    (t) =>
      t.name.toLowerCase().includes(term) ||
      t.subject.toLowerCase().includes(term)
  );
}

export const countByStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const templates = await ctx.db.query("emailTemplates").collect();
    return {
      draft: templates.filter((t) => t.status === "draft").length,
      active: templates.filter((t) => t.status === "active").length,
      archived: templates.filter((t) => t.status === "archived").length,
      total: templates.length,
    };
  },
});

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    status: v.optional(emailTemplateStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let templates = await ctx.db.query("emailTemplates").collect();

    if (args.status) {
      templates = templates.filter((t) => t.status === args.status);
    }

    templates = filterTemplatesBySearch(templates, args.search);
    templates.sort((a, b) => b.updatedAt - a.updatedAt);

    const { page, isDone, continueCursor } = paginateArray(
      templates,
      args.paginationOpts
    );

    return { page, isDone, continueCursor };
  },
});

export const listForSelect = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const templates = await ctx.db.query("emailTemplates").collect();
    return templates
      .filter((t) => t.status !== "archived")
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((t) => ({
        _id: t._id,
        name: t.name,
        subject: t.subject,
        status: t.status,
      }));
  },
});

export const getById = query({
  args: { id: v.id("emailTemplates") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    subject: v.string(),
    contentJson: v.string(),
    contentHtml: v.string(),
    status: v.optional(emailTemplateStatusValidator),
    productIds: v.optional(v.array(v.id("products"))),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const name = args.name.trim();
    const subject = args.subject.trim();

    if (!name) throw new ConvexError("Template name is required.");
    if (!subject) throw new ConvexError("Email subject is required.");

    const now = Date.now();
    const id = await ctx.db.insert("emailTemplates", {
      name,
      subject,
      contentJson: args.contentJson,
      contentHtml: args.contentHtml,
      status: args.status ?? "active",
      productIds: args.productIds,
      createdByUserId: admin._id,
      createdByName: admin.name ?? admin.email,
      createdAt: now,
      updatedAt: now,
    });

    await insertAdminActivityLog(ctx, {
      type: "email_template_created",
      title: "Email template created",
      description: `Created template "${name}".`,
      actorType: "admin",
      actorUserId: admin._id,
      actorName: admin.name ?? admin.email,
      relatedTemplateId: id,
      createdAt: now,
    });

    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("emailTemplates"),
    name: v.string(),
    subject: v.string(),
    contentJson: v.string(),
    contentHtml: v.string(),
    status: emailTemplateStatusValidator,
    productIds: v.optional(v.array(v.id("products"))),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("Template not found.");

    const name = args.name.trim();
    const subject = args.subject.trim();
    if (!name) throw new ConvexError("Template name is required.");
    if (!subject) throw new ConvexError("Email subject is required.");

    const now = Date.now();
    await ctx.db.patch(args.id, {
      name,
      subject,
      contentJson: args.contentJson,
      contentHtml: args.contentHtml,
      status: args.status,
      productIds: args.productIds,
      updatedAt: now,
    });

    await insertAdminActivityLog(ctx, {
      type: "email_template_updated",
      title: "Email template updated",
      description: `Updated template "${name}".`,
      actorType: "admin",
      actorUserId: admin._id,
      actorName: admin.name ?? admin.email,
      relatedTemplateId: args.id,
      createdAt: now,
    });
  },
});

export const duplicate = mutation({
  args: { id: v.id("emailTemplates") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("Template not found.");

    const now = Date.now();
    const name = `${existing.name} (Copy)`;
    const id = await ctx.db.insert("emailTemplates", {
      name,
      subject: existing.subject,
      contentJson: existing.contentJson,
      contentHtml: existing.contentHtml,
      status: "draft",
      productIds: existing.productIds,
      createdByUserId: admin._id,
      createdByName: admin.name ?? admin.email,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("emailTemplates") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("Template not found.");

    await ctx.db.delete(args.id);

    await insertAdminActivityLog(ctx, {
      type: "email_template_deleted",
      title: "Email template deleted",
      description: `Deleted template "${existing.name}".`,
      actorType: "admin",
      actorUserId: admin._id,
      actorName: admin.name ?? admin.email,
      relatedTemplateId: args.id,
      createdAt: Date.now(),
    });
  },
});
