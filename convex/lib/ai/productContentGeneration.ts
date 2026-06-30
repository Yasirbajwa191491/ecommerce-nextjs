import { parseJsonArray, parseJsonObject, truncate } from "./providers/shared";
import {
  geminiGenerateWithParts,
  type GeminiContentPart,
} from "./providers/gemini";
import {
  fetchProductImagesAsBase64,
  type ImageBase64Part,
} from "./productContentImages";
import type {
  ProductContentContext,
  ProductContentMode,
  ProductContentResult,
} from "./productContentTypes";

const CONTENT_TEMPERATURE = 0.4;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_SEO_TITLE = 70;
const MAX_SEO_DESCRIPTION = 160;
const MAX_ALT_LENGTH = 125;

function stripHighlightPrefix(text: string): string {
  return text.replace(/^[\s✓✔•\-–—*]+/, "").trim();
}

function truncateWithEllipsis(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function buildContextPrompt(context: ProductContentContext): string {
  const discountLine =
    context.discountPercent && context.discountPercent > 0
      ? `Discount: ${context.discountPercent}% off`
      : "";
  const shippingLine = context.shipping
    ? "Shipping: Free shipping"
    : context.shippingCharges && context.shippingCharges > 0
      ? `Shipping: ${context.shippingCharges} ${context.currency}`
      : "";

  return truncate(
    [
      `Product name: ${context.name}`,
      `Brand: ${context.company}`,
      `Category: ${context.categoryName}`,
      context.sku ? `SKU: ${context.sku}` : "",
      `Price: ${context.price} ${context.currency}`,
      discountLine,
      shippingLine,
      context.colors.length
        ? `Colors: ${context.colors.join(", ")}`
        : "",
      context.description?.trim()
        ? `Existing description: ${context.description.trim()}`
        : "",
      context.imageUrls.length
        ? `Number of product images: ${context.imageUrls.length}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    6000
  );
}

function normalizeDescription(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, MAX_DESCRIPTION_LENGTH);
}

function normalizeSeoTitle(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  return truncateWithEllipsis(value, MAX_SEO_TITLE);
}

function normalizeSeoDescription(
  value: string | undefined
): string | undefined {
  if (!value?.trim()) return undefined;
  return truncateWithEllipsis(value, MAX_SEO_DESCRIPTION);
}

function normalizeKeywords(values: string[] | undefined): string[] | undefined {
  if (!values?.length) return undefined;
  const unique = [
    ...new Set(values.map((k) => k.trim()).filter(Boolean)),
  ].slice(0, 12);
  return unique.length >= 3 ? unique : undefined;
}

function normalizeHighlights(
  values: string[] | undefined
): string[] | undefined {
  if (!values?.length) return undefined;
  const cleaned = values
    .map((h) => stripHighlightPrefix(h))
    .filter(Boolean)
    .slice(0, 8);
  return cleaned.length >= 3 ? cleaned : undefined;
}

function normalizeImageAlts(
  values: string[] | undefined,
  imageCount: number
): string[] | undefined {
  if (!values?.length || imageCount === 0) return undefined;
  const alts = values
    .slice(0, imageCount)
    .map((alt) => truncateWithEllipsis(alt, MAX_ALT_LENGTH))
    .filter(Boolean);
  return alts.length === imageCount ? alts : undefined;
}

async function generateDescription(
  context: ProductContentContext
): Promise<string | undefined> {
  const system =
    "You are an expert ecommerce copywriter. Write professional product descriptions for online stores like Shopify, IKEA, or Nike. " +
    "Reply JSON only: {\"description\":\"...\"}. " +
    "The description must be human, persuasive but not exaggerated, benefit-led, SEO-friendly naturally, and formatted in multiple short paragraphs separated by blank lines. " +
    "Avoid generic AI phrases, keyword stuffing, and hype.";

  const content = await geminiGenerateWithParts(
    system,
    [{ text: buildContextPrompt(context) }],
    CONTENT_TEMPERATURE
  );

  const parsed = parseJsonObject<{ description?: string }>(content);
  return normalizeDescription(parsed?.description);
}

async function generateSeo(
  context: ProductContentContext
): Promise<Pick<ProductContentResult, "seoTitle" | "seoDescription" | "seoKeywords">> {
  const system =
    "You are an ecommerce SEO specialist. Reply JSON only: " +
    '{"seoTitle":"...","seoDescription":"...","seoKeywords":["keyword1","keyword2"]}. ' +
    "seoTitle: natural, product-focused, under 60 characters when possible. " +
    "seoDescription: compelling click-through copy, under 155 characters when possible. " +
    "seoKeywords: 5-12 relevant search terms based on product, category, features, and buyer intent. " +
    "Avoid keyword stuffing.";

  const content = await geminiGenerateWithParts(
    system,
    [{ text: buildContextPrompt(context) }],
    CONTENT_TEMPERATURE
  );

  const parsed = parseJsonObject<{
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
  }>(content);

  return {
    seoTitle: normalizeSeoTitle(parsed?.seoTitle),
    seoDescription: normalizeSeoDescription(parsed?.seoDescription),
    seoKeywords: normalizeKeywords(parsed?.seoKeywords),
  };
}

async function generateHighlights(
  context: ProductContentContext
): Promise<string[] | undefined> {
  const system =
    "You are an ecommerce merchandising expert. Reply JSON only: {\"highlights\":[\"Premium Build Quality\",\"Ergonomic Design\"]}. " +
    "Generate 3-8 concise selling points suitable for a product page bullet list. " +
    "Each highlight should be short (under 8 words), specific, and visually scannable. No bullet symbols in the strings.";

  const content = await geminiGenerateWithParts(
    system,
    [{ text: buildContextPrompt(context) }],
    CONTENT_TEMPERATURE
  );

  const parsed = parseJsonObject<{ highlights?: string[] }>(content);
  return normalizeHighlights(parsed?.highlights);
}

async function generateAltTextFromImages(
  context: ProductContentContext,
  images: ImageBase64Part[]
): Promise<string[] | undefined> {
  if (images.length === 0) return undefined;

  const system =
    "You are an accessibility and SEO expert for ecommerce product images. " +
    `Analyze each product image and write unique, accurate alt text for all ${images.length} images. ` +
    "Reply JSON only: {\"imageAlts\":[\"alt for image 1\",\"alt for image 2\"]}. " +
    "Each alt text must describe what is visible in that specific image, mention the product name naturally when relevant, " +
    "include important attributes (color, material, angle), avoid keyword stuffing, and stay under 125 characters.";

  const parts: GeminiContentPart[] = [
    {
      text: `${buildContextPrompt(context)}\n\nDescribe each image in order (image 1 through image ${images.length}).`,
    },
  ];

  for (const image of images) {
    parts.push({
      inlineData: { mimeType: image.mimeType, data: image.data },
    });
  }

  const content = await geminiGenerateWithParts(
    system,
    parts,
    CONTENT_TEMPERATURE
  );

  const parsed = parseJsonObject<{ imageAlts?: string[] }>(content);
  const fromObject = normalizeImageAlts(parsed?.imageAlts, images.length);
  if (fromObject) return fromObject;

  const fromArray = normalizeImageAlts(
    parseJsonArray<string>(content),
    images.length
  );
  return fromArray;
}

export async function generateProductContent(
  mode: ProductContentMode,
  context: ProductContentContext
): Promise<ProductContentResult> {
  if (!context.name.trim()) {
    throw new Error("Product name is required for content generation");
  }
  if (!context.categoryName.trim()) {
    throw new Error("Category is required for content generation");
  }

  const result: ProductContentResult = {};

  if (mode === "description" || mode === "all") {
    result.description = await generateDescription(context);
  }

  if (mode === "seo" || mode === "all") {
    const seo = await generateSeo(context);
    result.seoTitle = seo.seoTitle;
    result.seoDescription = seo.seoDescription;
    result.seoKeywords = seo.seoKeywords;
  }

  if (mode === "highlights" || mode === "all") {
    result.highlights = await generateHighlights(context);
  }

  if (mode === "altText" || mode === "all") {
    const imageUrls = context.imageUrls.filter((u) => u.trim());
    if (imageUrls.length === 0) {
      if (mode === "altText") {
        throw new Error("Add at least one product image to generate alt text");
      }
    } else {
      const images = await fetchProductImagesAsBase64(imageUrls);
      if (images.length === 0) {
        throw new Error(
          "Could not load product images for analysis. Check image URLs are accessible."
        );
      }
      const alts = await generateAltTextFromImages(context, images);
      if (!alts) {
        throw new Error("Failed to generate image alt text");
      }
      const padded: string[] = [];
      let altIndex = 0;
      for (const url of imageUrls) {
        if (!url.trim()) {
          padded.push("");
          continue;
        }
        const matched = images[altIndex];
        if (matched && matched.url === url.trim()) {
          padded.push(alts[altIndex] ?? "");
          altIndex += 1;
        } else {
          const found = images.findIndex((img) => img.url === url.trim());
          padded.push(found >= 0 ? (alts[found] ?? "") : "");
        }
      }
      result.imageAlts = padded.filter((_, i) => imageUrls[i]?.trim()).length
        ? imageUrls.map((url, i) =>
            url.trim() ? (padded[i] ?? alts[Math.min(i, alts.length - 1)] ?? "") : ""
          )
        : alts;
    }
  }

  if (mode === "description" && !result.description) {
    throw new Error("Failed to generate product description");
  }
  if (mode === "seo" && !result.seoTitle && !result.seoDescription) {
    throw new Error("Failed to generate SEO content");
  }
  if (mode === "highlights" && !result.highlights?.length) {
    throw new Error("Failed to generate product highlights");
  }

  return result;
}

/** Normalize raw AI output (Gemini or n8n) into validated product content fields. */
export function sanitizeProductContentResult(
  mode: ProductContentMode,
  raw: ProductContentResult,
  imageCount = 0
): ProductContentResult {
  const result: ProductContentResult = {};

  if (mode === "description" || mode === "all") {
    result.description = normalizeDescription(raw.description);
  }
  if (mode === "seo" || mode === "all") {
    result.seoTitle = normalizeSeoTitle(raw.seoTitle);
    result.seoDescription = normalizeSeoDescription(raw.seoDescription);
    result.seoKeywords = normalizeKeywords(raw.seoKeywords);
  }
  if (mode === "highlights" || mode === "all") {
    result.highlights = normalizeHighlights(raw.highlights);
  }
  if (mode === "altText" || mode === "all") {
    result.imageAlts = normalizeImageAlts(raw.imageAlts, imageCount);
  }

  return result;
}
