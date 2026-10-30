import { getAuthUserOrNull } from "./requireAdmin";
import { requireGuest } from "./guestIdentity";
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

  const user = await getAuthUserOrNull(ctx);
  if (user?.emailVerified && !user.banned && emailsMatch(user.email, customerEmail)) return;

  if (accessToken) {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_access_token", (q) => q.eq("accessToken", accessToken))
      .unique();

    if (order && (order.emailOwnershipVerifiedAt ?? 0) > 0 && emailsMatch(order.customerEmail, customerEmail)) {
      return;
    }
  }

  if (visitorId) {
    await requireGuest(ctx, visitorId);
    const binding = await ctx.db.query("pushTokens")
      .withIndex("by_visitor_email_active", q => q.eq("visitorId", visitorId).eq("customerEmail", customerEmail).eq("isActive", true).eq("emailVerified", true))
      .first();
    if (binding) return;
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
