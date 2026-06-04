import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const productImageValidator = v.object({ url: v.string() });

export default defineSchema({
  products: defineTable({
    externalId: v.string(),
    name: v.string(),
    company: v.string(),
    price: v.number(),
    colors: v.array(v.string()),
    image: v.array(productImageValidator),
    category: v.string(),
    featured: v.boolean(),
    shipping: v.boolean(),
    stock: v.number(),
    reviews: v.number(),
    stars: v.number(),
    description: v.string(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_category", ["category"])
    .index("by_featured", ["featured"]),
});
