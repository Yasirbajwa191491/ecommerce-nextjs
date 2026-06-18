import { parseJsonArray, parseJsonObject, truncate } from "./providers/shared";
import { geminiGenerateWithParts } from "./providers/gemini";
import type { Id } from "../../_generated/dataModel";
import {
  BEHAVIORAL_SEGMENT_KEYS,
  categoryInterestKey,
} from "../emailSegments";
import {
  type CampaignPreset,
  type CampaignGenerationContext,
  type DiscountedProductSummary,
  type GenerateCampaignResult,
  PRESET_LABELS,
} from "./emailCampaignTypes";

const CAMPAIGN_TEMPERATURE = 0.4;

const PRESET_DESCRIPTIONS: Record<CampaignPreset, string> = {
  summer_sale:
    "A vibrant summer sale email promoting seasonal discounts across the store.",
  new_arrivals:
    "A fresh new arrivals email highlighting the latest products added to the catalog.",
  clearance_sale:
    "An urgent clearance sale email emphasizing limited stock and deep discounts.",
  holiday_promotion:
    "A festive holiday promotion email with gift-giving and celebration themes.",
  category_promotion:
    "A category-focused promotion email for a specific product category.",
  custom: "A custom campaign based on the admin's specific instructions.",
};

function buildProductsContext(products: DiscountedProductSummary[]): string {
  if (products.length === 0) return "No discounted products available.";
  return products
    .map(
      (p) =>
        `- ID: ${p._id} | ${p.name} (${p.categoryName}) | ${p.discountPercent}% off | ${p.discountedPrice} ${p.currency}`
    )
    .join("\n");
}

