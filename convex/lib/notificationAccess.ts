import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { emailsMatch } from "./orderAccess";
import { normalizeEmail } from "./publicOrderDto";

export async function assertNotificationCustomerAccess(
  ctx: QueryCtx | MutationCtx,
  args: {
    customerEmail: string;
    visitorId?: string;
    accessToken?: string;
  }
): Promise<void> {
  const customerEmail = normalizeEmail(args.customerEmail);
  const accessToken = args.accessToken?.trim();
  const visitorId = args.visitorId?.trim();

  if (accessToken) {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_access_token", (q) => q.eq("accessToken", accessToken))
      .unique();

    if (order && emailsMatch(order.customerEmail, customerEmail)) {
      return;
    }
  }

  if (visitorId) {
    const activeTokens = await ctx.db
      .query("pushTokens")
      .withIndex("by_customer_email_active", (q) =>
        q.eq("customerEmail", customerEmail).eq("isActive", true)
      )
      .collect();

    if (activeTokens.some((token) => token.visitorId === visitorId)) {
      return;
    }
  }

  throw new ConvexError("Notification access could not be verified.");
}

export async function hasNotificationCustomerAccess(
  ctx: QueryCtx | MutationCtx,
  args: {
    customerEmail: string;
    visitorId?: string;
    accessToken?: string;
  }
): Promise<boolean> {
  try {
    await assertNotificationCustomerAccess(ctx, args);
    return true;
  } catch {
    return false;
  }
}
