export const CONTACT_INQUIRY_SUBJECTS = [
  { value: "order_support", label: "Order support" },
  { value: "product_question", label: "Product question" },
  { value: "payment_issue", label: "Payment issue" },
  { value: "shipping", label: "Shipping" },
  { value: "return_refund", label: "Return / refund" },
  { value: "general", label: "General inquiry" },
  { value: "other", label: "Other" },
] as const;

export type ContactInquirySubject =
  (typeof CONTACT_INQUIRY_SUBJECTS)[number]["value"];

export function contactSubjectLabel(value: string | undefined): string {
  if (!value) return "General inquiry";
  return (
    CONTACT_INQUIRY_SUBJECTS.find((item) => item.value === value)?.label ??
    value
  );
}
