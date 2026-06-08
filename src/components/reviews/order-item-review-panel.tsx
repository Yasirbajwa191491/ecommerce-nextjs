"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ReviewImageUpload } from "@/components/reviews/review-image-upload";
import { ReviewStarsInput } from "@/components/reviews/review-stars-input";
import { ReviewCard, type PublicReview } from "@/components/reviews/review-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFormValidation } from "@/hooks/use-form-validation";
import {
  validateReviewForm,
  type ReviewFormValues,
} from "@/lib/validation/review-forms";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Loader2, Pencil, Trash2 } from "lucide-react";

type OrderItemReviewPanelProps = {
  orderNumber: string;
  customerEmail: string;
  productId: Id<"products">;
  productName: string;
  status: "not_eligible" | "eligible" | "pending" | "approved";
  review?: PublicReview;
  initialImageStorageIds?: Id<"_storage">[];
  defaultExpanded?: boolean;
};

const emptyForm = (): ReviewFormValues => ({
  rating: 0,
  title: "",
  content: "",
});

export function OrderItemReviewPanel({
  orderNumber,
  customerEmail,
  productId,
  productName,
  status,
  review,
  initialImageStorageIds = [],
  defaultExpanded = false,
}: OrderItemReviewPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ReviewFormValues>(() =>
    review
      ? {
          rating: review.rating,
          title: review.title,
          content: review.content,
        }
      : emptyForm()
  );
  const [imageStorageIds, setImageStorageIds] = useState<Id<"_storage">[]>(
    initialImageStorageIds
  );
  const [previewUrls, setPreviewUrls] = useState<string[]>(
    review?.imageUrls ?? []
  );

  const validation = useFormValidation(form, validateReviewForm);
  const createReview = useMutation(api.productReviews.createReview);
  const updateReview = useMutation(api.productReviews.updateReview);
  const deleteReview = useMutation(api.productReviews.deleteReview);

  if (status === "not_eligible") return null;

  if (status === "approved" && review) {
    return (
      <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-emerald-800">
            Your review for {productName}
          </p>
          <Badge className="bg-emerald-600">Published</Badge>
        </div>
        <ReviewCard review={review} />
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!validation.validateAll()) return;
    setSaving(true);
    try {
      if (review && editing) {
        await updateReview({
          reviewId: review._id as Id<"productReviews">,
          orderNumber,
          customerEmail,
          rating: form.rating,
          title: form.title.trim(),
          content: form.content.trim(),
          imageStorageIds,
        });
        toastSuccess("Review updated");
      } else {
        await createReview({
          orderNumber,
          customerEmail,
          productId,
          rating: form.rating,
          title: form.title.trim(),
          content: form.content.trim(),
          imageStorageIds: imageStorageIds.length ? imageStorageIds : undefined,
        });
        toastSuccess("Review submitted for approval");
      }
      setExpanded(false);
      setEditing(false);
    } catch (error) {
      toastError(error, {
        title: "Couldn't save review",
        fallback: "Failed to submit review. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!review) return;
    setSaving(true);
    try {
      await deleteReview({
        reviewId: review._id as Id<"productReviews">,
        orderNumber,
        customerEmail,
      });
      toastSuccess("Review deleted");
      setForm(emptyForm());
      setEditing(false);
      setExpanded(false);
    } catch (error) {
      toastError(error, { title: "Couldn't delete review" });
    } finally {
      setSaving(false);
    }
  };

  if (status === "pending" && review && !editing) {
    return (
      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Review submitted — awaiting approval</p>
            <p className="text-xs text-muted-foreground">{productName}</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setForm({
                  rating: review.rating,
                  title: review.title,
                  content: review.content,
                });
                setImageStorageIds(initialImageStorageIds);
                setPreviewUrls(review.imageUrls);
                setEditing(true);
                setExpanded(true);
              }}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleDelete()}
              disabled={saving}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </div>
        </div>
        <ReviewCard review={review} />
      </div>
    );
  }

  if (!expanded && status === "eligible") {
    return (
      <div className="mt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setExpanded(true)}
        >
          Write a review for {productName}
        </Button>
      </div>
    );
  }

  if (!expanded) return null;

  return (
    <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-4">
      <p className="mb-4 text-sm font-semibold">Review {productName}</p>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium">Your rating *</p>
          <ReviewStarsInput
            value={form.rating}
            onChange={(rating) => setForm((f) => ({ ...f, rating }))}
            disabled={saving}
          />
          {validation.fieldError("rating") ? (
            <p className="mt-1 text-xs text-destructive">
              {validation.fieldError("rating")}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor={`title-${productId}`}>
            Review title *
          </label>
          <Input
            id={`title-${productId}`}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            onBlur={() => validation.touch("title")}
            placeholder="Summarize your experience"
            disabled={saving}
          />
          {validation.fieldError("title") ? (
            <p className="mt-1 text-xs text-destructive">
              {validation.fieldError("title")}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor={`content-${productId}`}>
            Your review *
          </label>
          <Textarea
            id={`content-${productId}`}
            rows={4}
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            onBlur={() => validation.touch("content")}
            placeholder="What did you like or dislike?"
            disabled={saving}
          />
          {validation.fieldError("content") ? (
            <p className="mt-1 text-xs text-destructive">
              {validation.fieldError("content")}
            </p>
          ) : null}
        </div>

        <ReviewImageUpload
          orderNumber={orderNumber}
          customerEmail={customerEmail}
          productId={productId}
          storageIds={imageStorageIds}
          previewUrls={previewUrls}
          onChange={(ids, urls) => {
            setImageStorageIds(ids);
            setPreviewUrls(urls);
          }}
          disabled={saving}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="rounded-full bg-[#6254f3] text-white hover:bg-[#5548e0]"
            disabled={saving}
            onClick={() => void handleSubmit()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Submit review
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => {
              setExpanded(false);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
