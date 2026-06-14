import { v } from "convex/values";

export const productIntelligencePayloadValidator = v.object({
  summary: v.string(),
  keywords: v.array(v.string()),
  useCases: v.array(v.string()),
  highlights: v.array(v.string()),
});

export type ProductIntelligencePayload = {
  summary: string;
  keywords: string[];
  useCases: string[];
  highlights: string[];
};

export type ProductForIntelligence = {
  name: string;
  company: string;
  description: string;
  price: number;
  currency: string;
  stars: number;
  reviews: number;
  categoryName: string;
  reviewHighlights: string[];
};
