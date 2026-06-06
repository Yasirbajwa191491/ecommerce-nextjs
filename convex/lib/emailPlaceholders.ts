export type EmailPlaceholderContext = {
  subscriberEmail: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  unsubscribeLink: string;
  currentDate: string;
};

const PLACEHOLDER_MAP: Record<string, keyof EmailPlaceholderContext> = {
  "{{subscriber_email}}": "subscriberEmail",
  "{{current_date}}": "currentDate",
  "{{company_name}}": "companyName",
  "{{company_email}}": "companyEmail",
  "{{company_phone}}": "companyPhone",
  "{{company_address}}": "companyAddress",
  "{{unsubscribe_link}}": "unsubscribeLink",
};

export function applyEmailPlaceholders(
  content: string,
  context: EmailPlaceholderContext
): string {
  let result = content;
  for (const [token, key] of Object.entries(PLACEHOLDER_MAP)) {
    result = result.split(token).join(context[key]);
  }
  return result;
}

export function buildPlaceholderContext(input: {
  subscriberEmail: string;
  unsubscribeToken: string;
  siteUrl: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  sentAt?: number;
}): EmailPlaceholderContext {
  const date = input.sentAt ? new Date(input.sentAt) : new Date();
  return {
    subscriberEmail: input.subscriberEmail,
    currentDate: date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    companyName: input.companyName,
    companyEmail: input.companyEmail,
    companyPhone: input.companyPhone,
    companyAddress: input.companyAddress,
    unsubscribeLink: `${input.siteUrl}/unsubscribe/${input.unsubscribeToken}`,
  };
}
