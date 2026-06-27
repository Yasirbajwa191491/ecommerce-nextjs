import type { ReviewForReply } from "./types";

export const REVIEW_REPLY_STORE_NAME = "Ecommerce Store";

const DEFAULT_STORE_EMAIL = "yasir.sohail@savari.io";
const DEFAULT_STORE_ADDRESS = "DHA Phase 6 Lahore, Pakistan, 54000";

export type ReviewReplyStoreContext = {
  storeName: string;
  storeEmail: string;
  storeAddress: string;
};

export function customerFirstName(customerName?: string): string {
  const trimmed = customerName?.trim();
  if (!trimmed) return "Customer";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function resolveReviewReplyStoreContext(
  partial?: Partial<ReviewReplyStoreContext>
): ReviewReplyStoreContext {
  return {
    storeName: partial?.storeName?.trim() || REVIEW_REPLY_STORE_NAME,
    storeEmail: partial?.storeEmail?.trim() || DEFAULT_STORE_EMAIL,
    storeAddress: partial?.storeAddress?.trim() || DEFAULT_STORE_ADDRESS,
  };
}

export function buildReviewReplySystemPrompt(
  store: ReviewReplyStoreContext,
  customerName?: string
): string {
  const firstName = customerFirstName(customerName);
  return `You are a professional ecommerce customer support manager for ${store.storeName}.
Write an empathetic, professional reply (80-120 words) to a product review.

Requirements:
- Greet the customer by their first name ("${firstName}").
- Never use placeholders such as "[Store Name]", "Dear valued customer", or similar generic openings.
- End with a professional sign-off using exactly this store name: ${store.storeName}
- After the sign-off, include contact details on separate lines: ${store.storeEmail} and ${store.storeAddress}
- Do not promise refunds unless the review explicitly requests one.
- Return only the reply text, no JSON or markdown fences.`;
}

export function buildReviewReplyUserPrompt(review: ReviewForReply): string {
  const store = resolveReviewReplyStoreContext({
    storeName: review.storeName,
    storeEmail: review.storeEmail,
    storeAddress: review.storeAddress,
  });
  const firstName = customerFirstName(review.customerName);

  return `Customer name: ${review.customerName ?? "Customer"} (use first name "${firstName}" in greeting)
Rating: ${review.rating}/5
Title: ${review.title}
Review: ${review.content}

Store name: ${store.storeName}
Store email: ${store.storeEmail}
Store address: ${store.storeAddress}`;
}
