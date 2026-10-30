import { pathToFileURL } from "node:url";
import { createHash, timingSafeEqual } from "node:crypto";
import express from "express";
import { analyzeSentiment, embedText, REVIEW_EMBEDDING_VERSION } from "./transformers.js";
import { moderateText } from "./moderation.js";
import {
  extractTopics,
  generateReply,
  generateTags,
  summarizeReviews,
} from "./ollama.js";

export function createApp(handlers = { analyzeSentiment, embedText, moderateText, extractTopics, generateReply, generateTags, summarizeReviews }, { timeoutMs = 30000 } = {}) {
const app = express();
const SECRET = process.env.AI_WORKER_SECRET ?? "";

app.use(express.json({ limit: "256kb" }));
let active = 0;
app.use((req, res, next) => {
  if (req.path === "/health") return next();
  const provided = typeof req.headers["x-ai-worker-key"] === "string" ? req.headers["x-ai-worker-key"] : "";
  if (SECRET.length < 32 || /^(dev-secret|changeme|password)$/i.test(SECRET) || !timingSafeEqual(createHash("sha256").update(provided).digest(), createHash("sha256").update(SECRET).digest())) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

function register(path, handler) {
 app.post(path, async (req, res) => {
  if (active >= 2) return res.status(429).json({ error: "Worker busy" });
  active++;
  res.setTimeout(timeoutMs, () => { if (!res.headersSent) res.status(504).json({ error: "Worker timeout" }); });
  try { await handler(req, res); } finally { active--; }
 });
}
register("/sentiment", async (req, res) => {
  try {
    const text = String(req.body.text ?? "");
    const result = await handlers.analyzeSentiment(text);
    if (!res.headersSent) res.json(result);
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: "Inference unavailable" });
  }
});

register("/embed", async (req, res) => {
  try {
    const text = String(req.body.text ?? "");
    const embedding = await handlers.embedText(text);
    if (!res.headersSent) res.json({ embedding, version: REVIEW_EMBEDDING_VERSION });
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: "Inference unavailable" });
  }
});

register("/moderate", async (req, res) => {
  try {
    const text = String(req.body.text ?? "");
    const result = await handlers.moderateText(text);
    if (!res.headersSent) res.json(result);
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: "Inference unavailable" });
  }
});

register("/tags", async (req, res) => {
  try {
    const text = String(req.body.text ?? "");
    const tags = await handlers.generateTags(text);
    if (!res.headersSent) res.json({ tags });
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: "Inference unavailable" });
  }
});

register("/summarize", async (req, res) => {
  try {
    const reviews = Array.isArray(req.body.reviews)
      ? req.body.reviews.map(String)
      : [];
    const summary = await handlers.summarizeReviews(reviews);
    if (!res.headersSent) res.json({ summary });
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: "Inference unavailable" });
  }
});

register("/topics", async (req, res) => {
  try {
    const reviews = Array.isArray(req.body.reviews)
      ? req.body.reviews.map(String)
      : [];
    const topics = await handlers.extractTopics(reviews);
    if (!res.headersSent) res.json({ topics });
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: "Inference unavailable" });
  }
});

register("/reply", async (req, res) => {
  try {
    const review = req.body.review ?? {};
    const reply = await handlers.generateReply({
      rating: Number(review.rating ?? 5),
      title: String(review.title ?? ""),
      content: String(review.content ?? ""),
      customerName: review.customerName
        ? String(review.customerName)
        : undefined,
    });
    if (!res.headersSent) res.json({ reply });
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: "Inference unavailable" });
  }
});

app.use((error, _req, res, _next) => {
 res.status(error.type === "entity.too.large" ? 413 : 400).json({ error: "Invalid request" });
});
return app;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 const port = Number(process.env.PORT ?? 3100);
 createApp().listen(port, process.env.WORKER_HOST ?? "127.0.0.1", () => console.log(`Review worker listening on port ${port}`));
}
