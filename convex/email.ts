"use node";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { OtpEmail } from "../src/emails/otp-email";
import { CampaignEmail } from "../src/emails/campaign-email";
import { OTP_EXPIRES_MINUTES } from "../src/lib/otp-config";
import type { Doc } from "./_generated/dataModel";
import { getSiteUrl } from "./lib/siteUrl";
import { applyEmailPlaceholders, buildPlaceholderContext } from "./lib/emailPlaceholders";
import { calculateFinalPrice } from "./lib/pricing";
import { BATCH_SIZE } from "./lib/campaignQueue";
import { generateUnsubscribeToken } from "./lib/subscriberTokens";

const STORE_NAME = "Ecommerce Store";

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
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    const from = await ctx.runQuery(internal.settings.getEmailFrom, {});

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

export const sendOrderConfirmation = internalAction({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      const from = await ctx.runQuery(internal.settings.getEmailFrom, {});
      const orderData = await ctx.runQuery(internal.orders.getOrderForEmail, {
        orderId: args.orderId,
      });

      if (!orderData) {
        console.warn(`[orders] Order ${args.orderId} not found for email`);
        return;
      }

      const { order, items } = orderData;

      if (!apiKey) {
        console.warn(
          `[orders] RESEND_API_KEY not set — skipping confirmation for ${order.orderNumber}`
        );
        return;
      }

      const appUrl = getSiteUrl();
      const { OrderConfirmationEmail } = await import(
        "../src/emails/order-confirmation-email"
      );

      const html = await render(
        OrderConfirmationEmail({
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          subtotal: order.subtotal,
          tax: order.tax,
          shipping: order.shipping,
          total: order.total,
          currency: order.currency,
          customerAddress: order.customerAddress,
          items: items.map((item: Doc<"orderItems">) => ({
            productName: item.productName,
            color: item.color,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
            currency: order.currency,
          })),
          supportUrl: `${appUrl}/contact`,
        })
      );

      const resend = new Resend(apiKey);
      const subject = `Order confirmed — ${order.orderNumber}`;

      const { data, error } = await resend.emails.send({
        from,
        to: order.customerEmail,
        subject,
        html,
      });

      if (error) {
        console.error("[orders] Order confirmation email failed:", error);
        console.warn(
          `[orders] Skipping confirmation email for ${order.orderNumber}: ${resendFailureMessage(error.message, order.customerEmail, from)}`
        );
        return;
      }

      console.log(
        `[orders] Confirmation email sent (id: ${data?.id ?? "unknown"}) → ${order.customerEmail}`
      );
    } catch (error) {
      console.error("[orders] Order confirmation email unexpected error:", error);
    }
  },
});

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export const sendReviewInvitation = internalAction({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      const from = await ctx.runQuery(internal.settings.getEmailFrom, {});
      const orderData = await ctx.runQuery(internal.orders.getOrderForEmail, {
        orderId: args.orderId,
      });

      if (!orderData) {
        console.warn(`[reviews] Order ${args.orderId} not found for invitation`);
        return;
      }

      const { order, items } = orderData;

      if (order.status !== "delivered") {
        console.warn(
          `[reviews] Skipping invitation — order ${order.orderNumber} not delivered`
        );
        return;
      }

      if (!apiKey) {
        console.warn(
          `[reviews] RESEND_API_KEY not set — skipping invitation for ${order.orderNumber}`
        );
        return;
      }

      const appUrl = getSiteUrl();
      const reviewUrl = `${appUrl}/track-order/${encodeURIComponent(order.orderNumber)}`;
      const branding = await ctx.runQuery(internal.settings.getPublicBranding, {});
      const { ReviewInvitationEmail } = await import(
        "../src/emails/review-invitation-email"
      );

      const html = await render(
        ReviewInvitationEmail({
          customerName: order.customerName,
          orderNumber: order.orderNumber,
          reviewUrl,
          storeName: STORE_NAME,
          supportEmail: branding.email,
          supportPhone: branding.phone,
          supportAddress: branding.address,
          products: items.map((item) => ({
            name: item.productName,
            imageUrl: item.imageUrl,
            color: item.color,
            quantity: item.quantity,
          })),
        })
      );

      const resend = new Resend(apiKey);
      const subject = `How was your order? We'd love your feedback (${order.orderNumber})`;

      const { data, error } = await resend.emails.send({
        from,
        to: order.customerEmail,
        subject,
        html,
      });

      if (error) {
        console.error("[reviews] Review invitation email failed:", error);
        throw new ConvexError(
          resendFailureMessage(error.message, order.customerEmail, from)
        );
      }

      await ctx.runMutation(internal.orders.markReviewInvitationSent, {
        orderId: args.orderId,
      });

      console.log(
        `[reviews] Invitation sent (id: ${data?.id ?? "unknown"}) → ${order.customerEmail}`
      );
    } catch (error) {
      console.error("[reviews] Review invitation unexpected error:", error);
      throw error;
    }
  },
});

