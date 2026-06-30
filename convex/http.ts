import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./betterAuth/auth";
import { stripeWebhook } from "./stripeWebhooks";
import { vapiWebhook } from "./vapi/webhook";
import {
  n8nDueJobs,
  n8nGenerateReply,
  n8nGenerateSentiment,
  n8nGenerateSummary,
  n8nGenerateTags,
  n8nGenerationStats,
  n8nProcessDue,
  n8nProcessJob,
  n8nQueueHealth,
  n8nReportFailure,
  n8nReprocessReview,
  n8nSaveGeneration,
  n8nWeeklyStats,
} from "./n8nReviewAiHttp";
import {
  n8nProductContentComplete,
  n8nProductContentReportFailure,
} from "./n8nProductAiHttp";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: stripeWebhook,
});

http.route({
  path: "/vapi/webhook",
  method: "POST",
  handler: vapiWebhook,
});

http.route({
  path: "/n8n/review-ai/process-job",
  method: "POST",
  handler: n8nProcessJob,
});

http.route({
  path: "/n8n/review-ai/process-due",
  method: "POST",
  handler: n8nProcessDue,
});

http.route({
  path: "/n8n/review-ai/due-jobs",
  method: "GET",
  handler: n8nDueJobs,
});

http.route({
  path: "/n8n/review-ai/weekly-stats",
  method: "GET",
  handler: n8nWeeklyStats,
});

http.route({
  path: "/n8n/review-ai/health",
  method: "GET",
  handler: n8nQueueHealth,
});

http.route({
  path: "/n8n/review-ai/save-generation",
  method: "POST",
  handler: n8nSaveGeneration,
});

http.route({
  path: "/n8n/review-ai/report-failure",
  method: "POST",
  handler: n8nReportFailure,
});

http.route({
  path: "/n8n/review-ai/generation-stats",
  method: "GET",
  handler: n8nGenerationStats,
});

http.route({
  path: "/n8n/review-ai/generate-sentiment",
  method: "POST",
  handler: n8nGenerateSentiment,
});

http.route({
  path: "/n8n/review-ai/generate-tags",
  method: "POST",
  handler: n8nGenerateTags,
});

http.route({
  path: "/n8n/review-ai/generate-reply",
  method: "POST",
  handler: n8nGenerateReply,
});

http.route({
  path: "/n8n/review-ai/generate-summary",
  method: "POST",
  handler: n8nGenerateSummary,
});

http.route({
  path: "/n8n/review-ai/reprocess-review",
  method: "POST",
  handler: n8nReprocessReview,
});

http.route({
  path: "/n8n/product-ai/complete",
  method: "POST",
  handler: n8nProductContentComplete,
});

http.route({
  path: "/n8n/product-ai/report-failure",
  method: "POST",
  handler: n8nProductContentReportFailure,
});

export default http;
