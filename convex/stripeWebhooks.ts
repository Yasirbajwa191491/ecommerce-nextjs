import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const stripeWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const body = await request.text();

  try {
    const result = await ctx.runAction(internal.stripeWebhookNode.processWebhook, {
      body,
      signature,
    });
    return new Response(result.body, {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[stripe] Webhook action failed:", error);
    return new Response("Webhook handler error", { status: 500 });
  }
});
