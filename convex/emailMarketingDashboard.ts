import { query } from "./_generated/server";
import { requireAdmin } from "./lib/requireAdmin";

function startOfTodayMs() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export const getKpis = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const subscribers = await ctx.db
      .query("subscribers")
      .withIndex("by_active_subscribed", (q) => q.eq("active", true))
      .collect();

    const campaigns = await ctx.db.query("emailCampaigns").collect();
    const sentCampaigns = campaigns.filter((c) => c.status === "sent");

    const templates = await ctx.db.query("emailTemplates").collect();

    const todayStart = startOfTodayMs();
    const recipients = await ctx.db.query("emailCampaignRecipients").collect();
    const emailsSentToday = recipients.filter(
      (r) => r.sentAt !== undefined && r.sentAt >= todayStart
    ).length;

    const totalSent = recipients.filter((r) => r.status === "sent" || r.status === "delivered").length;
    const totalOpened = recipients.filter((r) => r.openedAt !== undefined).length;
    const totalClicked = recipients.filter((r) => r.clickedAt !== undefined).length;

    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : null;
    const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : null;

    return {
      totalSubscribers: subscribers.length,
      totalCampaignsSent: sentCampaigns.length,
      emailsSentToday,
      totalTemplates: templates.length,
      averageOpenRate: openRate,
      averageClickRate: clickRate,
    };
  },
});
