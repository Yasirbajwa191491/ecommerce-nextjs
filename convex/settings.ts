import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./lib/requireAdmin";
import { validateEmailFromValue } from "./lib/emailFrom";
import { getEmailFromValue, getLowStockThresholdValue, getReviewReplyStoreContext, getSmsOrderConfirmationEnabledValue } from "./lib/settingsHelpers";
import { slugify } from "./lib/products";
import { RECOMMENDATION_SYSTEM_DEFAULTS } from "./lib/recommendations/constants";

export const SYSTEM_SETTING_KEYS = [
  "address",
  "phone",
  "email",
  "email_from",
  "business_hours",
  "low_stock_threshold",
  "shipping_policy",
  "return_policy",
  "terms_conditions",
  "privacy_policy",
  "sms_order_confirmation_enabled",
  "review_call_auto_enabled",
  "review_call_auto_delay_days",
  ...RECOMMENDATION_SYSTEM_DEFAULTS.map((item) => item.key),
] as const;

export const PUBLIC_SETTING_KEYS = [
  "address",
  "phone",
  "email",
  "business_hours",
  "shipping_policy",
  "return_policy",
  "terms_conditions",
  "privacy_policy",
  "sms_order_confirmation_enabled",
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
  {
    key: "low_stock_threshold",
    name: "Low Stock Threshold",
    value: "2",
  },
  {
    key: "shipping_policy",
    name: "Shipping Policy",
    value:
      "Select products include free shipping — look for the free shipping badge on product pages. Products with shipping fees display the cost clearly on the product detail page. Shipping costs are calculated and shown in your cart and checkout summary before you pay. Once your order ships, you receive status updates through our order tracking system.",
  },
  {
    key: "return_policy",
    name: "Return Policy",
    value:
      "We offer easy returns within 30 days of delivery for unused items in original packaging. Contact our support team with your order number to initiate a return. Refunds are processed to your original payment method after we receive and inspect the returned item.",
  },
  {
    key: "terms_conditions",
    name: "Terms & Conditions",
    value: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "By placing an order on our store, you agree to purchase items subject to availability, accurate delivery details, and our standard return policy. Cash on delivery orders must be paid in full upon receipt. Card payments are processed securely through Stripe.",
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "We reserve the right to cancel orders in cases of pricing errors, suspected fraud, or inventory issues. For questions about these terms, please contact our support team.",
            },
          ],
        },
      ],
    }),
  },
  {
    key: "privacy_policy",
    name: "Privacy Policy",
    value: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "We collect the information you provide at checkout — including your name, email, phone number, and shipping address — to process and deliver your order. Payment details for card transactions are handled securely by Stripe and are not stored on our servers.",
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Your information may be saved to speed up future purchases. We do not sell your personal data. You may contact us to request updates or deletion of your saved details.",
            },
          ],
        },
      ],
    }),
  },
  {
    key: "sms_order_confirmation_enabled",
    name: "SMS Order Confirmation",
    value: "false",
  },
  {
    key: "review_call_auto_enabled",
    name: "Automatic Review Calls",
    value: "false",
  },
  {
    key: "review_call_auto_delay_days",
    name: "Review Call Delay (Days)",
    value: "5",
  },
  ...RECOMMENDATION_SYSTEM_DEFAULTS,
];

function assertValidSettingValue(key: string, value: string) {
  if (key === "email_from") {
    const error = validateEmailFromValue(value);
    if (error) throw new ConvexError(error);
  }
  if (key === "low_stock_threshold") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new ConvexError("Low stock threshold must be a non-negative integer");
    }
  }
  if (key === "sms_order_confirmation_enabled") {
    const normalized = value.trim().toLowerCase();
    if (normalized !== "true" && normalized !== "false") {
      throw new ConvexError(
        "SMS order confirmation must be enabled or disabled (true or false)"
      );
    }
  }
  if (key === "review_call_auto_enabled") {
    const normalized = value.trim().toLowerCase();
    if (normalized !== "true" && normalized !== "false") {
      throw new ConvexError(
        "Automatic review calls must be enabled or disabled (true or false)"
      );
    }
  }
  if (key === "review_call_auto_delay_days") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || ![3, 5, 7].includes(parsed)) {
      throw new ConvexError("Review call delay must be 3, 5, or 7 days");
    }
  }
  if (key.startsWith("recommendation_")) {
    if (
      key.endsWith("_enabled") &&
      value.trim().toLowerCase() !== "true" &&
      value.trim().toLowerCase() !== "false"
    ) {
      throw new ConvexError("Recommendation toggle must be true or false");
    }
    if (key === "recommendation_refresh_hours") {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new ConvexError("Refresh hours must be a positive integer");
      }
    }
    if (key === "recommendation_max_per_section") {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 16) {
        throw new ConvexError("Max recommendations must be between 1 and 16");
      }
    }
    if (
      key === "recommendation_scoring_weights" ||
      key === "recommendation_ai_fallback_order"
    ) {
      try {
        JSON.parse(value);
      } catch {
        throw new ConvexError("Recommendation setting must be valid JSON");
      }
    }
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

export const getLowStockThreshold = internalQuery({
  args: {},
  handler: async (ctx) => getLowStockThresholdValue(ctx),
});

export const getEmailFrom = internalQuery({
  args: {},
  handler: async (ctx) => getEmailFromValue(ctx),
});

export const getSmsOrderConfirmationEnabled = internalQuery({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => getSmsOrderConfirmationEnabledValue(ctx),
});

export const getReviewCallAutoDelayDays = internalQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "review_call_auto_delay_days"))
      .unique();
    const parsed = Number.parseInt(row?.value ?? "5", 10);
    return [3, 5, 7].includes(parsed) ? parsed : 5;
  },
});

export const getReviewReplyStoreContextQuery = internalQuery({
  args: {},
  returns: v.object({
    storeName: v.string(),
    storeEmail: v.string(),
    storeAddress: v.string(),
  }),
  handler: async (ctx) => {
    return await getReviewReplyStoreContext(ctx);
  },
});

export const getPublicBranding = internalQuery({
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

    return {
      address: map.address ?? SYSTEM_DEFAULTS.find((s) => s.key === "address")!.value,
      phone: map.phone ?? SYSTEM_DEFAULTS.find((s) => s.key === "phone")!.value,
      email: map.email ?? SYSTEM_DEFAULTS.find((s) => s.key === "email")!.value,
    };
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
    let value = args.value.trim();

    if (name.length < 2) {
      throw new ConvexError("Setting name must be at least 2 characters");
    }
    if (!value) {
      throw new ConvexError("Setting value is required");
    }

    await assertUniqueSettingName(ctx, name, args.id);
    if (row.key === "sms_order_confirmation_enabled") {
      value = value.toLowerCase();
    }
    if (row.key === "review_call_auto_enabled") {
      value = value.toLowerCase();
    }
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
