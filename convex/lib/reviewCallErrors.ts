/** Turn Vapi API errors into admin-friendly messages with fix hints. */
export function formatVapiOutboundError(rawMessage: string): string {
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes("free vapi numbers") &&
    lower.includes("international")
  ) {
    return (
      `${rawMessage} ` +
      "Use a paid Vapi number or import your Twilio number in Vapi (Phone Numbers → add BYO number), " +
      "then set the new phoneNumberId as VAPI_PHONE_NUMBER_ID in Convex env. " +
      "For local testing, use a customer phone in the same country as your caller ID."
    );
  }

  if (lower.includes("international")) {
    return (
      `${rawMessage} ` +
      "Your outbound caller ID may not support calls to this country. " +
      "Configure a Twilio or paid Vapi number with international dialing enabled."
    );
  }

  return rawMessage;
}
