import type { InsightCard } from "./types";
import { formatNumber } from "./types";

type SubscriberContext = {
  totalActiveSubscribers?: number;
  segmentCounts?: {
    highValue?: number;
    repeatBuyers?: number;
    discountSeekers?: number;
    inactive?: number;
  };
};

type CampaignHint = "furniture" | "jewelry" | "electronics" | null;

function detectCampaignHint(question?: string): CampaignHint {
  const value = question?.toLowerCase() ?? "";
  if (value.includes("furniture")) return "furniture";
  if (value.includes("jewelry") || value.includes("jewellery")) return "jewelry";
  if (value.includes("electronics")) return "electronics";
  return null;
}

export function computeMarketingCards(
  subscribers: SubscriberContext | undefined,
  question?: string
): InsightCard[] {
  if (!subscribers) return [];
  const cards: InsightCard[] = [];
  const hint = detectCampaignHint(question);
  const segments = subscribers.segmentCounts ?? {};

  cards.push({
    type: "marketing",
    title: "Subscriber Promotion Targets",
    metrics: [
      { label: "Active Subscribers", value: formatNumber(subscribers.totalActiveSubscribers ?? 0) },
      { label: "High Value", value: formatNumber(segments.highValue ?? 0) },
      { label: "Repeat Buyers", value: formatNumber(segments.repeatBuyers ?? 0) },
      { label: "Inactive", value: formatNumber(segments.inactive ?? 0) },
    ],
    badges: [{ label: "Audience Ready", tone: "positive" }],
    recommendation: "Prioritize high-value and repeat buyer segments for this week's campaign.",
  });

  if (hint) {
    const campaignName =
      hint === "furniture"
        ? "Workspace Upgrade Campaign"
        : hint === "jewelry"
          ? "Everyday Luxury Campaign"
          : "Smart Home Essentials Campaign";

    cards.push({
      type: "marketing",
      title: "Campaign Suggestion",
      subtitle: hint[0].toUpperCase() + hint.slice(1),
      metrics: [{ label: "Recommended Campaign", value: campaignName }],
      badges: [{ label: "Category Focus", tone: "info" }],
      recommendation: "Launch a targeted email promotion this week with category-focused offers.",
      reason: "Recommendation is based on current subscriber segments and campaign intent.",
    });
  }

  return cards;
}
