import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { calculateFinalPrice } from "./lib/pricing";
import { categoryInterestKey } from "./lib/emailSegments";

const MAX_PRODUCTS_PER_CATEGORY = 8;

export const getProductsForPromo = internalQuery({
  args: { productIds: v.array(v.id("products")) },
  handler: async (ctx, args) => {
    const results = await Promise.all(
      args.productIds.map(async (id) => {
        const product = await ctx.db.get(id);
        if (!product) return null;
        const category = await ctx.db.get(product.categoryId);
        return {
          name: product.name,
          categoryName: category?.name ?? "General",
          discountPercent: product.discountPercent ?? 0,
        };
      })
    );
    return results.filter((p): p is NonNullable<typeof p> => p !== null);
  },
});

export const getDiscountedProductsForCampaign = internalQuery({
  args: {
    categorySlug: v.optional(v.string()),
    minDiscountPercent: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const products = await ctx.db
      .query("products")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect();

    let categoryId: string | undefined;
    if (args.categorySlug) {
      const category = await ctx.db
        .query("productCategories")
        .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug!))
        .unique();
      categoryId = category?._id;
    }

    const minDiscount = args.minDiscountPercent ?? 1;
    const filtered = products
      .filter((p) => (p.discountPercent ?? 0) >= minDiscount)
      .filter((p) => !categoryId || p.categoryId === categoryId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .slice(0, limit);

    const enriched = await Promise.all(
      filtered.map(async (p) => {
        const category = await ctx.db.get(p.categoryId);
        const discountPercent = p.discountPercent ?? 0;
        return {
          _id: p._id,
          name: p.name,
          categoryName: category?.name ?? "General",
          categorySlug: category?.slug ?? "general",
          discountPercent,
          discountedPrice: calculateFinalPrice(p.price, discountPercent),
          price: p.price,
          currency: p.currency ?? "USD",
        };
      })
    );

    return enriched;
  },
});

export const getGenerationContext = internalQuery({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("productCategories")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect();

    const productsByCategory = await Promise.all(
      categories.map(async (cat) => {
        const products = await ctx.db
          .query("products")
          .withIndex("by_active_sort", (q) => q.eq("active", true))
          .collect();

        const discounted = products
          .filter(
            (p) =>
              p.categoryId === cat._id && (p.discountPercent ?? 0) > 0
          )
          .sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0))
          .slice(0, MAX_PRODUCTS_PER_CATEGORY)
          .map((p) => ({
            id: p._id,
            name: p.name,
            discountPercent: p.discountPercent ?? 0,
            price: p.price,
          }));

        return {
          categoryId: cat._id,
          categoryName: cat.name,
          categorySlug: cat.slug,
          interestKey: categoryInterestKey(cat.slug),
          products: discounted,
        };
      })
    );

    const activeSubscribers = await ctx.db
      .query("subscribers")
      .withIndex("by_active_subscribed", (q) => q.eq("active", true))
      .collect();

    return {
      storeName: "Thapa Store",
      categories: categories.map((c) => ({
        id: c._id,
        name: c.name,
        slug: c.slug,
        interestKey: categoryInterestKey(c.slug),
      })),
      productsByCategory,
      subscriberCount: activeSubscribers.length,
    };
  },
});
