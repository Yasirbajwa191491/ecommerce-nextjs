import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./betterAuth/auth";
import { stripeWebhook } from "./stripeWebhooks";
import { vapiWebhook } from "./vapi/webhook";
import {
  n8nDueJobs,
  n8nProcessDue,
  n8nProcessJob,
  n8nQueueHealth,
  n8nWeeklyStats,
} from "./n8nReviewAiHttp";

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

export default http;
