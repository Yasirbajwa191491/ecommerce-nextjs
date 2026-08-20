export const POLICY_SETTING_KEYS = [
  "terms_conditions",
  "privacy_policy",
  "shipping_policy",
  "return_policy",
] as const;

export type PolicySettingKey = (typeof POLICY_SETTING_KEYS)[number];

export const DEFAULT_TERMS_TEXT =
  "By placing an order on our store, you agree to purchase items subject to availability, accurate delivery details, and our standard return policy. Cash on delivery orders must be paid in full upon receipt. Card payments are processed securely through Stripe.\n\nWe reserve the right to cancel orders in cases of pricing errors, suspected fraud, or inventory issues. For questions about these terms, please contact our support team.";

export const DEFAULT_PRIVACY_TEXT =
  "We collect the information you provide at checkout — including your name, email, phone number, and shipping address — to process and deliver your order. Payment details for card transactions are handled securely by Stripe and are not stored on our servers.\n\nYour information may be saved to speed up future purchases. We do not sell your personal data. You may contact us to request updates or deletion of your saved details.";

export const DEFAULT_SHIPPING_POLICY =
  "Select products include free shipping — look for the free shipping badge on product pages. Products with shipping fees display the cost clearly on the product detail page. Shipping costs are calculated and shown in your cart and checkout summary before you pay. Once your order ships, you receive status updates through our order tracking system.";

export const DEFAULT_RETURN_POLICY =
  "We offer easy returns within 30 days of delivery for unused items in original packaging. Contact our support team with your order number to initiate a return. Refunds are processed to your original payment method after we receive and inspect the returned item.";

const DEFAULTS: Record<PolicySettingKey, string> = {
  terms_conditions: DEFAULT_TERMS_TEXT,
  privacy_policy: DEFAULT_PRIVACY_TEXT,
  shipping_policy: DEFAULT_SHIPPING_POLICY,
  return_policy: DEFAULT_RETURN_POLICY,
};

type TiptapNode = {
  type?: string;
  text?: string;
  content?: TiptapNode[];
};

function extractTiptapText(node: TiptapNode): string[] {
  if (node.type === "text" && node.text) {
    return [node.text];
  }
  if (!node.content?.length) {
    return [];
  }
  return node.content.flatMap(extractTiptapText);
}

function tiptapJsonToPlainText(value: string): string | null {
  try {
    const parsed = JSON.parse(value) as TiptapNode;
    if (parsed.type !== "doc") {
      return null;
    }
    const blocks: string[] = [];
    let current = "";

    for (const node of parsed.content ?? []) {
      if (node.type === "paragraph") {
        const text = extractTiptapText(node).join("").trim();
        if (text) {
          blocks.push(text);
        }
        continue;
      }

      const text = extractTiptapText(node).join("").trim();
      if (text) {
        current = current ? `${current}\n${text}` : text;
      }
    }

    if (current) {
      blocks.push(current);
    }

    return blocks.join("\n\n");
  } catch {
    return null;
  }
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function settingValueToPlainText(value: string | undefined, key: PolicySettingKey): string {
  const fallback = DEFAULTS[key];
  if (!value?.trim()) {
    return fallback;
  }

  const tiptapText = tiptapJsonToPlainText(value);
  if (tiptapText) {
    return tiptapText || fallback;
  }

  if (value.includes("<")) {
    return stripHtml(value) || fallback;
  }

  return value.trim() || fallback;
}

export function settingValueToParagraphs(value: string | undefined, key: PolicySettingKey): string[] {
  const text = settingValueToPlainText(value, key);
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
