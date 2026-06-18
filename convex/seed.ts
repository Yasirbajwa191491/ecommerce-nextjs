import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, mutation } from "./_generated/server";
import { authComponent, createAuth } from "./betterAuth/auth";
import { slugify } from "./lib/products";
import { getDefaultDeliveryOptions } from "./lib/productValidators";

const SAMPLE_CATEGORIES = [
  { name: "Electronics", description: "Electronic devices and accessories", sortOrder: 1 },
  { name: "Furniture", description: "Home and office furniture", sortOrder: 2 },
  { name: "Kitchen", description: "Kitchen appliances and tools", sortOrder: 3 },
  { name: "Office", description: "Office supplies and furniture", sortOrder: 4 },
  { name: "Living", description: "Living room decor and items", sortOrder: 5 },
];

const SAMPLE_PRODUCTS = [
  {
    name: "Study Lamp",
    company: "Lux Lighting",
    price: 45,
    currency: "USD",
    colors: ["#808080", "black"],
    image: [{ url: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400" }],
    categorySlug: "electronics",
    featured: true,
    shipping: true,
    stock: 25,
    reviews: 12,
    stars: 4.5,
    discountPercent: 10,
    description: "Adjustable LED study lamp with warm and cool modes.",
    warrantyAvailable: true,
    warrantyDuration: "2_years" as const,
    warrantyType: "manufacturer" as const,
    warrantyDetails: "Covers defects in materials and workmanship.",
    deliveryOptions: getDefaultDeliveryOptions().map((option) =>
      option.type === "express"
        ? { ...option, enabled: true, charge: 9.99 }
        : option
    ),
  },
  {
    name: "Bedside Table",
    company: "WoodCraft",
    price: 90,
    currency: "USD",
    colors: ["#8B4513"],
    image: [{ url: "https://images.unsplash.com/photo-1594620302200-9a762244a506?w=400" }],
    categorySlug: "furniture",
    featured: false,
    shipping: false,
    shippingCharges: 12,
    stock: 10,
    reviews: 8,
    stars: 4.2,
    description: "Compact wooden bedside table with drawer.",
    warrantyAvailable: true,
    warrantyDuration: "1_year" as const,
    warrantyType: "store" as const,
    deliveryOptions: getDefaultDeliveryOptions(),
  },
  {
    name: "Office Chair",
    company: "ErgoSeat",
    price: 150,
    currency: "USD",
    colors: ["black", "#D3D3D3"],
    image: [{ url: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400" }],
    categorySlug: "office",
    featured: true,
    shipping: true,
    stock: 15,
    reviews: 20,
    stars: 4.7,
    discountPercent: 15,
    description: "Ergonomic office chair with lumbar support.",
    warrantyAvailable: true,
    warrantyDuration: "3_years" as const,
    warrantyType: "limited" as const,
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
    name: "Smart Speaker",
    company: "Apple",
    price: 99,
    currency: "USD",
    colors: ["white", "black"],
    image: [{ url: "https://images.unsplash.com/photo-1543512214-318c7553f230?w=400" }],
    categorySlug: "electronics",
    featured: true,
    shipping: true,
    stock: 30,
    reviews: 45,
    stars: 4.8,
    description: "Voice-controlled smart speaker with premium sound.",
    warrantyAvailable: true,
    warrantyDuration: "1_year" as const,
    warrantyType: "manufacturer" as const,
    deliveryOptions: getDefaultDeliveryOptions().map((option) =>
      option.type === "same_day"
        ? { ...option, enabled: true, charge: 24.99 }
        : option
    ),
  },
  {
    name: "Ceramic Mug Set",
    company: "KitchenPro",
    price: 28,
    currency: "USD",
    colors: ["white", "#F5F5DC"],
    image: [{ url: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400" }],
    categorySlug: "kitchen",
    featured: false,
    shipping: false,
    shippingCharges: 5,
    stock: 50,
    reviews: 6,
    stars: 4.0,
    discountPercent: 20,
    description: "Set of four handcrafted ceramic mugs.",
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
