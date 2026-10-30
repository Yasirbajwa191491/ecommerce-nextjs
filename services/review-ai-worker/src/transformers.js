import path from "node:path";

export const REVIEW_EMBEDDING_VERSION = "hf4.3.2-q8-minilm-v2";

// Inject only in tests; normal imports initialize no models and download nothing.
export function createInferenceRuntime(load = () => import("@huggingface/transformers")) {
  const pipelines = new Map();
  async function get(task, model) {
    if (!pipelines.has(task)) {
      const pending = (async () => {
        const { pipeline, env } = await load();
        env.allowRemoteModels = false;
        env.allowLocalModels = true;
        env.localModelPath = path.resolve(process.env.AI_MODEL_ROOT ?? "models") + path.sep;
        return pipeline(task, model, { dtype: "q8", device: "cpu", local_files_only: true });
      })();
      pipelines.set(task, pending);
      pending.catch(() => { pipelines.delete(task); });
    }
    return pipelines.get(task);
  }
  return {
    getSentimentPipeline: () => get("sentiment-analysis", "Xenova/distilbert-base-uncased-finetuned-sst-2-english"),
    getEmbeddingPipeline: () => get("feature-extraction", "Xenova/all-MiniLM-L6-v2"),
    getZeroShotPipeline: () => get("zero-shot-classification", "Xenova/mobilebert-uncased-mnli"),
  };
}
const runtime = createInferenceRuntime();
export const getSentimentPipeline = runtime.getSentimentPipeline;
export const getEmbeddingPipeline = runtime.getEmbeddingPipeline;
export const getZeroShotPipeline = runtime.getZeroShotPipeline;

export async function analyzeSentiment(text) {
  const classifier = await getSentimentPipeline();
  const result = await classifier(text.slice(0, 512), { top_k: 1 });
  const top = Array.isArray(result) ? result.flat()[0] : result;
  const label = String(top.label).toLowerCase();
  const score = Number(top.score);
  if (!Number.isFinite(score) || score < 0 || score > 1) throw new Error("Invalid sentiment output");
  const sentiment = label.includes("positive") ? "positive" : label.includes("negative") ? "negative" : "neutral";
  return { sentiment, confidence: Math.round(score * 1000) / 1000 };
}

export function normalizedEmbedding(data) {
  const values = Array.from(data);
  const norm = Math.hypot(...values);
  if (values.length !== 384 || !Number.isFinite(norm) || norm === 0 || values.some(v => !Number.isFinite(v))) throw new Error("Invalid embedding output");
  return values.map(v => v / norm);
}
export async function embedText(text) {
  const extractor = await getEmbeddingPipeline();
  const output = await extractor(text.slice(0, 512), { pooling: "mean", normalize: true });
  return normalizedEmbedding(output.data);
}
