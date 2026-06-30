import { v } from "convex/values";

export const productContentContextValidator = v.object({
  name: v.string(),
  company: v.string(),
  categoryName: v.string(),
  description: v.optional(v.string()),
  colors: v.array(v.string()),
  sku: v.optional(v.string()),
  price: v.number(),
  currency: v.string(),
  discountPercent: v.optional(v.number()),
  shipping: v.optional(v.boolean()),
  shippingCharges: v.optional(v.number()),
  imageUrls: v.array(v.string()),
});

export const productContentModeValidator = v.union(
  v.literal("description"),
  v.literal("seo"),
  v.literal("highlights"),
  v.literal("altText"),
  v.literal("all")
);

export const productContentResultValidator = v.object({
  description: v.optional(v.string()),
  seoTitle: v.optional(v.string()),
  seoDescription: v.optional(v.string()),
  seoKeywords: v.optional(v.array(v.string())),
  highlights: v.optional(v.array(v.string())),
  imageAlts: v.optional(v.array(v.string())),
});

export type ProductContentContext = {
  name: string;
  company: string;
  categoryName: string;
  description?: string;
  colors: string[];
  sku?: string;
  price: number;
  currency: string;
  discountPercent?: number;
  shipping?: boolean;
  shippingCharges?: number;
  imageUrls: string[];
};

export type ProductContentMode =
  | "description"
  | "seo"
  | "highlights"
  | "altText"
  | "all";

export type ProductContentResult = {
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  highlights?: string[];
  imageAlts?: string[];
};

export const productContentJobStatusValidator = v.union(
  v.literal("pending"),
  v.literal("completed"),
  v.literal("failed")
);

export type ProductContentJobStatus =
  | "pending"
  | "completed"
  | "failed";
