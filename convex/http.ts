import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./betterAuth/auth";
import { stripeWebhook } from "./stripeWebhooks";
import { vapiWebhook } from "./vapi/webhook";

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

export default http;
