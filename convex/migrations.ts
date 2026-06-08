import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { slugify } from "./lib/products";

/** Migrates legacy products (string category / externalId) to productCategories + categoryId. */
export const migrateLegacyProducts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const slugToId = new Map<string, Id<"productCategories">>();

    for (const product of products) {
      const legacy = product as typeof product & {
        category?: string;
        externalId?: string;
      };
      if (legacy.categoryId) continue;

      const legacyName = legacy.category ?? "uncategorized";
      const slug = slugify(legacyName);
      let categoryId = slugToId.get(slug);

      if (!categoryId) {
        const existing = await ctx.db
          .query("productCategories")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .unique();
        if (existing) {
          categoryId = existing._id;
        } else {
          categoryId = await ctx.db.insert("productCategories", {
            name: legacyName,
            description: `${legacyName} category`,
            slug,
            active: true,
            sortOrder: slugToId.size,
          });
        }
        slugToId.set(slug, categoryId);
      }

      await ctx.db.patch(product._id, { categoryId });
    }

    return { migrated: products.length };
  },
});

/** Removes deprecated externalId / category string fields after categoryId is set. */
export const stripLegacyProductFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    for (const product of products) {
      if (!product.categoryId) continue;
      const doc = product as typeof product & {
        externalId?: string;
        category?: string;
      };
      await ctx.db.replace(product._id, {
        name: doc.name,
        company: doc.company,
        price: doc.price,
        colors: doc.colors,
        image: doc.image,
        categoryId: doc.categoryId,
        featured: doc.featured,
        shipping: doc.shipping,
        stock: doc.stock,
        reviews: doc.reviews,
        stars: doc.stars,
        description: doc.description,
      });
    }
    return { stripped: products.length };
  },
});

/** Reset manually entered review stats; real values rebuild from approved reviews. */
export const resetProductReviewStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    for (const product of products) {
      if (product.stars !== 0 || product.reviews !== 0) {
        await ctx.db.patch(product._id, { stars: 0, reviews: 0 });
      }
    }
    return { reset: products.length };
  },
});
