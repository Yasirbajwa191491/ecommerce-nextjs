import { truncate } from "./providers/shared";
import type {
  ProductForIntelligence,
  ProductIntelligencePayload,
} from "./productIntelligenceTypes";

export function computeProductContentHash(
  product: {
    name: string;
    company: string;
    description: string;
    categoryId: string;
    price: number;
  },
  reviewHighlights: string[]
): string {
  const payload = JSON.stringify({
    name: product.name,
    company: product.company,
    description: product.description,
    categoryId: product.categoryId,
    price: product.price,
    reviewHighlights,
  });
  let hash = 5381;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash * 33) ^ payload.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildReviewHighlights(
  summary: string | undefined,
  topics: Array<{ name: string }>
): string[] {
  const highlights: string[] = [];
  if (summary?.trim()) {
    highlights.push(summary.trim());
  }
  for (const topic of topics.slice(0, 5)) {
    if (topic.name.trim()) {
      highlights.push(topic.name.trim());
    }
  }
  return highlights;
}

export function buildProductEmbeddingText(
  product: ProductForIntelligence,
  intelligence: ProductIntelligencePayload
): string {
  const sections = [
    `Name: ${product.name}`,
    `Brand: ${product.company}`,
    `Category: ${product.categoryName}`,
    `Description: ${product.description}`,
    `Summary: ${intelligence.summary}`,
    `Keywords: ${intelligence.keywords.join(", ")}`,
    `Use Cases: ${intelligence.useCases.join(", ")}`,
    `Highlights: ${intelligence.highlights.join(", ")}`,
    `Review Highlights: ${product.reviewHighlights.join(", ")}`,
    `Rating: ${product.stars}/5 (${product.reviews} reviews)`,
    `Price: ${product.price} ${product.currency}`,
  ];
  return truncate(sections.join("\n"), 4000);
}
