"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { RatingBreakdown } from "@/components/reviews/rating-breakdown";
import { ReviewAiSummary } from "@/components/reviews/review-ai-summary";
import { ReviewCard } from "@/components/reviews/review-card";
import { ReviewSemanticSearch } from "@/components/reviews/review-semantic-search";
import { ReviewTopicInsights } from "@/components/reviews/review-topic-insights";
import { ProductStars } from "@/components/products/product-stars";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 5;

type ReviewSort = "recent" | "highest" | "lowest" | "helpful";
type RatingFilter = "all" | 1 | 2 | 3 | 4 | 5;

type ProductReviewSectionProps = {
  productId: Id<"products">;
  className?: string;
};

function getVoterKey() {
  if (typeof window === "undefined") return "anonymous";
  const key = "reviewVoterKey";
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(key, value);
  }
  return value;
}

export function ProductReviewSection({
  productId,
  className,
}: ProductReviewSectionProps) {
  const [sort, setSort] = useState<ReviewSort>("recent");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [semanticIds, setSemanticIds] = useState<string[] | null>(null);
  const [helpfulLoadingId, setHelpfulLoadingId] = useState<string | null>(null);

  const summary = useQuery(api.productReviews.getProductReviewSummary, {
    productId,
  });

  const insights = useQuery(api.productReviewInsights.getByProductId, {
    productId,
  });

  const tags = useQuery(api.productReviewInsights.listProductReviewTags, {
    productId,
  });

  const listArgs = useMemo(
    () => ({
      productId,
      sort,
      ratingFilter: ratingFilter === "all" ? undefined : ratingFilter,
      tagFilter: tagFilter ?? undefined,
    }),
    [productId, sort, ratingFilter, tagFilter]
  );

  const { results, status, loadMore } = usePaginatedQuery(
    api.productReviews.listProductReviews,
    listArgs,
    { initialNumItems: PAGE_SIZE }
  );

  const markHelpful = useMutation(api.productReviews.markReviewHelpful);

  const handleSemanticResults = useCallback((ids: string[] | null) => {
    setSemanticIds(ids);
  }, []);

  const handleMarkHelpful = useCallback(
    async (reviewId: string) => {
      setHelpfulLoadingId(reviewId);
      try {
        await markHelpful({
          reviewId: reviewId as Id<"productReviews">,
          voterKey: getVoterKey(),
        });
        toastSuccess("Thanks for your feedback");
      } catch (error) {
        toastError(error, { title: "Couldn't record vote" });
      } finally {
        setHelpfulLoadingId(null);
      }
    },
    [markHelpful]
  );

  const displayedReviews = useMemo(() => {
    if (!semanticIds) return results;
    const idSet = new Set(semanticIds);
    return results.filter((review) => idSet.has(review._id));
  }, [results, semanticIds]);

  const canLoadMore = status === "CanLoadMore" && !semanticIds;

  if (summary === undefined) {
    return (
      <section className={cn("space-y-4", className)}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </section>
    );
  }

  return (
    <section className={cn("space-y-8", className)}>
      <div>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Customer reviews
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ratings from verified purchases
        </p>
      </div>

      <ReviewAiSummary
        summary={insights?.summary}
        status={insights?.aiAnalysisStatus}
      />

      <ReviewTopicInsights
        topics={insights?.topics}
        status={insights?.aiAnalysisStatus}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,280px)_1fr]">
        <div className="space-y-6 rounded-2xl border border-border/60 bg-card p-5">
          <div className="text-center lg:text-left">
            <div className="flex flex-col items-center gap-2 lg:items-start">
              <ProductStars
                rating={summary.averageRating}
                className="[&_span]:text-base [&_svg]:size-5"
              />
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {summary.averageRating.toFixed(1)} out of 5
                </span>
                {summary.totalReviews > 0 ? (
                  <>
                    {" "}
                    · Based on {summary.totalReviews.toLocaleString()}{" "}
                    {summary.totalReviews === 1 ? "review" : "reviews"}
                  </>
                ) : null}
              </p>
            </div>
          </div>
          {summary.totalReviews > 0 ? (
            <RatingBreakdown distribution={summary.distribution} />
          ) : null}
          <div className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
            Purchased this item?{" "}
            <Link href="/track-order" className="font-medium text-[#6254f3] hover:underline">
              Track your order
            </Link>{" "}
            to leave a verified review after delivery.
          </div>
        </div>

        <div className="space-y-4">
          <ReviewSemanticSearch
            productId={productId}
            onResults={handleSemanticResults}
          />

          {tags && tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag: { tagSlug: string; tagLabel: string; count: number }) => (
                <Button
                  key={tag.tagSlug}
                  type="button"
                  size="sm"
                  variant={tagFilter === tag.tagSlug ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() =>
                    setTagFilter((current) =>
                      current === tag.tagSlug ? null : tag.tagSlug
                    )
                  }
                >
                  {tag.tagLabel} ({tag.count})
                </Button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  [5, "5★"],
                  [4, "4★"],
                  [3, "3★"],
                  [2, "2★"],
                  [1, "1★"],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={String(value)}
                  type="button"
                  size="sm"
                  variant={ratingFilter === value ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setRatingFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Select
              value={sort}
              onValueChange={(v) => setSort(v as ReviewSort)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="highest">Highest rating</SelectItem>
                <SelectItem value="lowest">Lowest rating</SelectItem>
                <SelectItem value="helpful">Most helpful</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {displayedReviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
              <p className="font-medium text-foreground">
                {semanticIds ? "No matching reviews" : "No reviews yet"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {semanticIds
                  ? "Try a different search phrase."
                  : "Be the first to share your experience after your order is delivered."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedReviews.map((review) => (
                <ReviewCard
                  key={review._id}
                  review={review}
                  onMarkHelpful={handleMarkHelpful}
                  helpfulLoading={helpfulLoadingId === review._id}
                />
              ))}
            </div>
          )}

          {canLoadMore ? (
            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={() => loadMore(PAGE_SIZE)}
            >
              Load more reviews
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
