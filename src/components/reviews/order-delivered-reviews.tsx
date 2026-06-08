"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { OrderItemReviewPanel } from "@/components/reviews/order-item-review-panel";
import type { PublicReview } from "@/components/reviews/review-card";
import type { PublicOrderItem } from "@/types/order";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type OrderDeliveredReviewsProps = {
  orderNumber: string;
  customerEmail: string;
  items: PublicOrderItem[];
  highlightProductId?: string;
};

export function OrderDeliveredReviews({
  orderNumber,
  customerEmail,
  items,
  highlightProductId,
}: OrderDeliveredReviewsProps) {
  const reviewStatus = useQuery(api.productReviews.getOrderReviewStatus, {
    orderNumber,
    customerEmail,
  });
  const customerReviews = useQuery(api.productReviews.getCustomerReviewsForOrder, {
    orderNumber,
    customerEmail,
  });

  const reviewByProduct = useMemo(() => {
    const map = new Map<
      string,
      { review: PublicReview; imageStorageIds: Id<"_storage">[] }
    >();
    for (const entry of customerReviews ?? []) {
      map.set(entry.review.productId, {
        review: entry.review,
        imageStorageIds: entry.imageStorageIds,
      });
    }
    return map;
  }, [customerReviews]);

  if (reviewStatus === undefined || customerReviews === undefined) {
    return <Skeleton className="h-40 w-full rounded-2xl" />;
  }

  const hasReviewable = reviewStatus.some(
    (s: { status: string }) => s.status !== "not_eligible"
  );
  if (!hasReviewable) return null;

  return (
    <Card className="rounded-2xl border-border/60 shadow-lg ring-1 ring-black/[0.03]">
      <CardHeader>
        <CardTitle>Product reviews</CardTitle>
        <CardDescription>
          Share your experience with items from this delivered order. Reviews are
          published after admin approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {items.map((item) => {
          const statusEntry = reviewStatus.find(
            (s: { productId: string; status: string }) =>
              s.productId === item.productId
          );
          if (!statusEntry || statusEntry.status === "not_eligible") {
            return null;
          }

          return (
            <div
              key={item.productId}
              className="rounded-xl border border-border/50 p-4"
            >
              <p className="font-medium">{item.productName}</p>
              <OrderItemReviewPanel
                orderNumber={orderNumber}
                customerEmail={customerEmail}
                productId={item.productId as Id<"products">}
                productName={item.productName}
                status={statusEntry.status}
                review={reviewByProduct.get(item.productId)?.review}
                initialImageStorageIds={
                  reviewByProduct.get(item.productId)?.imageStorageIds
                }
                defaultExpanded={highlightProductId === item.productId}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
