import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { getAuthUserOrNull } from "../requireAdmin";
import { requireGuest } from "../guestIdentity";
export async function verifiedRecommendationIdentity(ctx: MutationCtx | QueryCtx, visitorId: string, claimedEmail?: string) {
  const guestKey = await requireGuest(ctx, visitorId);
  const user = await getAuthUserOrNull(ctx);
  if (claimedEmail && (!user?.emailVerified || user.banned || user.email.toLowerCase() !== claimedEmail.trim().toLowerCase())) {
    // Anonymous checkout email is metadata, never a customer identity.
    return { identityType: "visitor" as const, identityKey: guestKey, customerKey: undefined };
  }
  if (user?.emailVerified && !user.banned) return { identityType: "customer" as const, identityKey: user.email.toLowerCase(), customerKey: user.email.toLowerCase() };
  return { identityType: "visitor" as const, identityKey: guestKey, customerKey: undefined };
}
