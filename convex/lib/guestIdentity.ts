import type { MutationCtx, QueryCtx } from "../_generated/server";
import { tokenHash } from "./capabilities";
export async function requireGuest(ctx: MutationCtx | QueryCtx, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("Refresh your guest session");
  const hash = await tokenHash(token);
  const row = await ctx.db.query("guestCapabilities").withIndex("by_hash", q => q.eq("tokenHash", hash)).unique();
  if (!row) throw new Error("Invalid guest session");
  return hash;
}
