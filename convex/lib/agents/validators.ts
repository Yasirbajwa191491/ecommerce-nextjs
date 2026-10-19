import { v } from "convex/values";

export const agentStateValidator = v.union(
  v.literal("created"),
  v.literal("planning"),
  v.literal("running"),
  v.literal("waiting_for_approval"),
  v.literal("resuming"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled"),
  v.literal("expired")
);

export const approvalStateValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("expired"),
  v.literal("cancelled")
);

export const agentApprovalStatusValidator = v.union(
  v.literal("none"),
  approvalStateValidator
);
