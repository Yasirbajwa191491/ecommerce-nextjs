import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./lib/requireAdmin";
import { validateEmailFromValue } from "./lib/emailFrom";
import { slugify } from "./lib/products";

export const SYSTEM_SETTING_KEYS = [
  "address",
  "phone",
  "email",
  "email_from",
  "business_hours",
] as const;

export const PUBLIC_SETTING_KEYS = [
  "address",
  "phone",
  "email",
  "business_hours",
] as const;

export type SystemSettingKey = (typeof SYSTEM_SETTING_KEYS)[number];

export const SYSTEM_DEFAULTS: {
  key: SystemSettingKey;
  name: string;
  value: string;
}[] = [
  {
    key: "address",
    name: "Address",
    value: "DHA Phase 6 Lahore, Pakistan, 54000",
  },
  {
    key: "phone",
    name: "Phone Number",
    value: "+1 (800) 555-0199",
  },
  {
    key: "email",
    name: "Email",
    value: "yasir.sohail@savari.io",
  },
  {
    key: "email_from",
    name: "Email From",
    value: "Ecommerce Store <yasir.sohail@savari.io>",
  },
  {
    key: "business_hours",
    name: "Business Hours",
    value: "Mon – Fri, 9:00 AM – 6:00 PM (PKT)",
  },
];

function assertValidSettingValue(key: string, value: string) {
  if (key === "email_from") {
    const error = validateEmailFromValue(value);
    if (error) throw new ConvexError(error);
  }
}

function normalizeSettingName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function normalizedSettingNameKey(name: string) {
  return normalizeSettingName(name).toLowerCase();
}

function settingKeyFromName(name: string) {
  const key = slugify(normalizeSettingName(name)).replace(/-/g, "_");
  return key || "setting";
}

async function findByKey(ctx: QueryCtx | MutationCtx, key: string) {
  return await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
}

async function assertUniqueSettingName(
  ctx: MutationCtx,
  name: string,
  excludeId?: Id<"settings">
) {
  const normalized = normalizedSettingNameKey(name);
  const rows = await ctx.db.query("settings").collect();
  const conflict = rows.find(
    (row) =>
      row._id !== excludeId && normalizedSettingNameKey(row.name) === normalized
  );
  if (conflict) {
    throw new ConvexError("A setting with this name already exists");
  }
}

async function assertUniqueSettingKey(
  ctx: MutationCtx,
  key: string,
  excludeId?: Id<"settings">
) {
  const existing = await findByKey(ctx, key);
  if (existing && existing._id !== excludeId) {
    throw new ConvexError("A setting with this name already exists");
  }
}

async function insertMissingSystemDefaults(ctx: MutationCtx) {
  let inserted = 0;

  for (const setting of SYSTEM_DEFAULTS) {
    const existing = await findByKey(ctx, setting.key);
    if (!existing) {
      await ctx.db.insert("settings", {
        key: setting.key,
        name: setting.name,
        value: setting.value,
        isSystem: true,
        updatedAt: Date.now(),
      });
      inserted += 1;
    }
  }

  return { inserted };
}

export const seedDefaults = internalMutation({
  args: {},
  handler: async (ctx) => insertMissingSystemDefaults(ctx),
});

export const ensureDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await insertMissingSystemDefaults(ctx);
  },
});

/** Public map of setting key → value for storefront. */
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("settings").collect();
    const map: Record<string, string> = {};

    for (const setting of SYSTEM_DEFAULTS) {
      if (!PUBLIC_SETTING_KEYS.includes(setting.key as (typeof PUBLIC_SETTING_KEYS)[number])) {
        continue;
      }
      map[setting.key] = setting.value;
    }

    for (const row of rows) {
      if (!PUBLIC_SETTING_KEYS.includes(row.key as (typeof PUBLIC_SETTING_KEYS)[number])) {
        continue;
      }
      map[row.key] = row.value;
    }

    return map;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("settings").collect();
    return rows.sort((a, b) => {
      if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  },
});

export const getEmailFrom = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await findByKey(ctx, "email_from");
    if (row?.value.trim()) return row.value.trim();
    const fallback = SYSTEM_DEFAULTS.find((setting) => setting.key === "email_from");
    return fallback?.value ?? "onboarding@resend.dev";
  },
});

export const listTakenNames = query({
  args: { excludeId: v.optional(v.id("settings")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("settings").collect();
    return rows
      .filter((row) => row._id !== args.excludeId)
      .map((row) => normalizedSettingNameKey(row.name));
  },
});

export const listTakenKeys = query({
  args: { excludeId: v.optional(v.id("settings")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("settings").collect();
    return rows
      .filter((row) => row._id !== args.excludeId)
      .map((row) => row.key);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const name = normalizeSettingName(args.name);
    const value = args.value.trim();

    if (name.length < 2) {
      throw new ConvexError("Setting name must be at least 2 characters");
    }
    if (!value) {
      throw new ConvexError("Setting value is required");
    }

    const key = settingKeyFromName(name);
    await assertUniqueSettingName(ctx, name);
    await assertUniqueSettingKey(ctx, key);

    return await ctx.db.insert("settings", {
      key,
      name,
      value,
      isSystem: false,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("settings"),
    name: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) {
      throw new ConvexError("Setting not found");
    }

    const name = normalizeSettingName(args.name);
    const value = args.value.trim();

    if (name.length < 2) {
      throw new ConvexError("Setting name must be at least 2 characters");
    }
    if (!value) {
      throw new ConvexError("Setting value is required");
    }

    await assertUniqueSettingName(ctx, name, args.id);
    assertValidSettingValue(row.key, value);

    if (row.isSystem) {
      await ctx.db.patch(args.id, {
        name,
        value,
        updatedAt: Date.now(),
      });
      return args.id;
    }

    const nextKey = settingKeyFromName(name);
    await assertUniqueSettingKey(ctx, nextKey, args.id);

    await ctx.db.patch(args.id, {
      key: nextKey,
      name,
      value,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("settings") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) {
      throw new ConvexError("Setting not found");
    }
    if (row.isSystem) {
      throw new ConvexError("System settings cannot be deleted");
    }
    await ctx.db.delete(args.id);
  },
});
