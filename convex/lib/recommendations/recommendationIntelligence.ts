import type { QueryCtx } from "../../_generated/server";

export async function getRecommendationPlatformInsights(ctx: QueryCtx) {
  const analytics = await ctx.db.query("recommendationAnalytics").take(100);
  const profiles = await ctx.db
    .query("customerRecommendationProfiles")
    .take(200);

  const categoryInterest = new Map<string, number>();
  for (const profile of profiles) {
    if (!profile.preferredCategoryIds) continue;
    try {
      const affinities = JSON.parse(profile.preferredCategoryIds) as Record<
        string,
        number
      >;
      for (const [categoryId, score] of Object.entries(affinities)) {
        categoryInterest.set(
          categoryId,
          (categoryInterest.get(categoryId) ?? 0) + score
        );
      }
    } catch {
      // ignore malformed affinity JSON
    }
  }

  const topSections = [...analytics]
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 5)
    .map((row) => ({
      sectionType: row.sectionType,
      impressions: row.impressions,
      clicks: row.clicks,
      conversions: row.conversions,
      ctr: row.impressions > 0 ? row.clicks / row.impressions : 0,
    }));

  const highImpressionLowConversion = topSections.filter(
    (row) => row.impressions >= 5 && row.conversions === 0
  );

  return {
    profileCount: profiles.length,
    topCategoryInterests: [...categoryInterest.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([categoryId, score]) => ({ categoryId, score })),
    topRecommendationSections: topSections,
    promoteCandidates: highImpressionLowConversion,
    totalImpressions: analytics.reduce((sum, row) => sum + row.impressions, 0),
    totalClicks: analytics.reduce((sum, row) => sum + row.clicks, 0),
    totalConversions: analytics.reduce((sum, row) => sum + row.conversions, 0),
  };
}