export const processCampaignBatch = internalAction({
  args: { campaignId: v.id("emailCampaigns") },
  handler: async (ctx, args) => {
    const campaign = await ctx.runQuery(internal.emailCampaigns.getCampaignForSend, {
      campaignId: args.campaignId,
    });

    if (!campaign || campaign.status !== "sending") {
      return;
    }

    const pending = await ctx.runQuery(internal.emailCampaigns.getPendingRecipients, {
      campaignId: args.campaignId,
      limit: BATCH_SIZE,
    });

    if (pending.length === 0) {
      await ctx.runMutation(internal.emailCampaigns.finalizeCampaign, {
        campaignId: args.campaignId,
      });
      return;
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = await ctx.runQuery(internal.settings.getEmailFrom, {});
    const branding = await ctx.runQuery(internal.settings.getPublicBranding, {});
    const siteUrl = getSiteUrl();
    const sentAt = Date.now();

    let sentDelta = 0;
    let failedDelta = 0;
    let deliveredDelta = 0;

    for (const { recipient, subscriber } of pending) {
      if (!subscriber) continue;

      let token = subscriber.unsubscribeToken;
      if (!token) {
        token = generateUnsubscribeToken();
        await ctx.runMutation(internal.emailHelpers.ensureSubscriberToken, {
          subscriberId: subscriber._id,
          token,
        });
      }

      const placeholderContext = buildPlaceholderContext({
        subscriberEmail: subscriber.email,
        unsubscribeToken: token,
        siteUrl,
        companyName: STORE_NAME,
        companyEmail: branding.email,
        companyPhone: branding.phone,
        companyAddress: branding.address,
        sentAt,
      });

      const bodyHtml = applyEmailPlaceholders(
        campaign.contentHtml ?? "",
        placeholderContext
      );

      const products = [];
      for (const productId of campaign.productIds ?? []) {
        const product = await ctx.runQuery(internal.emailHelpers.getProductForEmail, {
          productId,
        });
        if (!product) continue;
        const discountPercent = product.discountPercent ?? 0;
        if (discountPercent <= 0) continue;
        const currency = product.currency ?? "USD";
        const discountedPrice = calculateFinalPrice(product.price, discountPercent);
        products.push({
          id: product._id,
          name: product.name,
          imageUrl: product.image[0]?.url ?? "",
          originalPrice: formatMoney(product.price, currency),
          discountedPrice: formatMoney(discountedPrice, currency),
          discountPercent,
          shopUrl: `${siteUrl}/product/${product._id}`,
        });
      }

      if (!apiKey) {
        await ctx.runMutation(internal.emailCampaigns.markRecipientFailed, {
          recipientId: recipient._id,
          error: "RESEND_API_KEY not configured",
          failedAt: sentAt,
        });
        failedDelta += 1;
        continue;
      }

      try {
        const html = await render(
          CampaignEmail({
            subject: campaign.subject,
            companyName: STORE_NAME,
            companyEmail: branding.email,
            companyPhone: branding.phone,
            companyAddress: branding.address,
            unsubscribeLink: placeholderContext.unsubscribeLink,
            bodyHtml,
            products,
          })
        );

        const resend = new Resend(apiKey);
        const { data, error } = await resend.emails.send({
          from,
          to: subscriber.email,
          subject: applyEmailPlaceholders(campaign.subject, placeholderContext),
          html,
        });

        if (error) {
          await ctx.runMutation(internal.emailCampaigns.markRecipientFailed, {
            recipientId: recipient._id,
            error: error.message,
            failedAt: sentAt,
          });
          failedDelta += 1;
        } else {
          await ctx.runMutation(internal.emailCampaigns.markRecipientSent, {
            recipientId: recipient._id,
            resendMessageId: data?.id,
            sentAt,
          });
          sentDelta += 1;
          deliveredDelta += 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown send error";
        await ctx.runMutation(internal.emailCampaigns.markRecipientFailed, {
          recipientId: recipient._id,
          error: message,
          failedAt: sentAt,
        });
        failedDelta += 1;
      }
    }

    if (sentDelta > 0 || failedDelta > 0) {
      await ctx.runMutation(internal.emailCampaigns.updateCampaignStats, {
        campaignId: args.campaignId,
        sentDelta,
        failedDelta,
        deliveredDelta,
      });
    }

    const morePending = await ctx.runQuery(internal.emailCampaigns.getPendingRecipients, {
      campaignId: args.campaignId,
      limit: 1,
    });

    if (morePending.length > 0) {
      await ctx.scheduler.runAfter(1000, internal.email.processCampaignBatch, {
        campaignId: args.campaignId,
      });
    } else {
      await ctx.runMutation(internal.emailCampaigns.finalizeCampaign, {
        campaignId: args.campaignId,
      });
    }
  },
});

