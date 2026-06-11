"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, ThumbsUp } from "lucide-react";
import { ProductStars } from "@/components/products/product-stars";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PublicReview = {
  _id: string;
  customerName: string;
  rating: number;
  title: string;
  content: string;
  imageUrls: string[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: number;
  aiTags?: string[];
  adminReplyPublished?: string;
};

type ReviewCardProps = {
  review: PublicReview;
  onMarkHelpful?: (reviewId: string) => void;
  helpfulLoading?: boolean;
  className?: string;
};

function formatReviewDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(timestamp)
  );
}

export function ReviewCard({
  review,
  onMarkHelpful,
  helpfulLoading,
  className,
}: ReviewCardProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-5 shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{review.customerName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatReviewDate(review.createdAt)}
          </p>
        </div>
        <ProductStars rating={review.rating} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {review.isVerifiedPurchase ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            <BadgeCheck className="size-3.5" />
            Verified Purchase
          </span>
        ) : null}
        {review.aiTags?.map((tag) => (
          <Badge key={tag} variant="outline" className="rounded-full text-xs">
            {tag}
          </Badge>
        ))}
      </div>

      <h3 className="mt-3 font-semibold text-foreground">{review.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {review.content}
      </p>

      {review.imageUrls.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {review.imageUrls.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative size-20 overflow-hidden rounded-xl border"
            >
              <Image
                src={url}
                alt="Review photo"
                fill
                className="object-cover"
                sizes="80px"
              />
            </a>
          ))}
        </div>
      ) : null}

      {review.adminReplyPublished ? (
        <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Store response
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {review.adminReplyPublished}
          </p>
        </div>
      ) : null}

      {onMarkHelpful ? (
        <div className="mt-4 border-t border-border/50 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={helpfulLoading}
            onClick={() => onMarkHelpful(review._id)}
          >
            <ThumbsUp className="size-3.5" />
            Helpful ({review.helpfulCount})
          </Button>
        </div>
      ) : null}
    </article>
  );
}
