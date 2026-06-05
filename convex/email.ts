"use node";

import { internalAction } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { OtpEmail } from "../src/emails/otp-email";
import { OTP_EXPIRES_MINUTES } from "../src/lib/otp-config";

function resendFailureMessage(message: string, to: string, from: string) {
  const lower = message.toLowerCase();
  if (
    lower.includes("testing emails") ||
    lower.includes("verify a domain") ||
    (from.includes("resend.dev") && lower.includes("403"))
  ) {
    return (
      `Cannot send to ${to} using ${from}. Resend's test sender only delivers to your Resend account email. ` +
      "Verify a domain at resend.com/domains and set RESEND_FROM_EMAIL in Convex to an address on that domain."
    );
  }
  return message;
}

export const sendOtpEmail = internalAction({
  args: {
    email: v.string(),
    otp: v.string(),
    type: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

    if (!apiKey) {
      console.warn(
        `[auth] RESEND_API_KEY not set — OTP for ${args.email}: ${args.otp} (type: ${args.type})`
      );
      throw new ConvexError(
        "RESEND_API_KEY is not configured in Convex. Set it with: npx convex env set RESEND_API_KEY re_..."
      );
    }

    const resend = new Resend(apiKey);
    const subject =
      args.type === "email-verification"
        ? "Verify your email — Ecommerce Admin"
        : args.type === "sign-in"
          ? "Your sign-in code — Ecommerce Admin"
          : args.type === "forget-password"
            ? "Reset your password — Ecommerce Admin"
            : "Your verification code — Ecommerce Admin";

    const html = await render(
      OtpEmail({
        otp: args.otp,
        type: args.type,
        expiresMinutes: OTP_EXPIRES_MINUTES,
      })
    );

    const { data, error } = await resend.emails.send({
      from,
      to: args.email,
      subject,
      html,
    });

    if (error) {
      console.error("[auth] Resend send failed:", error);
      throw new ConvexError(
        resendFailureMessage(error.message, args.email, from)
      );
    }

    console.log(
      `[auth] OTP email accepted by Resend (id: ${data?.id ?? "unknown"}) → ${args.email}`
    );
  },
});
