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
import {
  n8nImageEmbeddingDueJobs,
  n8nImageEmbeddingHealth,
  n8nImageEmbeddingProcessDue,
  n8nImageEmbeddingProcessJob,
  n8nImageEmbeddingReportFailure,
  n8nImageEmbeddingSave,
} from "./n8nImageEmbeddingHttp";
import {
  n8nRecommendationDueJobs,
  n8nRecommendationHealth,
  n8nRecommendationProcessDue,
  n8nRecommendationProcessJob,
  n8nRecommendationReportFailure,
  n8nRecommendationSaveCache,
  n8nRecommendationSaveProfile,
  n8nRecommendationExportAudiences,
} from "./n8nRecommendationHttp";

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

http.route({
  path: "/n8n/image-embedding/health",
  method: "GET",
  handler: n8nImageEmbeddingHealth,
});

http.route({
  path: "/n8n/image-embedding/due-jobs",
  method: "GET",
  handler: n8nImageEmbeddingDueJobs,
});

http.route({
  path: "/n8n/image-embedding/process-due",
  method: "POST",
  handler: n8nImageEmbeddingProcessDue,
});

http.route({
  path: "/n8n/image-embedding/process-job",
  method: "POST",
  handler: n8nImageEmbeddingProcessJob,
});

http.route({
  path: "/n8n/image-embedding/save",
  method: "POST",
  handler: n8nImageEmbeddingSave,
});

http.route({
  path: "/n8n/image-embedding/report-failure",
  method: "POST",
  handler: n8nImageEmbeddingReportFailure,
});

http.route({
  path: "/n8n/recommendations/health",
  method: "POST",
  handler: n8nRecommendationHealth,
});

http.route({
  path: "/n8n/recommendations/due-jobs",
  method: "POST",
  handler: n8nRecommendationDueJobs,
});

http.route({
  path: "/n8n/recommendations/process-due",
  method: "POST",
  handler: n8nRecommendationProcessDue,
});

http.route({
  path: "/n8n/recommendations/process-job",
  method: "POST",
  handler: n8nRecommendationProcessJob,
});

http.route({
  path: "/n8n/recommendations/save-profile",
  method: "POST",
  handler: n8nRecommendationSaveProfile,
});

http.route({
  path: "/n8n/recommendations/save-cache",
  method: "POST",
  handler: n8nRecommendationSaveCache,
});

http.route({
  path: "/n8n/recommendations/report-failure",
  method: "POST",
  handler: n8nRecommendationReportFailure,
});

http.route({
  path: "/n8n/recommendations/export-audiences",
  method: "POST",
  handler: n8nRecommendationExportAudiences,
});

export default http;
