import { v } from "convex/values";

export const reviewCallStatusValidator = v.union(
  v.literal("pending"),
  v.literal("calling"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("no_answer"),
  v.literal("busy"),
  v.literal("cancelled")
);

export type ReviewCallStatus =
  | "pending"
  | "calling"
  | "completed"
  | "failed"
  | "no_answer"
  | "busy"
  | "cancelled";

export const reviewCollectedEntryValidator = v.object({
  productId: v.id("products"),
  reviewId: v.id("productReviews"),
  rating: v.number(),
  recommendationScore: v.optional(v.number()),
});

export const MAX_REVIEW_CALL_ATTEMPTS = 3;

export const TERMINAL_REVIEW_CALL_STATUSES: ReviewCallStatus[] = [
  "completed",
  "failed",
  "no_answer",
  "busy",
  "cancelled",
];

export const RETRYABLE_REVIEW_CALL_STATUSES: ReviewCallStatus[] = [
  "failed",
  "no_answer",
  "busy",
  "cancelled",
];
