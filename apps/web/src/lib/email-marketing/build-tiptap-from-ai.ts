import { tiptapJsonToHtml } from "./tiptap-html";

const DEFAULT_CTA_URL = "/";

export type AiEmailBodyInput = {
  bodyParagraphs: string[];
  ctaText?: string;
  ctaUrl?: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildCtaParagraph(ctaText: string, ctaUrl: string) {
  const label = escapeHtml(ctaText);
  const href = escapeHtml(ctaUrl);
  return {
    type: "paragraph",
    content: [
      {
        type: "text",
        marks: [
          {
            type: "link",
            attrs: {
              href,
              target: "_blank",
              rel: "noopener noreferrer",
              class: null,
            },
          },
        ],
        text: label,
      },
    ],
  };
}

/** Body content only — headline is stored separately and rendered in the email template. */
export function buildTiptapFromAi(input: AiEmailBodyInput): {
  contentJson: string;
  contentHtml: string;
} {
  const ctaText = input.ctaText?.trim() || "Shop Now";
  const ctaUrl = input.ctaUrl?.trim() || DEFAULT_CTA_URL;

  const content: Record<string, unknown>[] = input.bodyParagraphs
    .filter((p) => p.trim())
    .map((paragraph) => ({
      type: "paragraph",
      content: [{ type: "text", text: paragraph.trim() }],
    }));

  content.push(buildCtaParagraph(ctaText, ctaUrl));

  const doc = {
    type: "doc",
    content: content.length > 0 ? content : [{ type: "paragraph" }],
  };

  const contentJson = JSON.stringify(doc);
  const contentHtml = tiptapJsonToHtml(contentJson);

  return { contentJson, contentHtml };
}

export type AiCampaignApplyPayload = {
  campaignName?: string;
  subject: string;
  headline: string;
  previewText: string;
  bodyParagraphs: string[];
  ctaText: string;
  productPromoText: string;
  suggestedProductIds: string[];
  suggestedSegmentKeys: string[];
};

export function buildFormStateFromAiCampaign(
  payload: AiCampaignApplyPayload,
  ctaUrl?: string
) {
  const { contentJson, contentHtml } = buildTiptapFromAi({
    bodyParagraphs: payload.bodyParagraphs,
    ctaText: payload.ctaText,
    ctaUrl,
  });

  return {
    name: payload.campaignName ?? "",
    subject: payload.subject,
    headline: payload.headline,
    previewText: payload.previewText,
    ctaText: payload.ctaText,
    productPromoText: payload.productPromoText,
    contentJson,
    contentHtml,
    suggestedProductIds: payload.suggestedProductIds,
    suggestedSegmentKeys: payload.suggestedSegmentKeys,
  };
}
