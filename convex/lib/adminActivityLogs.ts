import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export type AdminActivityLogInput = {
  type: string;
  title: string;
  description: string;
  actorType: "system" | "admin" | "customer" | "webhook";
  actorUserId?: string;
  actorName?: string;
  relatedOrderId?: Id<"orders">;
  relatedProductId?: Id<"products">;
  relatedCampaignId?: Id<"emailCampaigns">;
  relatedTemplateId?: Id<"emailTemplates">;
  createdAt: number;
};

export async function insertAdminActivityLog(
  ctx: MutationCtx,
  input: AdminActivityLogInput
) {
  return await ctx.db.insert("adminActivityLogs", input);
}
