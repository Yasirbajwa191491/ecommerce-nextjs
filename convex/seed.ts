import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, mutation } from "./_generated/server";
import { authComponent, createAuth } from "./betterAuth/auth";
import { slugify } from "./lib/products";
import { productImageValidator } from "./schema";

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
    colors: ["grey", "black"],
    image: [{ url: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400" }],
    categorySlug: "electronics",
    featured: true,
    shipping: true,
    stock: 25,
    reviews: 12,
    stars: 4.5,
    description: "Adjustable LED study lamp with warm and cool modes.",
  },
  {
    name: "Bedside Table",
    company: "WoodCraft",
    price: 90,
    currency: "USD",
    colors: ["brown"],
    image: [{ url: "https://images.unsplash.com/photo-1594620302200-9a762244a506?w=400" }],
    categorySlug: "furniture",
    featured: false,
    shipping: true,
    stock: 10,
    reviews: 8,
    stars: 4.2,
    description: "Compact wooden bedside table with drawer.",
  },
  {
    name: "Office Chair",
    company: "ErgoSeat",
    price: 150,
    currency: "USD",
    colors: ["black", "grey"],
    image: [{ url: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400" }],
    categorySlug: "office",
    featured: true,
    shipping: true,
    stock: 15,
    reviews: 20,
    stars: 4.7,
    description: "Ergonomic office chair with lumbar support.",
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

export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(internal.migrations.migrateLegacyProducts, {});
    await ctx.runMutation(internal.migrations.stripLegacyProductFields, {});
    await ctx.runMutation(internal.seed.seedCategoriesAndProducts, {});
    await ctx.runMutation(internal.settings.seedDefaults, {});
    await ctx.scheduler.runAfter(0, internal.seed.seedSuperAdmin, {});
    return { ok: true };
  },
});
