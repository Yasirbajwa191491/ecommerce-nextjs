export const AGENT_STATES = [
  "created",
  "planning",
  "running",
  "waiting_for_approval",
  "resuming",
  "completed",
  "failed",
  "cancelled",
  "expired",
] as const;

export type AgentState = (typeof AGENT_STATES)[number];

export const APPROVAL_STATES = [
  "pending",
  "approved",
  "rejected",
  "expired",
  "cancelled",
] as const;

export type ApprovalState = (typeof APPROVAL_STATES)[number];

export type ToolRisk = "read_only" | "draft_writing" | "high_risk";

export type FactType = "verified" | "estimate" | "unavailable" | "recommendation";

export type AgentStepRecord = {
  stepIndex: number;
  kind: "tool" | "plan" | "approval";
  toolName?: string;
  arguments?: Record<string, unknown>;
  result?: unknown;
  status: "succeeded" | "failed" | "skipped" | "pending";
  summary: string;
  risk?: ToolRisk;
  durationMs?: number;
  errorCategory?: string;
  idempotencyKey?: string;
  factType?: FactType;
};

export type ApprovalRecord = {
  id: string;
  stepIndex: number;
  toolName: string;
  arguments: Record<string, unknown>;
  argumentsHash: string;
  summary: string;
  risk: "draft_writing";
  status: ApprovalState;
  requestedBy: string;
  decidedBy?: string;
  createdAt: number;
  expiresAt: number;
  decidedAt?: number;
  idempotencyKey: string;
  executionStatus: "pending" | "executed" | "skipped";
  draftId?: string;
  draftUrl?: string;
};

export type AgentLimits = {
  maxToolCalls: number;
  maxPlannerCalls: number;
  maxReplans: number;
};

export type DraftLink = {
  label: string;
  href: string;
};

export type AgentReport = {
  runId: string;
  status: AgentState;
  userRequestSummary: string;
  completedSteps: { tool: string; summary: string }[];
  skippedSteps: { tool: string; reason: string }[];
  toolEvidence: { tool: string; summary: string; factType: FactType }[];
  businessInsights: string[];
  recommendations: string[];
  draftLinks: DraftLink[];
  pendingApprovals: { id: string; summary: string; expiresAt: number }[];
  limitations: string[];
  errorCategory?: string;
};

export type AgentRunRecord = {
  id: string;
  adminUserId: string;
  request: string;
  requestSummary: string;
  status: AgentState;
  planSummary: string;
  stepIndex: number;
  toolCallCount: number;
  plannerCalls: number;
  replanCount: number;
  steps: AgentStepRecord[];
  approvals: ApprovalRecord[];
  recommendations: string[];
  report?: AgentReport;
  failureReason?: string;
  errorCategory?: string;
  approvalStatus: "none" | ApprovalState;
  version: number;
  leaseOwner?: string;
  leaseUntil?: number;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  expiresAt: number;
  limits: AgentLimits;
  requireDraftApproval: boolean;
  draftWritesEnabled: boolean;
};

export type PlannerObservation = {
  tool: string;
  summary: string;
  unavailable: boolean;
};

export type PlannerDecision =
  | {
      kind: "call_tool";
      tool: string;
      arguments: Record<string, unknown>;
      summary: string;
    }
  | { kind: "replan"; summary: string }
  | { kind: "finish"; recommendations: string[] }
  | { kind: "provider_failure"; message: string };

export type PlannerInput = {
  request: string;
  planSummary: string;
  observations: PlannerObservation[];
  toolCallCount: number;
  replanCount: number;
  limits: AgentLimits;
};

export type Planner = (input: PlannerInput) => Promise<PlannerDecision>;

export type ToolExecContext = {
  runId: string;
  idempotencyKey: string;
  adminUserId: string;
};

export type ToolHandler = (
  args: Record<string, unknown>,
  context: ToolExecContext
) => Promise<unknown>;
