import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const productImageValidator = v.object({ url: v.string() });

export default defineSchema({
  productCategories: defineTable({
    name: v.string(),
    description: v.string(),
    slug: v.string(),
    active: v.boolean(),
    sortOrder: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_active_sort", ["active", "sortOrder"]),

  products: defineTable({
    name: v.string(),
    company: v.string(),
    price: v.number(),
    colors: v.array(v.string()),
    image: v.array(productImageValidator),
    categoryId: v.id("productCategories"),
    featured: v.boolean(),
    shipping: v.boolean(),
    stock: v.number(),
    reviews: v.number(),
    stars: v.number(),
    description: v.string(),
  })
    .index("by_category_id", ["categoryId"])
    .index("by_featured", ["featured"]),
});
