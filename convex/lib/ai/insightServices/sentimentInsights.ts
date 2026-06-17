import type { InsightCard } from "./types";
import { formatNumber } from "./types";

type TagCount = { tag: string; count: number };
type ReviewContext = {
  monthReviewCount?: number;
  averageMonthRating?: number;
  topTags?: TagCount[];
};

export function computeSentimentCards(
  reviews: ReviewContext | undefined
): InsightCard[] {
  if (!reviews) return [];
  const topTags = reviews.topTags ?? [];
  const complaints = topTags.filter((tag) =>
    /(late|delay|quality|damaged|poor|broken|size|fit|refund|price)/i.test(
      tag.tag
    )
  );
  const praise = topTags.filter((tag) =>
    /(quality|comfortable|beautiful|fast|value|design|durable|premium)/i.test(
      tag.tag
    )
  );

  return [
    {
      type: "sentiment",
      title: "Customer Sentiment",
      metrics: [
        { label: "Reviews This Month", value: formatNumber(reviews.monthReviewCount ?? 0) },
        { label: "Average Rating", value: (reviews.averageMonthRating ?? 0).toFixed(1), trend: (reviews.averageMonthRating ?? 0) >= 4 ? "up" : "flat" },
        { label: "Complaint Themes", value: formatNumber(complaints.length) },
        { label: "Positive Themes", value: formatNumber(praise.length) },
      ],
      badges: [{ label: (reviews.averageMonthRating ?? 0) >= 4 ? "Positive Sentiment" : "Mixed Sentiment", tone: (reviews.averageMonthRating ?? 0) >= 4 ? "positive" : "warning" }],
      recommendation:
        complaints.length > 0
          ? `Address top complaint: ${complaints[0]?.tag ?? "customer friction"}`
          : "Keep emphasizing top-rated product strengths in campaigns.",
      reason:
        praise.length > 0
          ? `Customers most often praise: ${praise[0]?.tag ?? "overall quality"}.`
          : "Sentiment themes are still forming as more reviews arrive.",
    },
  ];
}