function buildSegmentsContext(context: CampaignGenerationContext): string {
  const lines = context.categories.map(
    (c) => `- ${c.interestKey}: subscribers interested in ${c.name}`
  );
  lines.push(
    `- ${BEHAVIORAL_SEGMENT_KEYS.recentBuyers}: recent purchasers`,
    `- ${BEHAVIORAL_SEGMENT_KEYS.highValueCustomers}: high spenders`,
    `- ${BEHAVIORAL_SEGMENT_KEYS.officeFurnitureInterested}: office setup buyers`,
    `- ${BEHAVIORAL_SEGMENT_KEYS.jewelryInterested}: jewelry buyers`
  );
  return lines.join("\n");
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseGenerateResult(
  raw: Record<string, unknown>,
  validProductIds: Set<string>
): GenerateCampaignResult {
  const suggestedProductIds = normalizeStringArray(raw.suggestedProductIds).filter(
    (id) => validProductIds.has(id)
  ) as Id<"products">[];

  return {
    campaignName: String(raw.campaignName ?? "").trim(),
    subject: String(raw.subject ?? "").trim(),
    headline: String(raw.headline ?? "").trim(),
    previewText: String(raw.previewText ?? "").trim(),
    bodyParagraphs: normalizeStringArray(raw.bodyParagraphs),
    ctaText: String(raw.ctaText ?? "Shop Now").trim(),
    productPromoText: String(raw.productPromoText ?? "").trim(),
    suggestedProductIds,
    suggestedSegmentKeys: normalizeStringArray(raw.suggestedSegmentKeys),
  };
}

export async function generateEmailCampaign(params: {
  preset: CampaignPreset;
  customPrompt?: string;
  categorySlug?: string;
  categoryName?: string;
  minDiscountPercent?: number;
  context: CampaignGenerationContext;
  discountedProducts: DiscountedProductSummary[];
  activePromotions?: Array<{
    id: string;
    name: string;
    type: string;
    description: string;
    promotionMessage: string;
    bannerText: string;
    buyProductName: string;
    getProductName: string;
  }>;
}): Promise<GenerateCampaignResult> {
  const {
    preset,
    customPrompt,
    categorySlug,
    categoryName,
    minDiscountPercent,
    context,
    discountedProducts,
    activePromotions = [],
  } = params;

  const presetLabel =
    preset === "category_promotion" && categoryName
      ? `${categoryName} Promotion`
      : preset === "custom"
        ? "Custom Campaign"
        : PRESET_LABELS[preset as keyof typeof PRESET_LABELS] ?? preset;

  const interestKey = categorySlug
    ? categoryInterestKey(categorySlug)
    : undefined;

  const system = `You are an expert ecommerce email marketing copywriter for ${context.storeName}.
Write compelling, professional promotional email content.
Reply JSON only with this exact shape:
{
  "campaignName": "string",
  "subject": "string",
  "headline": "string",
  "previewText": "string",
  "bodyParagraphs": ["paragraph1", "paragraph2"],
  "ctaText": "string",
  "productPromoText": "string",
  "suggestedProductIds": ["product_id_from_list"],
  "suggestedSegmentKeys": ["segment_key_from_list"]
}
Pick 4-6 product IDs from the discounted products list when relevant.
Prioritize active BOGO, free gift, and cross-product promotions when writing headlines and productPromoText.
Use phrases like "Buy One Get One Free", "Free Gift Included", or "Limited Time Promotion" when they match active promotions.
Pick 1-2 segment keys that best match the campaign audience.
Keep subject under 60 characters. Preview text under 100 characters.
Do not include markdown. Body paragraphs are plain text only.`;

  const userPrompt = truncate(
    [
      `Campaign type: ${presetLabel}`,
      `Brief: ${PRESET_DESCRIPTIONS[preset]}`,
      customPrompt ? `Custom instructions: ${customPrompt}` : "",
      categoryName ? `Target category: ${categoryName}` : "",
      interestKey ? `Suggested segment key: ${interestKey}` : "",
      minDiscountPercent
        ? `Minimum discount: ${minDiscountPercent}%`
        : "",
      `Active subscribers: ${context.subscriberCount}`,
      "",
      "Available segments:",
      buildSegmentsContext(context),
      "",
      "Discounted products (use these IDs in suggestedProductIds):",
      buildProductsContext(discountedProducts),
      activePromotions.length > 0
        ? [
            "",
            "Active store promotions (prioritize in copy):",
            activePromotions
              .map(
                (p) =>
                  `- ${p.name} (${p.type}): Buy ${p.buyProductName}${p.getProductName ? ` → Get ${p.getProductName} free` : ""}. ${p.bannerText || p.promotionMessage || p.description}`
              )
              .join("\n"),
          ].join("\n")
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    8000
  );

  const response = await geminiGenerateWithParts(
    system,
    [{ text: userPrompt }],
    CAMPAIGN_TEMPERATURE
  );

  const parsed = parseJsonObject<Record<string, unknown>>(response);
  if (!parsed) {
    throw new Error("AI returned invalid JSON for campaign generation.");
  }
  const validIds = new Set(discountedProducts.map((p) => p._id));
  return parseGenerateResult(parsed, validIds);
}

export async function optimizeEmailSubject(params: {
  subject: string;
  campaignName?: string;
  storeName: string;
}): Promise<{ highOpen: string; short: string; promotional: string }> {
  const system = `You are an email subject line optimization expert for ${params.storeName}.
Reply JSON only: { "highOpen": "string", "short": "string", "promotional": "string" }
highOpen = curiosity-driven for max opens
short = under 40 characters
promotional = discount/urgency focused`;

  const user = [
    `Current subject: ${params.subject}`,
    params.campaignName ? `Campaign: ${params.campaignName}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await geminiGenerateWithParts(system, [{ text: user }], 0.5);
  const parsed = parseJsonObject<Record<string, unknown>>(response);
  if (!parsed) {
    return {
      highOpen: params.subject,
      short: params.subject,
      promotional: params.subject,
    };
  }

  return {
    highOpen: String(parsed.highOpen ?? params.subject).trim(),
    short: String(parsed.short ?? params.subject).trim(),
    promotional: String(parsed.promotional ?? params.subject).trim(),
  };
}

export async function generateCtaOptions(params: {
  campaignName?: string;
  subject?: string;
  storeName: string;
}): Promise<string[]> {
  const system = `You are a CTA copywriter for ${params.storeName} ecommerce emails.
Reply JSON only: { "options": ["CTA1", "CTA2", "CTA3", "CTA4", "CTA5"] }
Each CTA should be 2-4 words, action-oriented.`;

  const user = [
    params.campaignName ? `Campaign: ${params.campaignName}` : "",
    params.subject ? `Subject: ${params.subject}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await geminiGenerateWithParts(system, [{ text: user }], 0.5);
  const parsed = parseJsonObject<{ options?: unknown }>(response);
  const rawOptions = parsed?.options;
  const options = Array.isArray(rawOptions)
    ? rawOptions
        .filter((item): item is string => typeof item === "string")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5)
    : parseJsonArray<string>(response)
        .filter((item): item is string => typeof item === "string")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5);

  if (options.length === 0) {
    return [
      "Shop Now",
      "Claim Your Discount",
      "Explore Collection",
      "View Deals",
      "Upgrade Today",
    ];
  }

  return options;
}

export async function generateProductPromoText(params: {
  products: Array<{ name: string; categoryName: string; discountPercent: number }>;
  storeName: string;
}): Promise<string> {
  const system = `You write short promotional blurbs (1-2 sentences) for ecommerce email product sections.
Reply JSON only: { "productPromoText": "string" }`;

  const productList = params.products
    .map((p) => `${p.name} (${p.categoryName}, ${p.discountPercent}% off)`)
    .join(", ");

  const user = `Store: ${params.storeName}\nProducts: ${productList}`;

  const response = await geminiGenerateWithParts(system, [{ text: user }], 0.4);
  const parsed = parseJsonObject<{ productPromoText?: unknown }>(response);
  return String(parsed?.productPromoText ?? "").trim();
}
