"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ReviewAiSummary } from "@/components/reviews/review-ai-summary";
import { ReviewTopicInsights } from "@/components/reviews/review-topic-insights";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { RefreshCw } from "lucide-react";

type AdminProductReviewInsightsProps = {
  productId: Id<"products">;
};

export function AdminProductReviewInsights({
  productId,
}: AdminProductReviewInsightsProps) {
  const insights = useQuery(api.productReviewInsights.getByProductId, {
    productId,
  });
  const regenerate = useMutation(api.productReviewInsights.regenerate);

  const handleRegenerate = async () => {
    try {
      await regenerate({ productId });
      toastSuccess("Regenerating review insights…");
    } catch (error) {
      toastError(error, { title: "Couldn't regenerate insights" });
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-dashed border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">Review Insights</p>
          <p className="text-sm text-muted-foreground">
            AI-generated summary and topics from approved reviews
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void handleRegenerate()}
        >
          <RefreshCw className="size-3.5" />
          Regenerate
        </Button>
      </div>

      <ReviewAiSummary
        summary={insights?.summary}
        status={insights?.aiAnalysisStatus}
      />
      <ReviewTopicInsights
        topics={insights?.topics}
        status={insights?.aiAnalysisStatus}
      />

      {insights === null ? (
        <p className="text-sm text-muted-foreground">
          Not enough approved reviews for AI insights yet (minimum 3).
        </p>
      ) : null}
    </div>
  );
}
