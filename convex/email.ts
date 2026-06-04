"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { OtpEmail } from "../src/emails/otp-email";
import { OTP_EXPIRES_MINUTES } from "../src/lib/otp-config";

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
      return;
    }

    const resend = new Resend(apiKey);
    const subject =
      args.type === "email-verification"
        ? "Verify your email — Ecommerce Admin"
        : args.type === "sign-in"
          ? "Your sign-in code — Ecommerce Admin"
          : "Your verification code — Ecommerce Admin";

    const html = await render(
      OtpEmail({
        otp: args.otp,
        type: args.type,
        expiresMinutes: OTP_EXPIRES_MINUTES,
      })
    );

    await resend.emails.send({
      from,
      to: args.email,
      subject,
      html,
    });
  },
});
