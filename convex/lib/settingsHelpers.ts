import type { QueryCtx, MutationCtx } from "../_generated/server";

async function findSettingByKey(
  ctx: QueryCtx | MutationCtx,
  key: string
) {
  return await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
}

export async function getLowStockThresholdValue(
  ctx: QueryCtx | MutationCtx
): Promise<number> {
  const row = await findSettingByKey(ctx, "low_stock_threshold");
  const raw = row?.value ?? "2";
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 2;
}

export async function getEmailFromValue(ctx: QueryCtx) {
  const row = await findSettingByKey(ctx, "email_from");
  if (row?.value.trim()) return row.value.trim();
  return "Ecommerce Store <yasir.sohail@savari.io>";
}

export async function getSmsOrderConfirmationEnabledValue(
  ctx: QueryCtx
): Promise<boolean> {
  const row = await findSettingByKey(ctx, "sms_order_confirmation_enabled");
  return row?.value.trim().toLowerCase() === "true";
}
