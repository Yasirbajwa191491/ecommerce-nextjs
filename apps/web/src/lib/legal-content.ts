import { tiptapJsonToHtml } from "@/lib/email-marketing/tiptap-html";

export const POLICY_SETTING_KEYS = [
  "terms_conditions",
  "privacy_policy",
  "shipping_policy",
  "return_policy",
] as const;

/** @deprecated Use PolicySettingKey */
export const RICH_TEXT_SETTING_KEYS = POLICY_SETTING_KEYS;

export type PolicySettingKey = (typeof POLICY_SETTING_KEYS)[number];

export type RichTextSettingKey = PolicySettingKey;

export function isPolicySettingKey(
  key: string | undefined
): key is PolicySettingKey {
  return POLICY_SETTING_KEYS.includes(key as PolicySettingKey);
}

export function isRichTextSettingKey(
  key: string | undefined
): key is RichTextSettingKey {
  return isPolicySettingKey(key);
}

function paragraphsToTiptapDoc(paragraphs: string[]): string {
  return JSON.stringify({
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: text ? [{ type: "text", text }] : [],
    })),
  });
}

export const DEFAULT_TERMS_TIPTAP = paragraphsToTiptapDoc([
  "By placing an order on our store, you agree to purchase items subject to availability, accurate delivery details, and our standard return and cancellation policy. Cash on delivery orders must be paid in full upon receipt. Card payments are processed securely through Stripe.",
  "If you cancel a paid order, or we refund it, a cancellation/refund fee is deducted from the order total. The current percentage is shown on this page and in your order emails. Card refunds go back to the original payment method minus that fee. Cash on delivery refunds are handled manually using the same fee.",
  "We reserve the right to cancel orders in cases of pricing errors, suspected fraud, or inventory issues. For questions about these terms, please contact our support team.",
]);

export const DEFAULT_PRIVACY_TIPTAP = paragraphsToTiptapDoc([
  "We collect the information you provide at checkout — including your name, email, phone number, and shipping address — to process and deliver your order. Payment details for card transactions are handled securely by Stripe and are not stored on our servers.",
  "Your information may be saved to speed up future purchases. We do not sell your personal data. You may contact us to request updates or deletion of your saved details.",
]);

export const DEFAULT_SHIPPING_POLICY =
  "Select products include free shipping — look for the free shipping badge on product pages. Products with shipping fees display the cost clearly on the product detail page. Shipping costs are calculated and shown in your cart and checkout summary before you pay. Once your order ships, you receive status updates through our order tracking system.";

export const DEFAULT_RETURN_POLICY =
  "We offer easy returns within 30 days of delivery for unused items in original packaging. Contact our support team with your order number to initiate a return. If a paid order is cancelled or refunded, a cancellation/refund fee is deducted from the order total (the current percentage is published on this page and in order emails). Card refunds are processed to your original payment method after any applicable fee. Cash on delivery refunds are handled manually.";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plainTextToHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}

export function settingValueToHtml(value: string | undefined): string {
  if (!value?.trim()) return "";

  try {
    const parsed = JSON.parse(value) as { type?: string };
    if (parsed.type === "doc") {
      return tiptapJsonToHtml(value);
    }
  } catch {
    // Fall through to plain text.
  }

  return plainTextToHtml(value);
}

export function settingValuePreview(value: string | undefined): string {
  const html = settingValueToHtml(value);
  if (!html) return "No content yet";

  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "Rich text content";
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}
