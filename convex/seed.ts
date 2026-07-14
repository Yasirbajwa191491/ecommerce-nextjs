import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, mutation } from "./_generated/server";
import { authComponent, createAuth } from "./betterAuth/auth";
import { slugify } from "./lib/products";
import { getDefaultDeliveryOptions } from "./lib/productValidators";

const SAMPLE_CATEGORIES = [
  { name: "OTC Medicines", description: "Over-the-counter medicines and pain relief", sortOrder: 1 },
  { name: "Vitamins & Supplements", description: "Vitamins, minerals, and dietary supplements", sortOrder: 2 },
  { name: "Personal Care", description: "Personal care and hygiene products", sortOrder: 3 },
  { name: "Medical Devices", description: "Home medical devices and monitoring equipment", sortOrder: 4 },
  { name: "Healthcare Essentials", description: "First aid and everyday healthcare essentials", sortOrder: 5 },
];

const SAMPLE_PRODUCTS = [
  {
    name: "Paracetamol",
    company: "HealthPlus",
    price: 8,
    currency: "USD",
    colors: ["#FFFFFF", "#E8F4FC"],
    image: [{ url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400" }],
    categorySlug: "otc-medicines",
    featured: true,
    shipping: true,
    stock: 120,
    reviews: 42,
    stars: 4.6,
    discountPercent: 10,
    description: "Fast-acting paracetamol tablets for pain relief and fever reduction.",
    warrantyAvailable: false,
    deliveryOptions: getDefaultDeliveryOptions().map((option) =>
      option.type === "express"
        ? { ...option, enabled: true, charge: 9.99 }
        : option
    ),
  },
  {
    name: "Vitamin D Tablets",
    company: "VitaCare",
    price: 18,
    currency: "USD",
    colors: ["#F5E6C8"],
    image: [{ url: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400" }],
    categorySlug: "vitamins-supplements",
    featured: true,
    shipping: true,
    stock: 80,
    reviews: 28,
    stars: 4.5,
    discountPercent: 15,
    description: "Daily vitamin D3 tablets to support bone health and immunity.",
    warrantyAvailable: false,
    deliveryOptions: getDefaultDeliveryOptions(),
  },
  {
    name: "Blood Pressure Monitor",
    company: "MediTech",
    price: 49,
    currency: "USD",
    colors: ["white", "#D3D3D3"],
    image: [{ url: "https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=400" }],
    categorySlug: "medical-devices",
    featured: true,
    shipping: true,
    stock: 35,
    reviews: 56,
    stars: 4.7,
    discountPercent: 10,
    description: "Digital upper-arm blood pressure monitor with easy-read display.",
    warrantyAvailable: true,
    warrantyDuration: "2_years" as const,
    warrantyType: "manufacturer" as const,
    warrantyDetails: "Covers defects in materials and workmanship.",
    deliveryOptions: getDefaultDeliveryOptions().map((option) => {
      if (option.type === "express") {
        return { ...option, enabled: true, charge: 14.99 };
      }
      if (option.type === "next_day") {
        return { ...option, enabled: true, charge: 19.99 };
      }
      return option;
    }),
  },
  {
    name: "Multivitamins",
    company: "VitaCare",
    price: 22,
    currency: "USD",
    colors: ["#E8F5E9", "#FFF8E1"],
    image: [{ url: "https://images.unsplash.com/photo-1550572017-4a6ace36d115?w=400" }],
    categorySlug: "vitamins-supplements",
    featured: true,
    shipping: true,
    stock: 95,
    reviews: 64,
    stars: 4.8,
    description: "Complete daily multivitamin formula for overall wellness support.",
    warrantyAvailable: false,
    deliveryOptions: getDefaultDeliveryOptions().map((option) =>
      option.type === "same_day"
        ? { ...option, enabled: true, charge: 24.99 }
        : option
    ),
  },
  {
    name: "First Aid Kit",
    company: "SafeCare",
    price: 29,
    currency: "USD",
    colors: ["#C62828", "white"],
    image: [{ url: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400" }],
    categorySlug: "healthcare-essentials",
    featured: false,
    shipping: true,
    stock: 50,
    reviews: 18,
    stars: 4.4,
    discountPercent: 20,
    description: "Compact first aid kit with essentials for home and travel.",
    warrantyAvailable: false,
    deliveryOptions: getDefaultDeliveryOptions().map((option) =>
      option.type === "pickup" ? { ...option, enabled: true } : option
    ),
  },
];

export const seedCategoriesAndProducts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existingCategory = await ctx.db.query("productCategories").first();
    if (existingCategory) return { skipped: true };

    const slugToId = new Map<string, Id<"productCategories">>();
    for (const cat of SAMPLE_CATEGORIES) {
      const slug = slugify(cat.name);
      const id = await ctx.db.insert("productCategories", {
        name: cat.name,
        description: cat.description,
        slug,
        active: true,
        sortOrder: cat.sortOrder,
      });
      slugToId.set(slug, id);
    }

    for (const p of SAMPLE_PRODUCTS) {
      const categoryId = slugToId.get(p.categorySlug);
      if (!categoryId) continue;
      const { categorySlug: _slug, ...product } = p;
      await ctx.db.insert("products", {
        ...product,
        categoryId,
      });
    }
    return { skipped: false };
  },
});

export const seedSuperAdmin = internalAction({
  args: {},
  handler: async (ctx) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    const email = "yasir.sohail@savari.io";
    const password = "12345678";

    try {
      await auth.api.signUpEmail({
        body: { email, password, name: "Super Admin" },
        headers,
      });
    } catch {
      // User may already exist
    }

    const users = await auth.api.listUsers({
      query: {
        searchValue: email,
        searchField: "email",
        searchOperator: "contains",
        limit: 1,
      },
      headers,
    });
    const user = users.users?.[0];
    if (user) {
      await auth.api.adminUpdateUser({
        body: {
          userId: user.id,
          data: { role: "superAdmin", emailVerified: true },
        },
        headers,
      });
    }
  },
});

/** Idempotent deploy seed: system settings + super admin only. */
export const seedAdminAndSettings = mutation({
  args: {},
  handler: async (ctx): Promise<{ settings: { inserted: number }; adminScheduled: true }> => {
    const settings = await ctx.runMutation(internal.settings.seedDefaults, {});
    await ctx.scheduler.runAfter(0, internal.seed.seedSuperAdmin, {});
    return { settings, adminScheduled: true };
  },
});

export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(internal.migrations.migrateLegacyProducts, {});
    await ctx.runMutation(internal.migrations.stripLegacyProductFields, {});
    await ctx.runMutation(internal.seed.seedCategoriesAndProducts, {});
    await ctx.runMutation(
      internal.migrations.backfillProductDeliveryWarranty.backfillProductDeliveryWarranty,
      {}
    );
    await ctx.runMutation(internal.settings.seedDefaults, {});
    await ctx.runMutation(internal.subscribers.ensureSubscriberTokens, {});
    await ctx.scheduler.runAfter(0, internal.seed.seedSuperAdmin, {});
    return { ok: true };
  },
});
