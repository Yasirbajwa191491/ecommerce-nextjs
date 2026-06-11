import express from "express";
import { analyzeSentiment, embedText } from "./transformers.js";
import { moderateText } from "./moderation.js";
import {
  extractTopics,
  generateReply,
  generateTags,
  summarizeReviews,
} from "./ollama.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3100);
const SECRET = process.env.AI_WORKER_SECRET ?? "";

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  if (req.path === "/health") return next();
  if (SECRET && req.headers["x-ai-worker-key"] !== SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/sentiment", async (req, res) => {
  try {
    const text = String(req.body.text ?? "");
    const result = await analyzeSentiment(text);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/embed", async (req, res) => {
  try {
    const text = String(req.body.text ?? "");
    const embedding = await embedText(text);
    res.json({ embedding });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/moderate", async (req, res) => {
  try {
    const text = String(req.body.text ?? "");
    const result = await moderateText(text);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/tags", async (req, res) => {
  try {
    const text = String(req.body.text ?? "");
    const tags = await generateTags(text);
    res.json({ tags });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/summarize", async (req, res) => {
  try {
    const reviews = Array.isArray(req.body.reviews)
      ? req.body.reviews.map(String)
      : [];
    const summary = await summarizeReviews(reviews);
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/topics", async (req, res) => {
  try {
    const reviews = Array.isArray(req.body.reviews)
      ? req.body.reviews.map(String)
      : [];
    const topics = await extractTopics(reviews);
    res.json({ topics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/reply", async (req, res) => {
  try {
    const review = req.body.review ?? {};
    const reply = await generateReply({
      rating: Number(review.rating ?? 5),
      title: String(review.title ?? ""),
      content: String(review.content ?? ""),
      customerName: review.customerName
        ? String(review.customerName)
        : undefined,
    });
    res.json({ reply });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Review AI worker listening on :${PORT}`);
});
